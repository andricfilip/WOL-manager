"""
Application Branding Configuration
===================================
Author: Filip Andrić
Copyright © 2026 Filip Andrić. All rights reserved.

This file contains customizable branding and application settings.
Modify these values to personalize the application for different clients or deployments.
"""

# Application Branding
APP_NAME = "WOL Manager"
APP_TAGLINE = "Wake-on-LAN Management System"
APP_ICON = "fas fa-power-off"  # FontAwesome icon class

# Company/Client Information
COMPANY_NAME = "Vaša Kompanija"  # Change to client company name
COMPANY_LOGO_URL = None  # Options: None, "https://url-to-logo.png", or "/images/logo.png" for local file
FOOTER_TEXT = "© 2026 Filip Andrić"

# Logo Upload Instructions:
# 1. Place your logo in: frontend/images/logo.png
# 2. Set: COMPANY_LOGO_URL = "/images/logo.png"
# 3. Recommended size: 200x60px (PNG/SVG with transparent background)
# 4. Rebuild Docker: docker compose -f docker-compose.prod.yml up -d --build

# Author Information
AUTHOR_NAME = "Filip Andrić"
AUTHOR_EMAIL = "contact@example.com"  # Change to your contact email
VERSION = "1.0.0"
LICENSE = "Proprietary - All Rights Reserved"

# Feature Toggles (can be overridden by admin settings)
DEFAULT_ENABLE_GROUPS = True
DEFAULT_ENABLE_SEARCH = True
DEFAULT_ENABLE_STATISTICS = True

# Theme Colors (CSS color values)
PRIMARY_COLOR = "#0066cc"
SECONDARY_COLOR = "#6c757d"
SUCCESS_COLOR = "#28a745"
WARNING_COLOR = "#ffc107"
DANGER_COLOR = "#dc3545"

# Dashboard Settings
AUTO_REFRESH_INTERVAL = 30  # seconds
MAX_COMPUTERS_PER_PAGE = 50

# Session Settings
SESSION_TIMEOUT_MINUTES = 60
REMEMBER_ME_DAYS = 30

# Security Settings
MIN_PASSWORD_LENGTH = 6
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

# Network Settings
WOL_PORT = 9
WOL_BROADCAST = "255.255.255.255"
PING_TIMEOUT = 2  # seconds
SSH_TIMEOUT = 10  # seconds

# Logging
LOG_RETENTION_DAYS = 90
LOG_LEVEL = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL

# Support & Documentation
SUPPORT_EMAIL = "support@example.com"  # Change to your support email
DOCUMENTATION_URL = None  # Optional: Link to documentation
GITHUB_URL = None  # Optional: Link to repository (if open source)

# Deployment Information
DEPLOYMENT_NAME = "Production"  # Development, Staging, Production
DEPLOYMENT_LOCATION = "Serbia"

# Contact & Credits
CREDITS = """
Developed by Filip Andrić
For business inquiries: contact@example.com
"""

def get_app_info():
    """Returns application information as a dictionary"""
    return {
        'name': APP_NAME,
        'tagline': APP_TAGLINE,
        'icon': APP_ICON,
        'version': VERSION,
        'author': AUTHOR_NAME,
        'company': COMPANY_NAME,
        'footer': FOOTER_TEXT,
        'license': LICENSE
    }

def get_theme_colors():
    """Returns theme colors as a dictionary"""
    return {
        'primary': PRIMARY_COLOR,
        'secondary': SECONDARY_COLOR,
        'success': SUCCESS_COLOR,
        'warning': WARNING_COLOR,
        'danger': DANGER_COLOR
    }
