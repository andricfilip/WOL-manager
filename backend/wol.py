import socket
import struct
import platform
import subprocess
from typing import Tuple

def check_host_status_tcp(ip_address: str, port: int = 445, timeout: int = 1) -> bool:
    """
    Check if a host is online using TCP port check (SMB port 445)
    Works better than ping when ICMP is blocked by firewall
    
    Args:
        ip_address: IP address to check
        port: TCP port to check (default 445 - SMB)
        timeout: Timeout in seconds
    
    Returns:
        bool: True if port is open (host is online)
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip_address, port))
        sock.close()
        return result == 0
    except:
        return False

def check_host_status(ip_address: str, timeout: int = 2) -> Tuple[bool, str]:
    """
    Check if a host is online using multiple methods:
    1. TCP port check (multiple ports) - works even when ICMP is blocked
    2. Fallback to ping if TCP fails
    
    Args:
        ip_address: IP address to check
        timeout: Timeout in seconds (default 2)
    
    Returns:
        Tuple: (is_online: bool, status: str)
    """
    if not ip_address:
        return False, 'unknown'
    
    try:
        # Try multiple TCP ports - Windows services that are usually running
        ports_to_check = [
            445,   # SMB - File sharing (most reliable)
            3389,  # RDP - Remote Desktop (works even on lock screen)
            135,   # RPC - Windows RPC
            139,   # NetBIOS - Legacy file sharing
        ]
        
        # Check each port
        for port in ports_to_check:
            if check_host_status_tcp(ip_address, port, timeout):
                return True, 'online'
        
        # Fallback to ping
        # Determine ping parameters based on OS
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        timeout_param = '-w' if platform.system().lower() == 'windows' else '-W'
        
        # Ping command: send 1 packet with timeout
        command = ['ping', param, '1', timeout_param, str(timeout * 1000 if platform.system().lower() == 'windows' else timeout), ip_address]
        
        # Execute ping
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout + 1
        )
        
        # Check if ping was successful
        if result.returncode == 0:
            return True, 'online'
        else:
            return False, 'offline'
    
    except subprocess.TimeoutExpired:
        return False, 'offline'
    except Exception as e:
        return False, 'unknown'

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
