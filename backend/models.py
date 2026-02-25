from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from encryption import encrypt_password, decrypt_password

db = SQLAlchemy()

# Many-to-many association table for user-computer assignments
user_computers = db.Table('user_computers',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('computer_id', db.Integer, db.ForeignKey('computer.id'), primary_key=True)
)

# Many-to-many association table for group-computer assignments
group_computers = db.Table('group_computers',
    db.Column('group_id', db.Integer, db.ForeignKey('computer_group.id'), primary_key=True),
    db.Column('computer_id', db.Integer, db.ForeignKey('computer.id'), primary_key=True)
)

class ComputerGroup(db.Model):
    """Computer group model"""
    __tablename__ = 'computer_group'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.String(500))
    color = db.Column(db.String(7), default='#0066cc')  # Hex color
    icon = db.Column(db.String(50), default='fas fa-folder')  # FontAwesome icon class
    
    # Action permissions
    allow_wake = db.Column(db.Boolean, default=True)  # Allow WoL (wake on LAN)
    allow_shutdown = db.Column(db.Boolean, default=True)  # Allow shutdown
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    computers = db.relationship('Computer', secondary=group_computers, backref=db.backref('groups', lazy='dynamic'))
    
    def __repr__(self):
        return f'<ComputerGroup {self.name}>'

class User(UserMixin, db.Model):
    """User model"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    can_view_groups = db.Column(db.Boolean, default=True)  # NEW: korisnici mogu videti grupe
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Many-to-many relationship with computers
    computers = db.relationship('Computer', secondary=user_computers, backref=db.backref('assigned_users', lazy='dynamic'))
    logs = db.relationship('WOLLog', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Computer(db.Model):
    """Computer model"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    mac_address = db.Column(db.String(17), unique=True, nullable=False)
    ip_address = db.Column(db.String(15))
    description = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_wol = db.Column(db.DateTime)
    last_shutdown = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='unknown')  # 'online', 'offline', 'unknown'
    last_checked = db.Column(db.DateTime)
    os_type = db.Column(db.String(20), default='linux')  # 'windows', 'linux', 'unknown'
    
    # SSH credentials for shutdown functionality (ENCRYPTED)
    ssh_host = db.Column(db.String(255))  # Can be different from ip_address
    ssh_port = db.Column(db.Integer, default=22)
    ssh_username = db.Column(db.String(100))
    _ssh_password_encrypted = db.Column('ssh_password', db.String(500))  # Encrypted storage
    ssh_auto_login = db.Column(db.Boolean, default=False)  # Per-computer SSH auto-login setting
    
    # Creator/Owner of the computer (optional - needed for user settings)
    created_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_by = db.relationship('User', backref=db.backref('created_computers', lazy='dynamic'))
    
    # Remove owner_id - now using many-to-many relationship
    logs = db.relationship('WOLLog', backref='computer', lazy=True, cascade='all, delete-orphan')
    shutdown_logs = db.relationship('ShutdownLog', backref='computer', lazy=True, cascade='all, delete-orphan')
    
    @property
    def ssh_password(self):
        """Decrypt SSH password when reading"""
        if self._ssh_password_encrypted:
            try:
                return decrypt_password(self._ssh_password_encrypted)
            except Exception:
                # If decryption fails, return None (e.g., wrong encryption key)
                return None
        return None
    
    @ssh_password.setter
    def ssh_password(self, value):
        """Encrypt SSH password when writing"""
        if value:
            try:
                self._ssh_password_encrypted = encrypt_password(value)
            except ValueError:
                # If encryption is not configured, store as plaintext (development only!)
                logger.warning("Encryption not configured - storing SSH password as plaintext!")
                self._ssh_password_encrypted = value
        else:
            self._ssh_password_encrypted = None
    
    def __repr__(self):
        return f'<Computer {self.name}>'

class UserComputerPreference(db.Model):
    """Per-user preferences for assigned computers"""
    __tablename__ = 'user_computer_preference'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'computer_id', name='uq_user_computer_pref'),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    computer_id = db.Column(db.Integer, db.ForeignKey('computer.id'), nullable=False, index=True)
    ssh_auto_login = db.Column(db.Boolean, default=False, nullable=False)
    role = db.Column(db.String(20), default='operator', nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('computer_preferences', lazy='dynamic'))
    computer = db.relationship('Computer', backref=db.backref('user_preferences', lazy='dynamic'))

class WOLLog(db.Model):
    """WOL action log"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    computer_id = db.Column(db.Integer, db.ForeignKey('computer.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='sent')  # 'sent', 'failed'
    
    def __repr__(self):
        return f'<WOLLog {self.user.username} -> {self.computer.name}>'

class ShutdownLog(db.Model):
    """Shutdown action log"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    computer_id = db.Column(db.Integer, db.ForeignKey('computer.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='success')  # 'success', 'failed'
    error_message = db.Column(db.String(500))
    
    user = db.relationship('User', backref='shutdown_logs')
    
    def __repr__(self):
        return f'<ShutdownLog {self.user.username} -> {self.computer.name}>'

class AuditLog(db.Model):
    """Security audit log for sensitive actions"""
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    username = db.Column(db.String(80))
    action = db.Column(db.String(50), nullable=False, index=True)
    resource_type = db.Column(db.String(50))
    resource_id = db.Column(db.Integer)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))
    status = db.Column(db.String(20))
    details = db.Column(db.Text)
    
    user = db.relationship('User', backref='audit_logs')
    
    def __repr__(self):
        return f'<AuditLog {self.action} by {self.username} at {self.timestamp}>'
    
    @staticmethod
    def log_action(action, user=None, resource_type=None, resource_id=None, 
                   status='success', details=None, ip_address=None, user_agent=None):
        log = AuditLog(
            user_id=user.id if user else None,
            username=user.username if user else 'anonymous',
            action=action, resource_type=resource_type,
            resource_id=resource_id, status=status,
            details=details, ip_address=ip_address, user_agent=user_agent
        )
        db.session.add(log)
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            import logging
            logging.error(f"Failed to create audit log: {e}")

class UptimeLog(db.Model):
    """Track uptime history for computers"""
    id = db.Column(db.Integer, primary_key=True)
    computer_id = db.Column(db.Integer, db.ForeignKey('computer.id'), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False)  # 'online', 'offline'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    computer = db.relationship('Computer', backref=db.backref('uptime_logs', lazy='dynamic', cascade='all, delete-orphan'))
    
    def __repr__(self):
        return f'<UptimeLog {self.computer_id} {self.status} at {self.timestamp}>'

class AppSettings(db.Model):
    """Application settings - Key/Value store"""
    __tablename__ = 'app_settings'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    value = db.Column(db.String(500))
    description = db.Column(db.String(500))
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    @staticmethod
    def get(key, default=None):
        """Get setting value"""
        setting = AppSettings.query.filter_by(key=key).first()
        return setting.value if setting else default
    
    @staticmethod
    def set(key, value, description=None):
        """Set setting value"""
        setting = AppSettings.query.filter_by(key=key).first()
        if setting:
            setting.value = value
            if description:
                setting.description = description
        else:
            setting = AppSettings(key=key, value=value, description=description)
            db.session.add(setting)
        try:
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to set app setting {key}: {e}")
            return False
    
    @staticmethod
    def get_bool(key, default=False):
        """Get boolean setting"""
        value = AppSettings.get(key)
        if value is None:
            return default
        return value.lower() in ('true', '1', 'yes', 'on')
    
    def __repr__(self):
        return f'<AppSettings {self.key}={self.value}>'
