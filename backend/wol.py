import socket
import struct
from typing import Tuple

def create_magic_packet(mac_address: str) -> bytes:
    """
    Create a magic packet for Wake-on-LAN
    
    Args:
        mac_address: MAC address in format 'XX:XX:XX:XX:XX:XX'
    
    Returns:
        bytes: Magic packet payload
    """
    # Remove separators from MAC address
    mac_address = mac_address.replace(':', '').replace('-', '')
    
    # Check if valid MAC address
    if len(mac_address) != 12:
        raise ValueError(f"Invalid MAC address: {mac_address}")
    
    # Convert MAC address to bytes
    mac_bytes = bytes.fromhex(mac_address)
    
    # Magic packet is 6 bytes of 0xFF followed by 16 repetitions of MAC address
    magic_packet = b'\xff' * 6 + mac_bytes * 16
    
    return magic_packet

def send_wol_packet(mac_address: str, broadcast_ip: str = '192.168.5.255', port: int = 9) -> Tuple[bool, str]:
    """
    Send Wake-on-LAN packet
    
    Args:
        mac_address: MAC address of the target computer
        broadcast_ip: Broadcast IP address
        port: UDP port (default 9)
    
    Returns:
        Tuple: (success: bool, message: str)
    """
    try:
        # Create magic packet
        magic_packet = create_magic_packet(mac_address)
        
        # Create UDP socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)  # Enable broadcast
        
        # Send to specific broadcast address (local network)
        sock.sendto(magic_packet, (broadcast_ip, port))
        
        # Also try general broadcast for good measure
        try:
            sock.sendto(magic_packet, ('255.255.255.255', port))
        except:
            pass
        
        sock.close()
        
        return True, f"WOL packet sent to {broadcast_ip}:{port}"
    
    except ValueError as e:
        return False, f"Invalid MAC address: {str(e)}"
    except socket.error as e:
        return False, f"Socket error: {str(e)}"
    except Exception as e:
        return False, f"Error: {str(e)}"

def validate_mac_address(mac_address: str) -> bool:
    """
    Validate MAC address format
    
    Args:
        mac_address: MAC address to validate
    
    Returns:
        bool: True if valid, False otherwise
    """
    mac_address = mac_address.replace(':', '').replace('-', '')
    
    if len(mac_address) != 12:
        return False
    
    try:
        bytes.fromhex(mac_address)
        return True
    except ValueError:
        return False
