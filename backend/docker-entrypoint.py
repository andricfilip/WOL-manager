#!/usr/bin/env python3
"""
Docker entrypoint script - handles database initialization and migrations
"""

import sys
import os
import time
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import OperationalError

def wait_for_db(database_url, max_retries=30):
    """Wait for database to be ready"""
    print("Waiting for database to be ready...")
    
    for i in range(max_retries):
        try:
            engine = create_engine(database_url)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("✓ Database is ready!")
            return True
        except OperationalError:
            print(f"Database not ready yet... ({i+1}/{max_retries})")
            time.sleep(2)
    
    print("✗ Database failed to become ready")
    return False

def create_admin_if_needed():
    """Create admin user if doesn't exist"""
    print("\n" + "="*60)
    print("Checking admin user...")
    print("="*60)
    
    try:
        # Import here to avoid circular imports
        sys.path.insert(0, os.path.dirname(__file__))
        from app import app, db
        from models import User
        
        with app.app_context():
            # Check if admin exists
            existing_admin = User.query.filter_by(username='admin').first()
            if not existing_admin:
                print("\n➜ Creating default admin user...")
                admin = User(
                    username='admin',
                    email='admin@example.com',
                    is_admin=True
                )
                admin.set_password('admin123')
                db.session.add(admin)
                db.session.commit()
                print("✓ Admin user created!")
                print("   Username: admin")
                print("   Password: admin123")
                print("   ⚠️  Change password after first login!")
            else:
                print("✓ Admin user already exists")
        
        return True
        
    except Exception as e:
        print(f"\n⚠️  Could not create admin user: {e}")
        print("You can create it manually later")
        return True  # Don't fail startup

