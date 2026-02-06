#!/usr/bin/env python3
"""
Database Migration Script - Add AppSettings table and user permissions
Run this after pulling new code updates.
"""
from app import app, db
from models import AppSettings, User
import sys

def migrate_database():
    """Add AppSettings table and update User model"""
    with app.app_context():
        try:
            # Add can_view_groups column to existing users if needed
            try:
                # Check if column exists by trying to query it
                User.query.with_entities(User.can_view_groups).first()
            except Exception as e:
                # Column doesn't exist, add it using raw SQL
                print("⚙️  Dodajem 'can_view_groups' kolonu u User tabelu...")
                db.session.rollback()  # Clear any errors
                with db.engine.connect() as conn:
                    conn.execute(db.text("ALTER TABLE \"user\" ADD COLUMN can_view_groups BOOLEAN DEFAULT TRUE"))
                    conn.commit()
                print("✓ Kolona 'can_view_groups' dodata")
                db.session.rollback()  # Clear session after ALTER
            
            # Create tables (this will only create missing tables)
            db.create_all()
            
            # Initialize default settings if they don't exist
            if not AppSettings.query.filter_by(key='enable_groups').first():
                AppSettings.set('enable_groups', 'true', 'Omogući organizaciju računara u grupe')
                print("✓ Kreiran default setting: enable_groups = true")
            
            if not AppSettings.query.filter_by(key='enable_search').first():
                AppSettings.set('enable_search', 'true', 'Omogući pretraživanje računara')
                print("✓ Kreiran default setting: enable_search = true")
            
            db.session.commit()
            print("\n✓ Migracija uspešna!")
            print("  Tabela 'app_settings' je kreirana ili već postoji.")
            print("  User model je ažuriran sa 'can_view_groups' poljem.")
            print("  Default podešavanja su postavljena.\n")
            return True
            
        except Exception as e:
            print(f"\n✗ Greška tokom migracije: {e}\n", file=sys.stderr)
            db.session.rollback()
            return False

if __name__ == '__main__':
    print("\n=== Database Migration Script ===")
    print("Dodavanje AppSettings tabele i user permissions...\n")
    
    success = migrate_database()
    sys.exit(0 if success else 1)
