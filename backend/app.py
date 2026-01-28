from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_login import LoginManager, login_required, current_user
from datetime import datetime
from config import config
from models import db, User, Computer, WOLLog
from wol import send_wol_packet, validate_mac_address, check_host_status
import auth
import os

app = Flask(__name__)
app.config.from_object(config[os.environ.get('FLASK_ENV', 'development')])

# Initialize extensions
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Molim prijavite se da pristupite ovoj stranici'

# Register blueprints
app.register_blueprint(auth.auth_bp)

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
            
            return jsonify({'success': success, 'message': message})
    
    return render_template('dashboard.html', computers=computers)

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
            description=description if description else None
        )
        
        # Assign users
        for user_id in assigned_user_ids:
            user = User.query.get(int(user_id))
            if user:
                computer.assigned_users.append(user)
        
        db.session.add(computer)
        db.session.commit()
        
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
        assigned_user_ids = request.form.getlist('assigned_users')
        
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
        
        flash(f'Računar "{computer.name}" je ažuriran', 'success')
        return redirect(url_for('admin_computers'))
    
    users = User.query.all()
    return render_template('admin_edit_computer.html', computer=computer, users=users)

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
    
    return jsonify({
        'success': True,
        'message': f'Korisnik {user.username} je sada {"admin" if user.is_admin else "obični korisnik"}',
        'is_admin': user.is_admin
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
    
    return jsonify({'success': True, 'message': f'Korisnik {username} je obrisan'})

@app.route('/history')
@login_required
def history():
    """View WOL history"""
    if current_user.is_admin:
        # Admin sees all logs
        logs = WOLLog.query.order_by(WOLLog.timestamp.desc()).all()
    else:
        # Regular users see only their own logs
        logs = WOLLog.query.filter_by(user_id=current_user.id).order_by(WOLLog.timestamp.desc()).all()
    
    return render_template('history.html', logs=logs)

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
    """Check status for all assigned computers"""
    # Get computers assigned to current user
    computers = current_user.computers if not current_user.is_admin else Computer.query.all()
    
    results = []
    for computer in computers:
        if computer.ip_address:
            is_online, status = check_host_status(computer.ip_address)
            computer.status = status
            computer.last_checked = datetime.utcnow()
            
            results.append({
                'id': computer.id,
                'name': computer.name,
                'status': status,
                'is_online': is_online,
                'last_checked': computer.last_checked.isoformat()
            })
        else:
            results.append({
                'id': computer.id,
                'name': computer.name,
                'status': 'unknown',
                'is_online': False,
                'last_checked': None
            })
    
    db.session.commit()
    
    return jsonify({'success': True, 'computers': results})

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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    # Disable reloader in production to prevent session issues
    is_dev = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', debug=is_dev, use_reloader=is_dev)