def run_migrations(database_url):
    """Run database migrations"""
    print("\n" + "="*60)
    print("Running database migrations...")
    print("="*60)
    
    try:
        engine = create_engine(database_url)
        inspector = inspect(engine)
        
        # Check if computer table exists
        if 'computer' not in inspector.get_table_names():
            print("Database tables don't exist yet - will be created by app.py")
            return True
        
        # Check existing columns
        columns = [col['name'] for col in inspector.get_columns('computer')]
        print(f"Existing columns in 'computer' table: {columns}")
        
        needs_migration = False
        
        # Add status column if missing
        if 'status' not in columns:
            print("\n➜ Adding 'status' column...")
            with engine.connect() as conn:
                conn.execute(text(
                    "ALTER TABLE computer ADD COLUMN status VARCHAR(20) DEFAULT 'unknown'"
                ))
                conn.commit()
            print("✓ 'status' column added")
            needs_migration = True
        else:
            print("✓ 'status' column already exists")
        
        # Add last_checked column if missing
        if 'last_checked' not in columns:
            print("\n➜ Adding 'last_checked' column...")
            with engine.connect() as conn:
                conn.execute(text(
                    "ALTER TABLE computer ADD COLUMN last_checked TIMESTAMP"
                ))
                conn.commit()
            print("✓ 'last_checked' column added")
            needs_migration = True
        else:
            print("✓ 'last_checked' column already exists")
        
        # Add last_shutdown column if missing
        if 'last_shutdown' not in columns:
            print("\n➜ Adding 'last_shutdown' column...")
            with engine.connect() as conn:
                conn.execute(text(
                    "ALTER TABLE computer ADD COLUMN last_shutdown TIMESTAMP"
                ))
                conn.commit()
            print("✓ 'last_shutdown' column added")
            needs_migration = True
        else:
            print("✓ 'last_shutdown' column already exists")
        
        # Add SSH columns if missing
        ssh_columns = ['ssh_host', 'ssh_port', 'ssh_username', 'ssh_password']
        for col_name in ssh_columns:
            if col_name not in columns:
                print(f"\n➜ Adding '{col_name}' column...")
                with engine.connect() as conn:
                    if col_name == 'ssh_port':
                        conn.execute(text(
                            f"ALTER TABLE computer ADD COLUMN {col_name} INTEGER DEFAULT 22"
                        ))
                    elif col_name == 'ssh_password':
                        conn.execute(text(
                            f"ALTER TABLE computer ADD COLUMN {col_name} VARCHAR(500)"
                        ))
                    else:
                        conn.execute(text(
                            f"ALTER TABLE computer ADD COLUMN {col_name} VARCHAR(255)"
                        ))
                    conn.commit()
                print(f"✓ '{col_name}' column added")
                needs_migration = True
            else:
                print(f"✓ '{col_name}' column already exists")
        
        # Add os_type column if missing
        if 'os_type' not in columns:
            print("\n➜ Adding 'os_type' column...")
            with engine.connect() as conn:
                conn.execute(text(
                    "ALTER TABLE computer ADD COLUMN os_type VARCHAR(20) DEFAULT 'linux'"
                ))
                conn.commit()
            print("✓ 'os_type' column added")
            needs_migration = True
        else:
            print("✓ 'os_type' column already exists")
        
        # Create computer_group table if missing
        if 'computer_group' not in inspector.get_table_names():
            print("\n➜ Creating 'computer_group' table...")
            with engine.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE computer_group (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(120) UNIQUE NOT NULL,
                        description VARCHAR(500),
                        color VARCHAR(7) DEFAULT '#0066cc',
                        icon VARCHAR(50) DEFAULT 'fas fa-folder',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                conn.commit()
            print("✓ 'computer_group' table created")
            needs_migration = True
        else:
            print("✓ 'computer_group' table already exists")
        
        # Create group_computers M2M table if missing
        if 'group_computers' not in inspector.get_table_names():
            print("\n➜ Creating 'group_computers' table...")
            with engine.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE group_computers (
                        group_id INTEGER REFERENCES computer_group(id),
                        computer_id INTEGER REFERENCES computer(id),
                        PRIMARY KEY (group_id, computer_id)
                    )
                """))
                conn.commit()
            print("✓ 'group_computers' table created")
            needs_migration = True
        else:
            print("✓ 'group_computers' table already exists")
        
        # Create uptime_log table if missing
        if 'uptime_log' not in inspector.get_table_names():
            print("\n➜ Creating 'uptime_log' table...")
            with engine.connect() as conn:
                conn.execute(text("""
                    CREATE TABLE uptime_log (
                        id SERIAL PRIMARY KEY,
                        computer_id INTEGER NOT NULL REFERENCES computer(id),
                        status VARCHAR(20) NOT NULL,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                conn.execute(text(
                    "CREATE INDEX ix_uptime_log_computer_id ON uptime_log (computer_id)"
                ))
                conn.execute(text(
                    "CREATE INDEX ix_uptime_log_timestamp ON uptime_log (timestamp)"
                ))
                conn.commit()
            print("✓ 'uptime_log' table created")
            needs_migration = True
        else:
            print("✓ 'uptime_log' table already exists")
        
        if needs_migration:
            print("\n✓ Database migration completed successfully!")
        else:
            print("\n✓ Database is already up to date!")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Migration error: {e}")
        print("This is not critical - app will continue anyway")
        return True  # Don't fail startup on migration errors

def main():
    """Main entrypoint function"""
    print("\n" + "="*60)
    print("WOL Manager - Docker Entrypoint")
    print("="*60 + "\n")
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("✗ DATABASE_URL not set!")
        sys.exit(1)
    
    print(f"Database: {database_url.split('@')[1] if '@' in database_url else 'configured'}")
    
    # Wait for database
    if not wait_for_db(database_url):
        print("\n✗ Failed to connect to database")
        sys.exit(1)
    
    # Run migrations
    run_migrations(database_url)
    
    # Create admin user if needed
    create_admin_if_needed()
    
    print("\n" + "="*60)
    print("Starting Flask application...")
    print("="*60 + "\n")
    
    # Start the Flask app
    os.execvp('python', ['python', 'app.py'])

if __name__ == '__main__':
    main()
