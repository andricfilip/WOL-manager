#!/usr/bin/env python3
"""
Migration script to add user_computer_preference table
Stores per-user SSH auto-login preference per computer
"""
from app import app
from models import db

def migrate():
    with app.app_context():
        try:
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()

            if 'user_computer_preference' not in tables:
                print("Creating user_computer_preference table...")
                with db.engine.connect() as conn:
                    conn.execute(db.text(
                        """
                        CREATE TABLE user_computer_preference (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER NOT NULL REFERENCES \"user\"(id),
                            computer_id INTEGER NOT NULL REFERENCES computer(id),
                            ssh_auto_login BOOLEAN NOT NULL DEFAULT FALSE,
                            updated_at TIMESTAMP DEFAULT NOW(),
                            CONSTRAINT uq_user_computer_pref UNIQUE (user_id, computer_id)
                        )
                        """
                    ))
                    conn.commit()
                print("✓ Table created")
            else:
                print("✓ Table already exists, no migration needed.")

        except Exception as e:
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == '__main__':
    migrate()
