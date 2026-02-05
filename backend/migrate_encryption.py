#!/usr/bin/env python3
"""
Migration script for WOL Manager v2.0 Security Update

This script migrates existing plaintext SSH passwords to encrypted format.
Run this ONCE after upgrading to v2.0.

Usage:
    python migrate_encryption.py

Requirements:
    - ENCRYPTION_KEY must be set in environment or .env file
    - Database must be accessible
    - Backup your database before running!
"""

import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, Computer
from encryption import encrypt_password, decrypt_password, verify_encryption_setup


def backup_database():
    """Create a backup timestamp file"""
    backup_file = f'backup_before_encryption_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
    with open(backup_file, 'w') as f:
        f.write(f"Database backup created at {datetime.now()}\n")
        f.write("This is a marker file. Actual PostgreSQL backup should be done separately.\n")
        f.write("\nTo backup PostgreSQL:\n")
        f.write("docker exec -t wol-manager-postgres-1 pg_dump -U wol_user wol_db > backup.sql\n")
    print(f"✓ Backup marker created: {backup_file}")
    print("⚠️  Don't forget to backup PostgreSQL database!")
    return backup_file


def check_encryption_key():
    """Verify encryption key is configured"""
    if not os.getenv('ENCRYPTION_KEY'):
        print("\n❌ ERROR: ENCRYPTION_KEY not set!")
        print("\nGenerate a key with:")
        print("  python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"")
        print("\nThen set it in docker-compose.yml:")
        print("  environment:")
        print("    - ENCRYPTION_KEY=your-generated-key-here")
        return False
    
    if not verify_encryption_setup():
        print("\n❌ ERROR: Encryption verification failed!")
        print("Check that ENCRYPTION_KEY is properly formatted.")
        return False
    
    print("✓ Encryption key verified")
    return True


def migrate_passwords():
    """Migrate plaintext passwords to encrypted format"""
    with app.app_context():
        computers = Computer.query.all()
        
        if not computers:
            print("\n✓ No computers found in database. Nothing to migrate.")
            return 0
        
        migrated = 0
        already_encrypted = 0
        no_password = 0
        
        print(f"\nFound {len(computers)} computers in database")
        print("Checking passwords...\n")
        
        for computer in computers:
            try:
                # Try to access the password through the property
                # If it's already encrypted, this will decrypt it successfully
                current_password = computer.ssh_password
                
                if not current_password:
                    no_password += 1
                    print(f"  - {computer.name}: No SSH password configured")
                    continue
                
                # Check if password is already encrypted
                # Encrypted passwords are much longer (base64 encoded)
                if computer._ssh_password_encrypted and len(computer._ssh_password_encrypted) > 100:
                    # Try to decrypt - if successful, it's already encrypted
                    test_decrypt = decrypt_password(computer._ssh_password_encrypted)
                    if test_decrypt:
                        already_encrypted += 1
                        print(f"  ✓ {computer.name}: Already encrypted")
                        continue
                
                # Password needs encryption
                # The setter will automatically encrypt it
                computer.ssh_password = current_password
                migrated += 1
                print(f"  → {computer.name}: Encrypted")
                
            except Exception as e:
                print(f"  ✗ {computer.name}: Error - {str(e)}")
        
        # Commit changes
        if migrated > 0:
            db.session.commit()
            print(f"\n✓ Successfully encrypted {migrated} passwords")
        
        if already_encrypted > 0:
            print(f"✓ {already_encrypted} passwords were already encrypted")
        
        if no_password > 0:
            print(f"ℹ️  {no_password} computers have no SSH password configured")
        
        return migrated


def verify_migration():
    """Verify that migration was successful"""
    with app.app_context():
        computers = Computer.query.filter(Computer._ssh_password_encrypted.isnot(None)).all()
        
        if not computers:
            print("\n✓ No passwords to verify")
            return True
        
        print(f"\nVerifying {len(computers)} encrypted passwords...")
        
        all_ok = True
        for computer in computers:
            try:
                # Try to decrypt
                decrypted = computer.ssh_password
                if decrypted:
                    print(f"  ✓ {computer.name}: Decryption OK")
                else:
                    print(f"  ✗ {computer.name}: Decryption failed")
                    all_ok = False
            except Exception as e:
                print(f"  ✗ {computer.name}: Error - {str(e)}")
                all_ok = False
        
        return all_ok


def main():
    """Main migration function"""
    print("=" * 60)
    print("WOL Manager v2.0 - Encryption Migration Script")
    print("=" * 60)
    print()
    
    # Step 1: Check encryption key
    print("Step 1: Checking encryption configuration...")
    if not check_encryption_key():
        sys.exit(1)
    print()
    
    # Step 2: Backup reminder
    print("Step 2: Creating backup marker...")
    backup_database()
    print()
    
    # Step 3: Confirm
    response = input("\n⚠️  Ready to migrate passwords? Type 'YES' to continue: ")
    if response != 'YES':
        print("Migration cancelled.")
        sys.exit(0)
    print()
    
    # Step 4: Migrate
    print("Step 3: Migrating passwords...")
    migrated_count = migrate_passwords()
    print()
    
    # Step 5: Verify
    print("Step 4: Verifying migration...")
    if verify_migration():
        print("\n" + "=" * 60)
        print("✓ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print()
        print("Next steps:")
        print("1. Restart Docker containers: docker-compose restart")
        print("2. Test SSH shutdown functionality")
        print("3. Check audit logs for any issues")
        print()
        return 0
    else:
        print("\n" + "=" * 60)
        print("⚠️  MIGRATION COMPLETED WITH WARNINGS")
        print("=" * 60)
        print()
        print("Some passwords could not be verified.")
        print("Check the output above for details.")
        print()
        return 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nMigration cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
