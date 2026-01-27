# ComputerRunner - Wake-on-LAN Manager

A web-based application for managing and remotely waking computers on your local network using Wake-on-LAN (WoL) technology.

## Features

- 🔐 **User Authentication** - Register and login with secure password hashing
- 👥 **Role-Based Access Control** - Admin and regular user roles
- 💻 **Computer Management** - Add, edit, and delete computers with MAC addresses
- 🔌 **Wake-on-LAN** - Send WoL packets to wake up computers
- 📝 **Activity Logging** - Track all WoL packet sends
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🐳 **Docker Support** - Easy deployment with Docker and Docker Compose

## Architecture

### Backend
- **Framework**: Flask (Python)
- **Database**: SQLite (default) or PostgreSQL
- **Authentication**: Flask-Login with password hashing
- **API**: RESTful endpoints for all operations

### Frontend
- **HTML/CSS/JavaScript** - Vanilla JS with responsive design
- **Server**: Nginx reverse proxy
- **UI**: Modern, clean interface with Bootstrap-like styling

## Project Structure

```
ComputerRunner/
├── backend/
│   ├── app.py                 # Main Flask application
│   ├── models.py              # Database models
│   ├── auth.py                # Authentication routes
│   ├── wol.py                 # WoL functionality
│   ├── config.py              # Configuration
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile             # Backend Docker image
├── frontend/
│   ├── index.html             # Login page
│   ├── css/
│   │   └── style.css          # Styling
│   ├── js/
│   │   └── app.js             # Frontend logic
│   ├── nginx.conf             # Nginx configuration
│   └── Dockerfile             # Frontend Docker image
├── docker-compose.yml         # Docker Compose configuration
└── README.md                  # This file
```

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.9+ (for local development)
- SQLite or PostgreSQL

### Option 1: Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd ComputerRunner
```

2. Start the application:
```bash
docker-compose up -d
```

3. Access the application:
- Frontend: http://localhost
- Backend API: http://localhost:5000

4. Create first admin user:
```bash
docker exec computerrunner_backend python -c "
from app import app, db
from models import User
with app.app_context():
    db.create_all()
    admin = User(username='admin', email='admin@example.com', is_admin=True)
    admin.set_password('admin123')
    db.session.add(admin)
    db.session.commit()
    print('Admin user created!')
"
```

### Option 2: Local Development

1. Create virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Initialize database:
```bash
cd backend
flask init-db
```

4. Create admin user:
```bash
flask create-admin
```

5. Run the application:
```bash
python app.py
```

6. In another terminal, serve the frontend:
```bash
cd frontend
python -m http.server 8000
```

Access at http://localhost:8000

## Usage

### For Regular Users

1. **Register**: Create a new account
2. **Add Computers**: Go to "Add Computer" and enter:
   - Computer name
   - MAC address (format: `XX:XX:XX:XX:XX:XX`)
   - IP address (optional)
   - Description (optional)
3. **Wake Computer**: Click the "Wake Up" button on your computer card
4. **View History**: Check activity log in "History" section

### For Administrators

1. **User Management**: Access `/admin/users` to:
   - View all users
   - Toggle admin status
   - Delete users
2. **System Monitoring**: Monitor all WoL activities

## Configuration

### Backend Configuration

Edit `backend/config.py`:

```python
# Database
SQLALCHEMY_DATABASE_URI = 'sqlite:///wol.db'

# WoL Settings
WOL_BROADCAST_IP = '255.255.255.255'
WOL_PORT = 9
```

### Environment Variables

Create `.env` file:

```env
FLASK_ENV=production
SECRET_KEY=your-secret-key-here
```

### Docker Compose

Customize `docker-compose.yml` for your needs:
- Change ports
- Modify environment variables
- Add SSL certificates
- Configure persistent volumes

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/logout` - Logout user

### Computers
- `GET /dashboard` - View user's computers
- `POST /computers/add` - Add new computer
- `POST /computers/<id>/edit` - Edit computer
- `POST /computers/<id>/delete` - Delete computer
- `POST /dashboard` (AJAX) - Send WoL packet

### Admin
- `GET /admin/users` - List all users
- `POST /admin/users/<id>/toggle-admin` - Toggle admin status
- `POST /admin/users/<id>/delete` - Delete user

### Other
- `GET /history` - View WoL history
- `GET /profile` - View profile
- `POST /profile/change-password` - Change password

## Security Considerations

1. **Change default SECRET_KEY** - Set a strong, unique key
2. **Use HTTPS** - Enable SSL/TLS in production
3. **Set strong passwords** - Enforce password requirements
4. **Network security** - Restrict access to local network only
5. **Database security** - Use strong database credentials
6. **Regular backups** - Backup your database regularly

## Troubleshooting

### WoL not working?
- Check if target computer has WoL enabled in BIOS
- Verify MAC address is correct
- Ensure computers are on the same network
- Check firewall rules for UDP port 9

### Can't login?
- Ensure database is initialized
- Check username and password
- Clear browser cookies and try again

### Docker issues?
- Check logs: `docker-compose logs -f`
- Restart services: `docker-compose restart`
- Rebuild images: `docker-compose up --build`

## Development

### Adding Features
1. Create new routes in `app.py`
2. Add models to `models.py` if needed
3. Create HTML templates in `templates/` folder
4. Update frontend `js/app.js` for interactivity

### Database Migrations
For production, use Flask-Migrate for schema changes:
```bash
pip install Flask-Migrate
flask db init
flask db migrate
flask db upgrade
```

## Deployment

### Production Checklist
- [ ] Change SECRET_KEY
- [ ] Enable HTTPS/SSL
- [ ] Use PostgreSQL instead of SQLite
- [ ] Set up proper logging
- [ ] Configure backups
- [ ] Set up monitoring
- [ ] Use strong passwords
- [ ] Enable rate limiting
- [ ] Configure CORS if needed
- [ ] Test WoL functionality

### Cloud Deployment

The application can be deployed to:
- AWS (EC2, ECS)
- Azure (App Service, Container Instances)
- Google Cloud (Cloud Run, GKE)
- DigitalOcean (App Platform, Kubernetes)
- Self-hosted servers

## License

MIT License - Feel free to use and modify

## Support

For issues, questions, or suggestions:
1. Check existing documentation
2. Review error logs
3. Test in development environment
4. Document the issue with details

## Future Enhancements

- [ ] LDAP/Active Directory integration
- [ ] Email notifications
- [ ] Scheduled WoL tasks
- [ ] Computer groups/categories
- [ ] Advanced statistics
- [ ] Two-factor authentication
- [ ] API token authentication
- [ ] Mobile app
- [ ] Integration with other tools

---

**Version**: 1.0.0  
**Last Updated**: January 2026
