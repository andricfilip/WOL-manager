from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, login_required, current_user
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime
from config import config
from models import db, User, Computer, WOLLog, ShutdownLog, AuditLog, ComputerGroup, UptimeLog, AppSettings
from wol import send_wol_packet, validate_mac_address, check_host_status, shutdown_computer_ssh
from encryption import verify_encryption_setup
from security import init_security
import app_config  # Application branding and configuration
import auth
import os
import threading
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object(config[os.environ.get('FLASK_ENV', 'development')])

# Initialize extensions
db.init_app(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize security middleware
init_security(app)

# Initialize rate limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[app.config.get('RATELIMIT_DEFAULT', "200 per hour")],
    storage_uri=app.config.get('RATELIMIT_STORAGE_URL', "memory://")
)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Molim prijavite se da pristupite ovoj stranici'

# Register blueprints
app.register_blueprint(auth.auth_bp)

# Inject app configuration into all templates
@app.context_processor
def inject_app_config():
    """Make app configuration available to all templates"""
    return {
        'app_info': app_config.get_app_info(),
        'app_colors': app_config.get_theme_colors()
    }

# Verify encryption setup on startup
_security_verified = False

@app.before_request
def verify_security():
    """Verify security configuration on first request"""
    global _security_verified
    if not _security_verified:
        if not verify_encryption_setup():
            logger.error("⚠️  ENCRYPTION NOT PROPERLY CONFIGURED! Set ENCRYPTION_KEY in environment.")
        else:
            logger.info("✓ Encryption verified and working correctly")
        _security_verified = True

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ==================== ROUTES ====================

@app.route('/')
def index():
    """Home page"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('auth.login'))

@app.route('/dashboard', methods=['GET', 'POST'])
@login_required
def dashboard():
    """User dashboard - shows only assigned computers"""
    # Get computers assigned to current user
    computers = current_user.computers
    
    # Get app settings
    enable_groups = AppSettings.get_bool('enable_groups', default=True)
    enable_search = AppSettings.get_bool('enable_search', default=True)
    
    # Check if user can view groups (admin always can, users only if enabled)
    show_groups = enable_groups and (current_user.is_admin or current_user.can_view_groups)
    
    if request.method == 'POST':
        # Check if it's AJAX request for WOL
        if request.is_json:
            data = request.get_json()
            computer_id = data.get('computer_id')
            
            computer = Computer.query.get(computer_id)
            
            # Check if user has access to this computer
            if not computer or current_user not in computer.assigned_users:
                return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
            
            # Send WOL packet
            success, message = send_wol_packet(computer.mac_address)
            
            # Log the action
            log = WOLLog(
                user_id=current_user.id,
                computer_id=computer_id,
                status='sent' if success else 'failed'
            )
            db.session.add(log)
            computer.last_wol = datetime.utcnow()
            db.session.commit()
            
            return jsonify({
                'success': success, 
                'message': message,
                'last_wol': computer.last_wol.strftime('%Y-%m-%d %H:%M') if computer.last_wol else None
            })
    
    groups = ComputerGroup.query.order_by(ComputerGroup.name).all() if show_groups else []
    return render_template('dashboard.html', 
                         computers=computers, 
                         groups=groups,
                         enable_groups=show_groups,
                         enable_search=enable_search)

@app.route('/api/shutdown', methods=['POST'])
@login_required
@limiter.limit("10 per minute")  # Rate limit: max 10 shutdown attempts per minute
def shutdown_computer():
    """Shutdown a computer via SSH - Only admin has SSH credentials"""
    if request.is_json:
        data = request.get_json()
        computer_id = data.get('computer_id')
        
        computer = Computer.query.get(computer_id)
        
        # Check if user has access to this computer
        # Regular users can trigger shutdown, but only if admin configured SSH
        if not computer or current_user not in computer.assigned_users:
            # Audit log: Unauthorized shutdown attempt
            AuditLog.log_action(
                action='shutdown_denied',
                user=current_user,
                resource_type='computer',
                resource_id=computer_id,
                status='denied',
                details=f'User attempted to shutdown computer without access',
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent')
            )
            return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
        
        # Check if SSH is configured
        if not computer.ssh_host or not computer.ssh_username or not computer.ssh_password:
            return jsonify({
                'success': False, 
                'message': 'SSH nije konfigurisan za ovaj računar. Kontaktirajte administratora.'
            }), 400
        
        # Send shutdown command via SSH
        success, message = shutdown_computer_ssh(
            host=computer.ssh_host or computer.ip_address,
            username=computer.ssh_username,
            password=computer.ssh_password,
            port=computer.ssh_port or 22,
            os_type=computer.os_type or 'linux'  # Use computer's OS type
        )
        
        # Audit log: Shutdown action
        AuditLog.log_action(
            action='shutdown',
            user=current_user,
            resource_type='computer',
            resource_id=computer_id,
            status='success' if success else 'failed',
            details=f'Computer: {computer.name}, Result: {message}',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        # Log the action
        log = ShutdownLog(
            user_id=current_user.id,
            computer_id=computer_id,
            status='success' if success else 'failed',
            error_message=None if success else message
        )
        db.session.add(log)
        
        if success:
            computer.last_shutdown = datetime.utcnow()
            computer.status = 'offline'  # Assume offline after shutdown
        
        db.session.commit()
        
        # Emit status update via WebSocket
        if success:
            socketio.emit('status_update', {
                'computer_id': computer.id,
                'status': 'offline',
                'last_checked': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
            }, namespace='/', broadcast=True)
        
        return jsonify({
            'success': success, 
            'message': message,
            'last_shutdown': computer.last_shutdown.strftime('%Y-%m-%d %H:%M') if computer.last_shutdown else None
        })
    
    return jsonify({'success': False, 'message': 'Invalid request'}), 400

@app.route('/admin/computers')
@login_required
def admin_computers():
    """Admin: Manage computers"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    computers = Computer.query.all()
    return render_template('admin_computers.html', computers=computers)

