from app import app, db
from models import User

try:
    with app.app_context():
        db.create_all()
        
        # Proveravamo da li admin postoji
        existing_admin = User.query.filter_by(username='admin').first()
        if not existing_admin:
            admin = User(
                username='admin',
                email='admin@example.com',
                is_admin=True
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print('✓ Admin korisnik kreiran: admin / admin123')
        else:
            print('✓ Admin korisnik već postoji')
            
except Exception as e:
    print(f'✗ Greška: {str(e)}')
    import traceback
    traceback.print_exc()
