#!/usr/bin/env python3
"""
Migration script to remove ssh_terminal_auto_login column from User model
This setting has been moved to per-computer basis (Computer.ssh_auto_login)
"""
from app import app
from models import db

def migrate():
    with app.app_context():
        try:
            # Check if column exists
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('user')]
            
            if 'ssh_terminal_auto_login' in columns:
                print("Removing ssh_terminal_auto_login column from user table...")
                
                # Remove column
                with db.engine.connect() as conn:
                    conn.execute(db.text(
                        "ALTER TABLE \"user\" DROP COLUMN ssh_terminal_auto_login"
                    ))
                    conn.commit()
                    print("✓ Removed ssh_terminal_auto_login column")
                
                print("✅ Migration completed successfully!")
            else:
                print("✓ Column already removed, no migration needed.")
                
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == '__main__':
    migrate()
