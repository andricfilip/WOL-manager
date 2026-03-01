from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User, AuditLog

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


def get_real_ip():
    """Get real client IP from X-Forwarded-For (nginx proxy) or remote_addr."""
    fwd = request.headers.get('X-Forwarded-For')
    if fwd:
        return fwd.split(',')[0].strip()
    return request.headers.get('X-Real-IP', request.remote_addr).strip()


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login user"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        remember = request.form.get('remember') is not None
        
        if not username or not password:
            flash('Korisničko ime i lozinka su obavezni', 'error')
            return render_template('login.html')
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            session.permanent = True
            login_user(user, remember=remember)
            AuditLog.log_action(
                action='login_success',
                user=user,
                resource_type='auth',
                status='success',
                details='User login successful',
                ip_address=get_real_ip(),
                user_agent=request.headers.get('User-Agent')
            )
            flash(f'Dobrodošli nazad, {user.username}!', 'success')
            next_page = request.args.get('next')
            if next_page and next_page.startswith('/'):
                return redirect(next_page)
            return redirect(url_for('dashboard'))
        else:
            AuditLog.log_action(
                action='login_failed',
                user=user,
                resource_type='auth',
                status='failed',
                details=f'Failed login attempt for username: {username}',
                ip_address=get_real_ip(),
                user_agent=request.headers.get('User-Agent')
            )
            flash('Pogrešno korisničko ime ili lozinka', 'error')
    
    return render_template('login.html')

@auth_bp.route('/logout')
@login_required
def logout():
    """Logout user"""
    AuditLog.log_action(
        action='logout',
        user=current_user,
        resource_type='auth',
        status='success',
        details='User logout',
        ip_address=get_real_ip(),
        user_agent=request.headers.get('User-Agent')
    )
    logout_user()
    flash('Odjavljeni ste.', 'info')
    return redirect(url_for('auth.login'))
