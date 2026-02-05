import socket
import struct
import platform
import subprocess
import paramiko
from typing import Tuple

def check_host_status_tcp(ip_address: str, port: int = 445, timeout: float = 0.3) -> bool:
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
    sock = None
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip_address, port))
        return result == 0
    except Exception:
        return False
    finally:
        if sock:
            try:
                sock.close()
            except Exception:
                pass

def check_host_status(ip_address: str, timeout: float = 0.5) -> Tuple[bool, str]:
    """
    Check if a host is online using multiple methods:
    1. TCP port check (multiple ports) - works even when ICMP is blocked
    2. Fallback to ping if TCP fails
    
    Args:
        ip_address: IP address to check
        timeout: Timeout in seconds per port (default 0.5)
    
    Returns:
        Tuple: (is_online: bool, status: str)
    """
    if not ip_address:
        return False, 'unknown'
    
    try:
        # Try only most reliable ports - quick check
        ports_to_check = [
            # 445,   # SMB - File sharing (most reliable)
            3389,  # RDP - Remote Desktop (works even on lock screen)
        ]
        
        # Check each port with short timeout
        for port in ports_to_check:
            if check_host_status_tcp(ip_address, port, timeout):
                return True, 'online'
        
        # Fallback to ping with short timeout
        # Determine ping parameters based on OS
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        timeout_param = '-w' if platform.system().lower() == 'windows' else '-W'
        
        # Ping command: send 1 packet with timeout (1 second max)
        ping_timeout = 1
        command = ['ping', param, '1', timeout_param, str(ping_timeout * 1000 if platform.system().lower() == 'windows' else ping_timeout), ip_address]
        
        # Execute ping
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=ping_timeout + 0.5
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

def detect_os_type(ip_address: str, timeout: int = 2) -> str:
    """
    Detect OS type by checking open ports
    
    Args:
        ip_address: IP address to check
        timeout: Timeout in seconds
    
    Returns:
        'windows', 'linux', or 'unknown'
    """
    if not ip_address:
        return 'unknown'
    
    try:
        # Windows-specific ports
        windows_ports = [3389, 445, 139, 135]  # RDP, SMB, NetBIOS, RPC
        # Linux-specific ports  
        linux_ports = [22]  # SSH (common on Linux)
        
        windows_score = 0
        linux_score = 0
        
        # Check Windows ports
        for port in windows_ports:
            if check_host_status_tcp(ip_address, port, timeout):
                windows_score += 1
        
        # Check Linux ports
        for port in linux_ports:
            if check_host_status_tcp(ip_address, port, timeout):
                linux_score += 1
        
        # Determine OS based on scores
        if windows_score > 0:
            return 'windows'
        elif linux_score > 0 and windows_score == 0:
            return 'linux'
        else:
            return 'unknown'
    
    except Exception as e:
        return 'unknown'

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

def shutdown_computer_ssh(host: str, username: str, password: str, port: int = 22, os_type: str = 'windows') -> Tuple[bool, str]:
    """
    Shutdown a remote computer via SSH
    
    Args:
        host: IP address or hostname
        username: SSH username
        password: SSH password
        port: SSH port (default 22)
        os_type: 'windows' or 'linux' (default 'windows')
    
    Returns:
        Tuple: (success: bool, message: str)
    """
    if not host or not username or not password:
        return False, "SSH credentials are not configured for this computer"
    
    client = None
    try:
        # Create SSH client
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        # Connect with timeout
        client.connect(
            hostname=host,
            port=port,
            username=username,
            password=password,
            timeout=10,
            look_for_keys=False,
            allow_agent=False
        )
        
        # Determine shutdown command based on OS
        if os_type.lower() == 'windows':
            shutdown_cmd = 'shutdown /s /t 0 /f'  # Immediate forced shutdown
        else:  # linux/unix
            shutdown_cmd = 'sudo shutdown -h now'
        
        # Execute shutdown command
        stdin, stdout, stderr = client.exec_command(shutdown_cmd, timeout=5)
        
        # Check for errors
        error = stderr.read().decode('utf-8').strip()
        if error and 'shutdown' not in error.lower():
            return False, f"Shutdown command failed: {error}"
        
        return True, f"Shutdown command sent successfully to {host}"
        
    except paramiko.AuthenticationException:
        return False, "SSH authentication failed. Check username and password."
    except paramiko.SSHException as e:
        return False, f"SSH connection failed: {str(e)}"
    except socket.timeout:
        return False, "SSH connection timed out"
    except Exception as e:
        return False, f"Error: {str(e)}"
    finally:
        if client:
            try:
                client.close()
            except:
                pass
