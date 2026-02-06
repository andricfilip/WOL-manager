"""
Security middleware for Flask application
Adds security headers and protections
"""

from flask import make_response
import logging

logger = logging.getLogger(__name__)


def add_security_headers(response):
    """
    Add security headers to all responses
    
    Headers added:
    - X-Content-Type-Options: Prevent MIME type sniffing
    - X-Frame-Options: Prevent clickjacking
    - X-XSS-Protection: Enable XSS filter in older browsers
    - Strict-Transport-Security: Force HTTPS (when enabled)
    - Content-Security-Policy: Restrict resource loading
    """
    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    # Prevent clickjacking
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    
    # Enable XSS protection (for older browsers)
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Content Security Policy
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.socket.io https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
        "img-src 'self' data:; "
        "font-src 'self' https://cdnjs.cloudflare.com; "
        "connect-src 'self' ws: wss: https://cdn.socket.io https://cdn.jsdelivr.net;"
    )
    
    # Referrer Policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Permissions Policy (formerly Feature Policy)
    response.headers['Permissions-Policy'] = (
        "geolocation=(), "
        "microphone=(), "
        "camera=(), "
        "payment=(), "
        "usb=(), "
        "magnetometer=(), "
        "gyroscope=(), "
        "accelerometer=()"
    )
    
    return response


def init_security(app):
    """
    Initialize security features for Flask app
    
    Args:
        app: Flask application instance
    """
    # Add security headers to all responses
    @app.after_request
    def apply_security_headers(response):
        return add_security_headers(response)
    
    # Log HTTPS status
    if app.config.get('SESSION_COOKIE_SECURE'):
        logger.info("✓ HTTPS mode enabled - Secure cookies active")
    else:
        logger.warning("⚠️  HTTPS mode disabled - Enable SESSION_COOKIE_SECURE=true in production")
    
    # Disable debug mode info leak in production
    if not app.debug:
        @app.errorhandler(500)
        def internal_error(error):
            logger.error(f"Internal server error: {error}")
            return "Internal server error", 500
    
    logger.info("✓ Security middleware initialized")


def sanitize_input(text, max_length=1000):
    """
    Basic input sanitization
    
    Args:
        text: Input text to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized text
    """
    if not text:
        return text
    
    # Remove null bytes
    text = text.replace('\x00', '')
    
    # Limit length
    if len(text) > max_length:
        text = text[:max_length]
    
    # Strip leading/trailing whitespace
    text = text.strip()
    
    return text


def is_safe_redirect_url(target):
    """
    Check if a redirect URL is safe (same origin)
    
    Args:
        target: URL to check
        
    Returns:
        True if safe, False otherwise
    """
    if not target:
        return False
    
    # Only allow relative URLs (same origin)
    if target.startswith('/') and not target.startswith('//'):
        return True
    
    return False
