#!/usr/bin/env python3
"""
Migration script to add ssh_auto_login column to Computer model
Adds per-computer SSH auto-login setting
"""
from app import app
from models import db

def migrate():
    with app.app_context():
        try:
            # Check if column already exists
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('computer')]
            
            if 'ssh_auto_login' not in columns:
                print("Adding ssh_auto_login column to computer table...")
                
                # Add column with default value FALSE
                with db.engine.connect() as conn:
                    conn.execute(db.text(
                        "ALTER TABLE computer ADD COLUMN ssh_auto_login BOOLEAN DEFAULT FALSE"
                    ))
                    conn.commit()
                    print("✓ Added ssh_auto_login column")
                
                print("✅ Migration completed successfully!")
            else:
                print("✓ Column already exists, no migration needed.")
                
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == '__main__':
    migrate()
