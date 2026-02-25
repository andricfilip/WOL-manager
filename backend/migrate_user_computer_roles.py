#!/usr/bin/env python3
"""
Migration script to add role column to user_computer_preference table
"""
from app import app
from models import db

def migrate():
    with app.app_context():
        try:
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('user_computer_preference')]

            if 'role' not in columns:
                print("Adding role column to user_computer_preference...")
                with db.engine.connect() as conn:
                    conn.execute(db.text(
                        "ALTER TABLE user_computer_preference ADD COLUMN role VARCHAR(20) DEFAULT 'operator'"
                    ))
                    conn.commit()
                print("✓ role column added")
            else:
                print("✓ role column already exists")
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == '__main__':
    migrate()
