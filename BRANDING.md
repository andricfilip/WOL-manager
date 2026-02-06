# 🎨 Branding Guide - WOL Manager Personalization

**Author:** Filip Andrić  
**Copyright:** © 2026 Filip Andrić. All rights reserved.

---

## 📝 Overview

This guide explains how to customize and rebrand WOL Manager for different clients or deployments. All branding settings are centralized in `backend/app_config.py`.

---

## ⚙️ Quick Start

Edit the configuration file:
```bash
nano backend/app_config.py
```

After making changes, rebuild and restart:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🏢 Customization Options

### 1. Application Name & Icon

```python
# Application Branding
APP_NAME = "WOL Manager"              # Change to your preferred name
APP_TAGLINE = "Wake-on-LAN Management System"
APP_ICON = "fas fa-power-off"         # FontAwesome icon class
```

**Example for different client:**
```python
APP_NAME = "TechCorp Device Manager"
APP_TAGLINE = "Remote Computer Management"
APP_ICON = "fas fa-network-wired"
```

**Popular Icons:**
- `fas fa-power-off` - Power button
- `fas fa-network-wired` - Network
- `fas fa-server` - Server
- `fas fa-desktop` - Desktop
- `fas fa-laptop` - Laptop
- Full list: https://fontawesome.com/icons

### 2. Company/Client Information

```python
COMPANY_NAME = "Your Company Name"    # Client's company name
COMPANY_LOGO_URL = None               # Optional: URL to logo image
FOOTER_TEXT = "© 2026 Your Company"
```

**Logo Options:**

**Option A - External URL:**
```python
COMPANY_LOGO_URL = "https://yourcompany.com/logo.png"
```

**Option B - Local File (Recommended):**
1. Place logo in `frontend/images/logo.png`
2. Update config:
```python
COMPANY_LOGO_URL = "/images/logo.png"
```

**Logo Requirements:**
- Format: PNG, SVG, or WEBP (transparent background recommended)
- Size: Max 200x60px for best display
- Aspect ratio: 3:1 or 4:1 works best

### 3. Author & Copyright

```python
# Author Information
AUTHOR_NAME = "Filip Andrić"
AUTHOR_EMAIL = "contact@example.com"  # Your contact email
VERSION = "1.0.0"
LICENSE = "Proprietary - All Rights Reserved"
```

### 4. Theme Colors

Customize the color scheme:

```python
# Theme Colors (CSS color values)
PRIMARY_COLOR = "#0066cc"      # Main brand color
SECONDARY_COLOR = "#6c757d"    # Secondary elements
SUCCESS_COLOR = "#28a745"      # Success messages
WARNING_COLOR = "#ffc107"      # Warnings
DANGER_COLOR = "#dc3545"       # Errors/danger actions
```

**Example color schemes:**

```python
# Professional Blue
PRIMARY_COLOR = "#0066cc"

# Corporate Green
PRIMARY_COLOR = "#28a745"

# Tech Purple
PRIMARY_COLOR = "#6f42c1"

# Modern Orange
PRIMARY_COLOR = "#fd7e14"
```

### 5. Feature Defaults

```python
# Feature Toggles (can be overridden by admin settings)
DEFAULT_ENABLE_GROUPS = True
DEFAULT_ENABLE_SEARCH = True
DEFAULT_ENABLE_STATISTICS = True
```

### 6. Timing & Performance

```python
# Dashboard Settings
AUTO_REFRESH_INTERVAL = 30  # seconds
MAX_COMPUTERS_PER_PAGE = 50
```

### 7. Security Settings

```python
# Security Settings
MIN_PASSWORD_LENGTH = 6
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15
```

### 8. Support Information

```python
# Support & Documentation
SUPPORT_EMAIL = "support@example.com"
DOCUMENTATION_URL = None              # Optional: Link to docs
GITHUB_URL = None                     # Optional: Repository link
```

---

## 🚀 Applying Changes

After modifying `app_config.py`:

### 1. Rebuild Docker Containers

```bash
cd /home/kancelarija/computer-runner
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

### 2. Verify Changes

- Open application in browser
- Check navigation bar for new app name
- Verify footer shows updated copyright
- Test color scheme changes

---

## 📋 Client Deployment Checklist

When preparing WOL Manager for a new client:

- [ ] Update `APP_NAME` with client's preferred name
- [ ] Set `COMPANY_NAME` to client's company
- [ ] Update `FOOTER_TEXT` with appropriate copyright
- [ ] Customize `PRIMARY_COLOR` to match client's brand
- [ ] Set `SUPPORT_EMAIL` to client's support address
- [ ] Update `AUTHOR_EMAIL` for contact
- [ ] Set appropriate `DEFAULT_ENABLE_*` feature flags
- [ ] Adjust `AUTO_REFRESH_INTERVAL` based on network size
- [ ] Configure `MIN_PASSWORD_LENGTH` per security requirements
- [ ] Test all functionality after changes

---

## 🎨 Advanced Customization

### Adding Custom Logo

1. Add logo image to `frontend/` directory
2. Update `COMPANY_LOGO_URL` in config:

```python
COMPANY_LOGO_URL = "/logo.png"
```

3. Modify `base.html` navbar to include logo:

```html
<a href="{{ url_for('dashboard') }}" class="navbar-brand">
    {% if app_info.logo_url %}
    <img src="{{ app_info.logo_url }}" alt="Logo" style="height: 40px;">
    {% else %}
    <i class="{{ app_info.icon }}"></i>
    {% endif %}
    <span>{{ app_info.name }}</span>
</a>
```

### Custom CSS Theming

Create `frontend/css/custom-theme.css`:

```css
:root {
    --primary: #your-color;
    --secondary: #your-color;
}
```

Include in `base.html`:

```html
<link rel="stylesheet" href="/css/custom-theme.css">
```

---

## 📝 Example Configurations

### Example 1: IT Company "TechCorp"

```python
APP_NAME = "TechCorp Device Manager"
COMPANY_NAME = "TechCorp Solutions"
FOOTER_TEXT = "© 2026 TechCorp Solutions. Powered by Filip Andrić"
PRIMARY_COLOR = "#1e3a8a"
APP_ICON = "fas fa-server"
SUPPORT_EMAIL = "support@techcorp.com"
```

### Example 2: School "UniTech"

```python
APP_NAME = "UniTech Lab Manager"
COMPANY_NAME = "University of Technology"
FOOTER_TEXT = "© 2026 UniTech - Computer Lab Management"
PRIMARY_COLOR = "#dc2626"
APP_ICON = "fas fa-graduation-cap"
SUPPORT_EMAIL = "it@unitech.edu"
```

### Example 3: Internet Café

```python
APP_NAME = "CyberCafé Control"
COMPANY_NAME = "GameZone Internet Café"
FOOTER_TEXT = "© 2026 GameZone"
PRIMARY_COLOR = "#7c3aed"
APP_ICON = "fas fa-gamepad"
AUTO_REFRESH_INTERVAL = 15  # More frequent for café
```

---

## 🔒 Licensing & Distribution

**Important:** This software is proprietary and copyrighted by Filip Andrić.

- Customization for clients is permitted
- Attribution to Filip Andrić must be maintained
- Cannot be redistributed without permission
- Contact author for licensing inquiries

---

## 📞 Support

For customization assistance or licensing inquiries:

**Author:** Filip Andrić  
**Email:** contact@example.com

---

**© 2026 Filip Andrić. All rights reserved.**
