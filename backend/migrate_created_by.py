#!/usr/bin/env python3
"""
Migration script to add created_by_id column to Computer model
Adds: created_by_id, created_by foreign key relationship
"""
from app import app
from models import db

def migrate():
    with app.app_context():
        try:
            # Check if column already exists
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('computer')]
            
            if 'created_by_id' not in columns:
                print("Adding created_by_id column to computer table...")
                
                # Add column with default NULL
                with db.engine.connect() as conn:
                    conn.execute(db.text(
                        "ALTER TABLE computer ADD COLUMN created_by_id INTEGER"
                    ))
                    conn.execute(db.text(
                        "ALTER TABLE computer ADD CONSTRAINT fk_computer_created_by_id FOREIGN KEY (created_by_id) REFERENCES \"user\"(id)"
                    ))
                    conn.commit()
                    print("✓ Added created_by_id column")
                    print("✓ Added foreign key constraint")
                
                print("✅ Migration completed successfully!")
            else:
                print("✓ Column already exists, no migration needed.")
                
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == '__main__':
    migrate()
