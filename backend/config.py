import os
from datetime import timedelta

class Config:
    """Base configuration"""
    # PostgreSQL connection - better for production and portability
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://wol_user:wol_password@postgres:5432/wol_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    REMEMBER_COOKIE_DURATION = timedelta(days=7)
    WOL_BROADCAST_IP = '255.255.255.255'  # Default broadcast
    WOL_PORT = 9
    
    # Encryption settings
    ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')
    ENCRYPTION_SALT = os.environ.get('ENCRYPTION_SALT', 'WOL-Manager-Salt-2026')
    
    # Session settings - Enhanced security
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
    SESSION_COOKIE_HTTPONLY = os.environ.get('SESSION_COOKIE_HTTPONLY', 'true').lower() == 'true'
    SESSION_COOKIE_SAMESITE = os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax')
    PERMANENT_SESSION_LIFETIME = timedelta(hours=12)  # Shorter session for security
    
    # Rate limiting
    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URL = "memory://"
    RATELIMIT_DEFAULT = "200 per hour"  # Default rate limit
    RATELIMIT_LOGIN = "5 per minute"    # Login endpoint
    RATELIMIT_API = "60 per minute"     # API endpoints
    
    # Security headers
    SEND_FILE_MAX_AGE_DEFAULT = 0  # Disable caching of sensitive data

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
