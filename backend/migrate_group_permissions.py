#!/usr/bin/env python3
"""
Migration script to add action permissions to ComputerGroup model
Adds: allow_wake, allow_shutdown columns
"""
from app import app
from models import db

def migrate():
    with app.app_context():
        try:
            # Check if columns already exist
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('computer_group')]
            
            if 'allow_wake' not in columns or 'allow_shutdown' not in columns:
                print("Adding action permission columns to computer_group table...")
                
                # Add columns with default values
                with db.engine.connect() as conn:
                    if 'allow_wake' not in columns:
                        conn.execute(db.text(
                            "ALTER TABLE computer_group ADD COLUMN allow_wake BOOLEAN DEFAULT TRUE"
                        ))
                        conn.commit()
                        print("✓ Added allow_wake column")
                    
                    if 'allow_shutdown' not in columns:
                        conn.execute(db.text(
                            "ALTER TABLE computer_group ADD COLUMN allow_shutdown BOOLEAN DEFAULT TRUE"
                        ))
                        conn.commit()
                        print("✓ Added allow_shutdown column")
                
                print("✅ Migration completed successfully!")
            else:
                print("✓ Columns already exist, no migration needed.")
                
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == '__main__':
    migrate()