@app.route('/admin/computers/add', methods=['GET', 'POST'])
@login_required
def admin_add_computer():
    """Admin: Add new computer"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        mac_address = request.form.get('mac_address', '').strip().upper()
        ip_address = request.form.get('ip_address', '').strip()
        description = request.form.get('description', '').strip()
        assigned_user_ids = request.form.getlist('assigned_users')
        
        # Validation
        if not name or not mac_address:
            flash('Naziv i MAC adresa su obavezni', 'error')
            return redirect(url_for('admin_add_computer'))
        
        if not validate_mac_address(mac_address):
            flash('Nevažeći format MAC adrese', 'error')
            return redirect(url_for('admin_add_computer'))
        
        if Computer.query.filter_by(mac_address=mac_address).first():
            flash('MAC adresa je već registrovana', 'error')
            return redirect(url_for('admin_add_computer'))
        
        # Create new computer
        computer = Computer(
            name=name,
            mac_address=mac_address,
            ip_address=ip_address if ip_address else None,
            description=description if description else None,
            os_type=request.form.get('os_type', 'linux'),
            ssh_host=request.form.get('ssh_host', '').strip() or None,
            ssh_port=int(request.form.get('ssh_port', 22)),
            ssh_username=request.form.get('ssh_username', '').strip() or None,
            ssh_password=request.form.get('ssh_password', '').strip() or None
        )
        
        # Assign users
        for user_id in assigned_user_ids:
            user = User.query.get(int(user_id))
            if user:
                computer.assigned_users.append(user)
        
        db.session.add(computer)
        db.session.commit()
        
        # Audit log: Computer created
        AuditLog.log_action(
            action='computer_create',
            user=current_user,
            resource_type='computer',
            resource_id=computer.id,
            status='success',
            details=f'Created computer "{name}" (MAC: {mac_address})',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        flash(f'Računar "{name}" je uspešno dodat', 'success')
        return redirect(url_for('admin_computers'))
    
    users = User.query.all()
    return render_template('admin_add_computer.html', users=users)

@app.route('/admin/computers/<int:computer_id>/edit', methods=['GET', 'POST'])
@login_required
def admin_edit_computer(computer_id):
    """Admin: Edit computer"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    computer = Computer.query.get_or_404(computer_id)
    
    if request.method == 'POST':
        computer.name = request.form.get('name', '').strip()
        mac_address = request.form.get('mac_address', '').strip().upper()
        computer.ip_address = request.form.get('ip_address', '').strip() or None
        computer.description = request.form.get('description', '').strip() or None
        computer.os_type = request.form.get('os_type', 'linux')
        assigned_user_ids = request.form.getlist('assigned_users')
        
        # SSH configuration
        computer.ssh_host = request.form.get('ssh_host', '').strip() or None
        computer.ssh_port = int(request.form.get('ssh_port', 22))
        computer.ssh_username = request.form.get('ssh_username', '').strip() or None
        
        # Only update password if new one is provided (security: never expose existing password)
        new_password = request.form.get('ssh_password', '').strip()
        if new_password:  # Only update if not empty
            computer.ssh_password = new_password
        
        # Validation
        if not computer.name or not mac_address:
            flash('Naziv i MAC adresa su obavezni', 'error')
            return redirect(url_for('admin_edit_computer', computer_id=computer_id))
        
        if not validate_mac_address(mac_address):
            flash('Nevažeći format MAC adrese', 'error')
            return redirect(url_for('admin_edit_computer', computer_id=computer_id))
        
        # Check if MAC address is taken by another computer
        existing = Computer.query.filter_by(mac_address=mac_address).first()
        if existing and existing.id != computer.id:
            flash('MAC adresa je već registrovana', 'error')
            return redirect(url_for('admin_edit_computer', computer_id=computer_id))
        
        computer.mac_address = mac_address
        
        # Update assigned users
        computer.assigned_users = []
        for user_id in assigned_user_ids:
            user = User.query.get(int(user_id))
            if user:
                computer.assigned_users.append(user)
        
        db.session.commit()
        
        # Audit log: Computer updated
        AuditLog.log_action(
            action='computer_update',
            user=current_user,
            resource_type='computer',
            resource_id=computer.id,
            status='success',
            details=f'Updated computer "{computer.name}" (MAC: {mac_address})',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        flash(f'Računar "{computer.name}" je ažuriran', 'success')
        return redirect(url_for('admin_computers'))
    
    # Security: Check if password exists without exposing it
    has_ssh_password = computer._ssh_password_encrypted is not None and computer._ssh_password_encrypted != ''
    
    users = User.query.all()
    return render_template('admin_edit_computer.html', computer=computer, users=users, has_ssh_password=has_ssh_password)

@app.route('/admin/computers/<int:computer_id>/delete', methods=['POST'])
@login_required
def admin_delete_computer(computer_id):
    """Admin: Delete computer"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    computer = Computer.query.get_or_404(computer_id)
    
    name = computer.name
    db.session.delete(computer)
    db.session.commit()
    
    # Audit log: Computer deleted
    AuditLog.log_action(
        action='computer_delete',
        user=current_user,
        resource_type='computer',
        resource_id=computer_id,
        status='success',
        details=f'Deleted computer "{name}"',
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    return jsonify({'success': True, 'message': f'Računar "{name}" je obrisan'})

@app.route('/admin/users')
@login_required
def admin_users():
    """Admin: Manage users"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    users = User.query.all()
    return render_template('admin_users.html', users=users)

@app.route('/admin/users/add', methods=['GET', 'POST'])
@login_required
def admin_add_user():
    """Admin: Add new user"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        is_admin = request.form.get('is_admin') is not None
        
        # Validation
        if not username or not email or not password:
            flash('Sva polja su obavezna', 'error')
            return redirect(url_for('admin_add_user'))
        
        if len(username) < 3:
            flash('Korisničko ime mora imati najmanje 3 karaktera', 'error')
            return redirect(url_for('admin_add_user'))
        
        if len(password) < 6:
            flash('Lozinka mora imati najmanje 6 karaktera', 'error')
            return redirect(url_for('admin_add_user'))
        
        if User.query.filter_by(username=username).first():
            flash('Korisničko ime već postoji', 'error')
            return redirect(url_for('admin_add_user'))
        
        if User.query.filter_by(email=email).first():
            flash('Email već postoji', 'error')
            return redirect(url_for('admin_add_user'))
        
        # Create new user
        user = User(username=username, email=email, is_admin=is_admin)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Audit log: User created
        AuditLog.log_action(
            action='user_create',
            user=current_user,
            resource_type='user',
            resource_id=user.id,
            status='success',
            details=f'Created user "{username}" (admin: {is_admin})',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        flash(f'Korisnik "{username}" je uspešno kreiran', 'success')
        return redirect(url_for('admin_users'))
    
    return render_template('admin_add_user.html')

@app.route('/admin/users/<int:user_id>/toggle-admin', methods=['POST'])
@login_required
def toggle_admin(user_id):
    """Admin: Toggle user admin status"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    user = User.query.get_or_404(user_id)
    
    # Prevent removing own admin status
    if user.id == current_user.id:
        return jsonify({'success': False, 'message': 'Ne možete oduzeti svoju admin dozvolu'}), 400
    
    user.is_admin = not user.is_admin
    db.session.commit()
    
    # Audit log: Admin permission changed
    AuditLog.log_action(
        action='user_admin_toggle',
        user=current_user,
        resource_type='user',
        resource_id=user.id,
        status='success',
        details=f'Changed {user.username} admin status to {user.is_admin}',
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    return jsonify({
        'success': True,
        'message': f'Korisnik {user.username} je sada {"admin" if user.is_admin else "obični korisnik"}',
        'is_admin': user.is_admin
    })
# Audit log: Group permission changed
    AuditLog.log_action(
        action='user_groups_toggle',
        user=current_user,
        resource_type='user',
        resource_id=user.id,
        status='success',
        details=f'Changed {user.username} group viewing to {user.can_view_groups}',
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    
@app.route('/admin/users/<int:user_id>/toggle-groups', methods=['POST'])
@login_required
def toggle_user_groups(user_id):
    """Admin: Toggle user group viewing permission"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    user = User.query.get_or_404(user_id)
    user.can_view_groups = not user.can_view_groups
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Korisnik {user.username} {"može" if user.can_view_groups else "ne može"} videti grupe',
        'can_view_groups': user.can_view_groups
    })

@app.route('/admin/users/<int:user_id>/delete', methods=['POST'])
@login_required
def delete_user(user_id):
    """Admin: Delete user"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    user = User.query.get_or_404(user_id)
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        return jsonify({'success': False, 'message': 'Ne možete obrisati svoje konto'}), 400
    
    username = user.username
    db.session.delete(user)
    db.session.commit()
    
    # Audit log: User deleted
    AuditLog.log_action(
        action='user_delete',
        user=current_user,
        resource_type='user',
        resource_id=user_id,
        status='success',
        details=f'Deleted user "{username}"',
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    return jsonify({'success': True, 'message': f'Korisnik {username} je obrisan'})

@app.route('/history')
@login_required
def history():
    """View WOL/Shutdown history AND audit logs with search and filtering"""
    # Get search parameters
    search_query = request.args.get('search', '').strip()
    date_from = request.args.get('date_from', '').strip()
    date_to = request.args.get('date_to', '').strip()
    log_type = request.args.get('type', 'wol').strip()  # 'wol', 'shutdown', or 'audit'
    
    if log_type == 'audit':
        # Audit logs
        if current_user.is_admin:
            # Admin sees all audit logs
            logs_query = AuditLog.query
        else:
            # Regular users see only their own audit logs
            logs_query = AuditLog.query.filter_by(user_id=current_user.id)
        
        # Apply search filter for audit logs
        if search_query:
            logs_query = logs_query.filter(
                db.or_(
                    AuditLog.action.ilike(f'%{search_query}%'),
                    AuditLog.username.ilike(f'%{search_query}%'),
                    AuditLog.details.ilike(f'%{search_query}%')
                )
            )
        
        # Apply date filters
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                logs_query = logs_query.filter(AuditLog.timestamp >= from_date)
            except ValueError:
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                to_date = to_date.replace(hour=23, minute=59, second=59)
                logs_query = logs_query.filter(AuditLog.timestamp <= to_date)
            except ValueError:
                pass
        
        logs = logs_query.order_by(AuditLog.timestamp.desc()).all()
        return render_template('history.html', logs=logs, log_type='audit',
                             search_query=search_query, date_from=date_from, date_to=date_to)
    
    elif log_type == 'shutdown':
        # Shutdown logs
        if current_user.is_admin:
            logs_query = ShutdownLog.query
        else:
            logs_query = ShutdownLog.query.filter_by(user_id=current_user.id)
        
        # Apply search filter
        if search_query:
            logs_query = logs_query.join(Computer).join(User).filter(
                db.or_(
                    Computer.name.ilike(f'%{search_query}%'),
                    User.username.ilike(f'%{search_query}%')
                )
            )
        
        # Apply date filters
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                logs_query = logs_query.filter(ShutdownLog.timestamp >= from_date)
            except ValueError:
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                to_date = to_date.replace(hour=23, minute=59, second=59)
                logs_query = logs_query.filter(ShutdownLog.timestamp <= to_date)
            except ValueError:
                pass
        
        logs = logs_query.order_by(ShutdownLog.timestamp.desc()).all()
        return render_template('history.html', logs=logs, log_type='shutdown',
                             search_query=search_query, date_from=date_from, date_to=date_to)
    
    else:
        # WOL logs (default)
        if current_user.is_admin:
            # Admin sees all logs
            logs_query = WOLLog.query
        else:
            # Regular users see only their own logs
            logs_query = WOLLog.query.filter_by(user_id=current_user.id)
    
    # Apply search filter
    if search_query:
        logs_query = logs_query.join(Computer).join(User).filter(
            db.or_(
                Computer.name.ilike(f'%{search_query}%'),
                User.username.ilike(f'%{search_query}%')
            )
        )
    
    # Apply date filters
    if date_from:
        try:
            from_date = datetime.strptime(date_from, '%Y-%m-%d')
            logs_query = logs_query.filter(WOLLog.timestamp >= from_date)
        except ValueError:
            pass
    
    if date_to:
        try:
            to_date = datetime.strptime(date_to, '%Y-%m-%d')
            # Add one day to include the entire end date
            to_date = to_date.replace(hour=23, minute=59, second=59)
            logs_query = logs_query.filter(WOLLog.timestamp <= to_date)
        except ValueError:
            pass
    
    logs = logs_query.order_by(WOLLog.timestamp.desc()).all()
    
    return render_template('history.html', logs=logs, log_type='wol',
                         search_query=search_query, 
                         date_from=date_from, 
                         date_to=date_to)

@app.route('/profile')
@login_required
def profile():
    """User profile"""
    return render_template('profile.html', user=current_user)

@app.route('/profile/change-password', methods=['POST'])
@login_required
def change_password():
    """Change password"""
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({'success': False, 'message': 'Sva polja su obavezna'}), 400
    
    if len(new_password) < 6:
        return jsonify({'success': False, 'message': 'Lozinka mora imati najmanje 6 karaktera'}), 400
    
    if not current_user.check_password(old_password):
        return jsonify({'success': False, 'message': 'Trenutna lozinka je pogrešna'}), 400
    
    current_user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Lozinka je promenjena uspešno'})

@app.route('/api/computer/<int:computer_id>/status', methods=['GET'])
@login_required
def check_computer_status(computer_id):
    """Check computer status via ping"""
    computer = Computer.query.get_or_404(computer_id)
    
    # Check if user has access to this computer
    if not current_user.is_admin and current_user not in computer.assigned_users:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    # Check status
    is_online, status = check_host_status(computer.ip_address)
    
    # Auto-detect OS if computer is online
    if is_online and computer.ip_address:
        from wol import detect_os_type
        detected_os = detect_os_type(computer.ip_address)
        if detected_os != 'unknown':
            computer.os_type = detected_os
    
    # Update database
    computer.status = status
    computer.last_checked = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'status': status,
        'is_online': is_online,
        'last_checked': computer.last_checked.isoformat() if computer.last_checked else None
    })

@app.route('/api/computers/status', methods=['GET'])
@login_required
def check_all_computers_status():
    """Check status for all assigned computers in PARALLEL"""
    from concurrent.futures import ThreadPoolExecutor
    from wol import detect_os_type
    
    # Get computers assigned to current user
    computers = current_user.computers if not current_user.is_admin else Computer.query.all()
    
    def check_single_computer(computer):
        """Check single computer status (will run in parallel)"""
        if not computer.ip_address:
            return None
        
        is_online, status = check_host_status(computer.ip_address)
        
        # Auto-detect OS if computer is online
        if is_online:
            detected_os = detect_os_type(computer.ip_address)
            if detected_os != 'unknown':
                computer.os_type = detected_os
        
        # Log uptime change if status changed
        old_status = computer.status
        if old_status != status and status in ('online', 'offline'):
            try:
                uptime_entry = UptimeLog(computer_id=computer.id, status=status)
                db.session.add(uptime_entry)
            except Exception:
                pass
        
        computer.status = status
        computer.last_checked = datetime.utcnow()
        
        return {
            'id': computer.id,
            'name': computer.name,
            'status': status,
            'is_online': is_online,
            'last_checked': computer.last_checked.isoformat()
        }
    
    # PARALLEL CHECK - all computers at once!
    results = []
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all checks at once
        future_to_computer = {executor.submit(check_single_computer, comp): comp for comp in computers}
        
        # Collect results as they complete
        for future in future_to_computer:
            result = future.result()
            if result:
                results.append(result)
    
    # Save all changes to database
    db.session.commit()
    
    return jsonify({
        'success': True,
        'results': results
    })

# ==================== GROUP MANAGEMENT ====================

@app.route('/admin/groups')
@login_required
def admin_groups():
    """Admin: Manage computer groups"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    groups = ComputerGroup.query.order_by(ComputerGroup.name).all()
    return render_template('admin_groups.html', groups=groups)

@app.route('/admin/groups/add', methods=['GET', 'POST'])
@login_required
def admin_add_group():
    """Admin: Add new group"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        color = request.form.get('color', '#0066cc').strip()
        icon = request.form.get('icon', 'fas fa-folder').strip()
        computer_ids = request.form.getlist('computers')
        allow_wake = request.form.get('allow_wake') == '1'
        allow_shutdown = request.form.get('allow_shutdown') == '1'
        
        if not name:
            flash('Naziv grupe je obavezan', 'error')
            return redirect(url_for('admin_add_group'))
        
        if ComputerGroup.query.filter_by(name=name).first():
            flash('Grupa sa tim nazivom već postoji', 'error')
            return redirect(url_for('admin_add_group'))
        
        group = ComputerGroup(
            name=name,
            description=description or None,
            color=color,
            icon=icon,
            allow_wake=allow_wake,
            allow_shutdown=allow_shutdown
        )
        
        for cid in computer_ids:
            computer = Computer.query.get(int(cid))
            if computer:
                group.computers.append(computer)
        
        db.session.add(group)
        db.session.commit()
        
        # Audit log: Group created
        AuditLog.log_action(
            action='group_create',
            user=current_user,
            resource_type='group',
            resource_id=group.id,
            status='success',
            details=f'Created group "{name}" with {len(computer_ids)} computers',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        flash(f'Grupa "{name}" je uspešno kreirana', 'success')
        return redirect(url_for('admin_groups'))
    
    computers = Computer.query.order_by(Computer.name).all()
    return render_template('admin_add_group.html', computers=computers)

@app.route('/admin/groups/<int:group_id>/edit', methods=['GET', 'POST'])
@login_required
def admin_edit_group(group_id):
    """Admin: Edit group"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    group = ComputerGroup.query.get_or_404(group_id)
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        color = request.form.get('color', '#0066cc').strip()
        icon = request.form.get('icon', 'fas fa-folder').strip()
        computer_ids = request.form.getlist('computers')
        allow_wake = request.form.get('allow_wake') == '1'
        allow_shutdown = request.form.get('allow_shutdown') == '1'
        
        if not name:
            flash('Naziv grupe je obavezan', 'error')
            return redirect(url_for('admin_edit_group', group_id=group_id))
        
        existing = ComputerGroup.query.filter_by(name=name).first()
        if existing and existing.id != group.id:
            flash('Grupa sa tim nazivom već postoji', 'error')
            return redirect(url_for('admin_edit_group', group_id=group_id))
        
        group.name = name
        group.description = description or None
        group.color = color
        group.icon = icon
        group.allow_wake = allow_wake
        group.allow_shutdown = allow_shutdown
        
        group.computers = []
        for cid in computer_ids:
            computer = Computer.query.get(int(cid))
            if computer:
                group.computers.append(computer)
        
        db.session.commit()
        
        # Audit log: Group updated
        AuditLog.log_action(
            action='group_update',
            user=current_user,
            resource_type='group',
            resource_id=group.id,
            status='success',
            details=f'Updated group "{name}" with {len(computer_ids)} computers',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        flash(f'Grupa "{name}" je ažurirana', 'success')
        return redirect(url_for('admin_groups'))
    
    computers = Computer.query.order_by(Computer.name).all()
    return render_template('admin_edit_group.html', group=group, computers=computers)

@app.route('/admin/groups/<int:group_id>/delete', methods=['POST'])
@login_required
def admin_delete_group(group_id):
    """Admin: Delete group"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    group = ComputerGroup.query.get_or_404(group_id)
    name = group.name
    db.session.delete(group)
    db.session.commit()
    
    # Audit log: Group deleted
    AuditLog.log_action(
        action='group_delete',
        user=current_user,
        resource_type='group',
        resource_id=group_id,
        status='success',
        details=f'Deleted group "{name}"',
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent')
    )
    
    return jsonify({'success': True, 'message': f'Grupa "{name}" je obrisana'})

# ==================== APP SETTINGS ====================

@app.route('/admin/settings', methods=['GET', 'POST'])
@login_required
def admin_settings():
    """Admin: Application settings"""
    if not current_user.is_admin:
        flash('Pristup odbijen', 'error')
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        # Update settings
        enable_groups = request.form.get('enable_groups') == 'on'
        enable_search = request.form.get('enable_search') == 'on'
        
        AppSettings.set('enable_groups', str(enable_groups).lower(), 
                       'Omogući organizaciju računara u grupe')
        AppSettings.set('enable_search', str(enable_search).lower(), 
                       'Omogući pretraživanje računara')
        
        db.session.commit()
        flash('Podešavanja su sačuvana', 'success')
        return redirect(url_for('admin_settings'))
    
    # Get current settings
    settings = {
        'enable_groups': AppSettings.get_bool('enable_groups', default=True),
        'enable_search': AppSettings.get_bool('enable_search', default=True),
    }
    
    return render_template('admin_settings.html', settings=settings)

@app.route('/admin/delete-logs', methods=['POST'])
@login_required
def admin_delete_logs():
    """Admin: Delete WOL logs"""
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Pristup odbijen'}), 403
    
    try:
        data = request.get_json()
        delete_option = data.get('option')
        
        if delete_option == 'all':
            # Delete all logs
            count = WOLLog.query.count()
            WOLLog.query.delete()
            db.session.commit()
            return jsonify({'success': True, 'message': f'Obrisano {count} logova'})
        
        elif delete_option == 'range':
            # Delete logs in date range
            from_date_str = data.get('from_date')
            to_date_str = data.get('to_date')
            
            if not from_date_str or not to_date_str:
                return jsonify({'success': False, 'message': 'Nedostaju datumi'}), 400
            
            try:
                from_date = datetime.strptime(from_date_str, '%Y-%m-%d')
                to_date = datetime.strptime(to_date_str, '%Y-%m-%d')
                to_date = to_date.replace(hour=23, minute=59, second=59)
                
                logs_query = WOLLog.query.filter(
                    WOLLog.timestamp >= from_date,
                    WOLLog.timestamp <= to_date
                )
                count = logs_query.count()
                logs_query.delete()
                db.session.commit()
                
                return jsonify({'success': True, 'message': f'Obrisano {count} logova za period {from_date_str} do {to_date_str}'})
            except ValueError as e:
                return jsonify({'success': False, 'message': 'Neispravan format datuma'}), 400
        else:
            return jsonify({'success': False, 'message': 'Nepoznata opcija brisanja'}), 400
            
    except Exception as e:
        logger.error(f"Error deleting logs: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/groups/<int:group_id>/wake', methods=['POST'])
@login_required
def wake_group(group_id):
    """Wake all computers in a group"""
    group = ComputerGroup.query.get_or_404(group_id)
    
    results = []
    for computer in group.computers:
        # Check if user has access
        if not current_user.is_admin and current_user not in computer.assigned_users:
            results.append({'name': computer.name, 'success': False, 'message': 'Pristup odbijen'})
            continue
        
        success, message = send_wol_packet(computer.mac_address)
        
        log = WOLLog(user_id=current_user.id, computer_id=computer.id, status='sent' if success else 'failed')
        db.session.add(log)
        computer.last_wol = datetime.utcnow()
        
        results.append({'name': computer.name, 'success': success, 'message': message})
    
    db.session.commit()
    
    sent = sum(1 for r in results if r['success'])
    return jsonify({
        'success': True,
        'message': f'WoL poslat na {sent}/{len(results)} računara u grupi "{group.name}"',
        'results': results
    })

# ==================== STATISTICS ====================

@app.route('/statistics')
@login_required
def statistics():
    """Statistics page with uptime graphs"""
    if current_user.is_admin:
        computers = Computer.query.order_by(Computer.name).all()
    else:
        computers = current_user.computers
    
    return render_template('statistics.html', computers=computers)

@app.route('/api/statistics/data', methods=['GET'])
@login_required
def statistics_data():
    """Get statistics data for charts"""
    from sqlalchemy import func
    
    days = request.args.get('days', 7, type=int)
    days = min(days, 90)  # Max 90 days
    
    cutoff = datetime.utcnow() - __import__('datetime').timedelta(days=days)
    
    if current_user.is_admin:
        computers = Computer.query.all()
    else:
        computers = current_user.computers
    
    computer_stats = []
    for computer in computers:
        # Uptime logs
        logs = UptimeLog.query.filter(
            UptimeLog.computer_id == computer.id,
            UptimeLog.timestamp >= cutoff
        ).order_by(UptimeLog.timestamp).all()
        
        # Calculate total online time
        online_seconds = 0
        last_online_time = None
        for log in logs:
            if log.status == 'online':
                last_online_time = log.timestamp
            elif log.status == 'offline' and last_online_time:
                online_seconds += (log.timestamp - last_online_time).total_seconds()
                last_online_time = None
        
        # If still online, count up to now
        if last_online_time and computer.status == 'online':
            online_seconds += (datetime.utcnow() - last_online_time).total_seconds()
        
        total_seconds = days * 86400
        uptime_pct = round((online_seconds / total_seconds) * 100, 1) if total_seconds > 0 else 0
        
        # WoL count
        wol_count = WOLLog.query.filter(
            WOLLog.computer_id == computer.id,
            WOLLog.timestamp >= cutoff
        ).count()
        
        # Shutdown count
        shutdown_count = ShutdownLog.query.filter(
            ShutdownLog.computer_id == computer.id,
            ShutdownLog.timestamp >= cutoff
        ).count()
        
        # Timeline data (hourly)
        timeline = []
        for log in logs:
            timeline.append({
                'time': log.timestamp.isoformat(),
                'status': log.status
            })
        
        computer_stats.append({
            'id': computer.id,
            'name': computer.name,
            'os_type': computer.os_type or 'unknown',
            'current_status': computer.status or 'unknown',
            'uptime_pct': uptime_pct,
            'online_hours': round(online_seconds / 3600, 1),
            'wol_count': wol_count,
            'shutdown_count': shutdown_count,
            'timeline': timeline
        })
    
    return jsonify({'success': True, 'stats': computer_stats, 'days': days})

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(error):
    db.session.rollback()
    return render_template('500.html'), 500

# CLI commands
@app.cli.command()
def init_db():
    """Initialize the database."""
    db.create_all()
    print('✓ Baza je inicijalizovana.')

@app.cli.command()
def create_admin():
    """Create admin user."""
    username = input('Korisničko ime: ')
    email = input('Email: ')
    password = input('Lozinka: ')
    
    if User.query.filter_by(username=username).first():
        print('✗ Korisnik već postoji!')
        return
    
    admin = User(username=username, email=email, is_admin=True)
    admin.set_password(password)
    
    db.session.add(admin)
    db.session.commit()
    
    print(f'✓ Admin korisnik "{username}" je kreiran!')

# ==================== WEBSOCKET EVENTS ====================

# Background thread for status monitoring
status_monitor_thread = None
status_monitor_running = False

def check_single_computer_status(computer_id, ip_address):
    """Check status of a single computer (for parallel execution)"""
    try:
        is_online, status = check_host_status(ip_address)
        return (computer_id, status, True)
    except Exception as e:
        logger.error(f"Error checking status for computer {computer_id}: {e}")
        return (computer_id, 'unknown', False)

def monitor_computer_status():
    """Background thread that monitors computer status - OPTIMIZED with parallel checks"""
    global status_monitor_running
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    while status_monitor_running:
        with app.app_context():
            try:
                # Fetch all computers with IP addresses
                computers = Computer.query.filter(Computer.ip_address.isnot(None)).all()
                
                if not computers:
                    time.sleep(10)
                    continue
                
                # Parallel status checks with timeout
                status_updates = []
                with ThreadPoolExecutor(max_workers=min(10, len(computers))) as executor:
                    # Submit all tasks
                    future_to_computer = {
                        executor.submit(check_host_status, comp.ip_address): comp 
                        for comp in computers
                    }
                    
                    # Process results as they complete
                    for future in as_completed(future_to_computer, timeout=8):
                        computer = future_to_computer[future]
                        try:
                            is_online, status = future.result(timeout=2)
                            status_updates.append((computer, status))
                        except Exception as e:
                            logger.debug(f"Status check failed for {computer.name}: {e}")
                            status_updates.append((computer, 'unknown'))
                
                # Batch database updates
                now = datetime.utcnow()
                changes = []
                for computer, new_status in status_updates:
                    if computer.status != new_status:
                        # Log uptime change
                        if new_status in ('online', 'offline'):
                            try:
                                uptime_entry = UptimeLog(computer_id=computer.id, status=new_status)
                                db.session.add(uptime_entry)
                            except Exception:
                                pass
                        
                        computer.status = new_status
                        computer.last_checked = now
                        changes.append({
                            'computer_id': computer.id,
                            'status': new_status,
                            'last_checked': now.strftime('%Y-%m-%d %H:%M:%S')
                        })
                
                # Commit all changes at once
                if changes:
                    db.session.commit()
                    
                    # Emit all status updates
                    for change in changes:
                        socketio.emit('status_update', change, namespace='/', broadcast=True)
                
            except Exception as e:
                logger.error(f"Error in status monitor: {e}")
                db.session.rollback()
        
        # Check every 15 seconds (reduced from 10 for less load)
        time.sleep(15)

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')
    
    # Start status monitor thread if not running
    global status_monitor_thread, status_monitor_running
    if status_monitor_thread is None or not status_monitor_thread.is_alive():
        status_monitor_running = True
        status_monitor_thread = threading.Thread(target=monitor_computer_status, daemon=True)
        status_monitor_thread.start()
    
    # Send current status of all computers
    with app.app_context():
        computers = Computer.query.all()
        for computer in computers:
            emit('status_update', {
                'computer_id': computer.id,
                'status': computer.status,
                'last_checked': computer.last_checked.strftime('%Y-%m-%d %H:%M:%S') if computer.last_checked else None
            })

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')

@socketio.on('request_status')
def handle_request_status(data):
    """Handle manual status check request"""
    computer_id = data.get('computer_id')
    
    with app.app_context():
        computer = Computer.query.get(computer_id)
        if computer and computer.ip_address:
            is_online, status = check_host_status(computer.ip_address)
            computer.status = status
            computer.last_checked = datetime.utcnow()
            db.session.commit()
            
            emit('status_update', {
                'computer_id': computer.id,
                'status': status,
                'last_checked': computer.last_checked.strftime('%Y-%m-%d %H:%M:%S')
            }, broadcast=True)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
    # Disable reloader in production to prevent session issues
    is_dev = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', debug=is_dev, use_reloader=is_dev)
