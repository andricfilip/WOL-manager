"""
Encryption module for sensitive data
Provides secure encryption/decryption for SSH credentials and other sensitive information
"""

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import os
import base64
import logging

logger = logging.getLogger(__name__)


class EncryptionManager:
    """Manages encryption and decryption of sensitive data"""
    
    def __init__(self, secret_key: str = None, salt: str = None):
        """
        Initialize encryption manager
        
        Args:
            secret_key: Master encryption key from environment
            salt: Salt for key derivation
        """
        self.secret_key = secret_key or os.getenv('ENCRYPTION_KEY')
        self.salt = salt or os.getenv('ENCRYPTION_SALT', 'WOL-Manager-Salt-2026')
        
        if not self.secret_key:
            raise ValueError(
                "ENCRYPTION_KEY not set! Generate one with: "
                "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        
        self._cipher = self._create_cipher()
    
    def _create_cipher(self) -> Fernet:
        """Create Fernet cipher with derived key"""
        # Derive a key from the secret using PBKDF2
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self.salt.encode(),
            iterations=100000,
            backend=default_backend()
        )
        
        # Generate key from secret
        key = base64.urlsafe_b64encode(kdf.derive(self.secret_key.encode()))
        return Fernet(key)
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext string
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Base64 encoded encrypted string
        """
        if not plaintext:
            return None
        
        try:
            encrypted_bytes = self._cipher.encrypt(plaintext.encode('utf-8'))
            return encrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise
    
    def decrypt(self, encrypted_text: str) -> str:
        """
        Decrypt encrypted string
        
        Args:
            encrypted_text: Base64 encoded encrypted string
            
        Returns:
            Decrypted plaintext string
        """
        if not encrypted_text:
            return None
        
        try:
            decrypted_bytes = self._cipher.decrypt(encrypted_text.encode('utf-8'))
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            # Return None on decryption failure (invalid key or corrupted data)
            return None
    
    def encrypt_dict(self, data: dict) -> dict:
        """
        Encrypt all string values in a dictionary
        
        Args:
            data: Dictionary with string values
            
        Returns:
            Dictionary with encrypted values
        """
        return {
            key: self.encrypt(value) if isinstance(value, str) else value
            for key, value in data.items()
        }
    
    def decrypt_dict(self, data: dict) -> dict:
        """
        Decrypt all string values in a dictionary
        
        Args:
            data: Dictionary with encrypted values
            
        Returns:
            Dictionary with decrypted values
        """
        return {
            key: self.decrypt(value) if isinstance(value, str) else value
            for key, value in data.items()
        }


# Global encryption manager instance
_encryption_manager = None


def get_encryption_manager() -> EncryptionManager:
    """Get or create global encryption manager instance"""
    global _encryption_manager
    if _encryption_manager is None:
        _encryption_manager = EncryptionManager()
    return _encryption_manager


def encrypt_password(password: str) -> str:
    """
    Encrypt password
    
    Args:
        password: Plain text password
        
    Returns:
        Encrypted password string
    """
    if not password:
        return None
    return get_encryption_manager().encrypt(password)


def decrypt_password(encrypted_password: str) -> str:
    """
    Decrypt password
    
    Args:
        encrypted_password: Encrypted password string
        
    Returns:
        Plain text password
    """
    if not encrypted_password:
        return None
    return get_encryption_manager().decrypt(encrypted_password)


def generate_encryption_key() -> str:
    """
    Generate a new encryption key
    
    Returns:
        Base64 encoded encryption key
    """
    return Fernet.generate_key().decode()


def verify_encryption_setup() -> bool:
    """
    Verify that encryption is properly configured
    
    Returns:
        True if encryption is working correctly
    """
    try:
        manager = get_encryption_manager()
        test_string = "test_encryption_12345"
        encrypted = manager.encrypt(test_string)
        decrypted = manager.decrypt(encrypted)
        return decrypted == test_string
    except Exception as e:
        logger.error(f"Encryption verification failed: {e}")
        return False


if __name__ == '__main__':
    # Test encryption
    print("Testing encryption module...")
    print(f"Generated key: {generate_encryption_key()}")
    
    # Test with a sample password
    os.environ['ENCRYPTION_KEY'] = generate_encryption_key()
    
    test_password = "MySecretPassword123!"
    print(f"\nOriginal: {test_password}")
    
    encrypted = encrypt_password(test_password)
    print(f"Encrypted: {encrypted}")
    
    decrypted = decrypt_password(encrypted)
    print(f"Decrypted: {decrypted}")
    
    print(f"\nVerification: {verify_encryption_setup()}")
    print(f"Match: {test_password == decrypted}")
