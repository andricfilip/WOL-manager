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

def check_host_status(ip_address: str, timeout: float = 0.3) -> Tuple[bool, str]:
    """
    Check if a host is online using multiple methods (FAST VERSION):
    1. TCP port check (3 ports with 0.3s timeout each)
    2. Fallback to ping if TCP fails
    
    Args:
        ip_address: IP address to check
        timeout: Timeout in seconds per port (default 0.3 - faster!)
    
    Returns:
        Tuple: (is_online: bool, status: str)
    """
    if not ip_address:
        return False, 'unknown'
    
    try:
        # Check only 3 most reliable ports (covers both Windows & Linux)
        # BRZA PROVERA: 0.3s po portu = max 0.9s za sve portove
        ports_to_check = [
            3389,  # RDP - Remote Desktop (Windows, works even on lock screen) - NAJPOUZDANIJI
            445,   # SMB - File sharing (Windows, very reliable)
            22,    # SSH - Linux/Unix (also Windows if OpenSSH installed)
        ]
        
        # Check each port with short timeout (max ~0.9 seconds total)
        for port in ports_to_check:
            if check_host_status_tcp(ip_address, port, timeout):
                return True, 'online'
        
        # Fallback to ping with short timeout
        # Determine ping parameters based on OS
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        timeout_param = '-w' if platform.system().lower() == 'windows' else '-W'
        
        # Ping command: BRZI ping - samo 0.5 sekundi
        ping_timeout = 0.5
        command = ['ping', param, '1', timeout_param, str(int(ping_timeout * 1000) if platform.system().lower() == 'windows' else ping_timeout), ip_address]
        
        # Execute ping
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=ping_timeout + 0.3
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

def _get_broadcast_addresses(ip_address: str = None) -> list:
    """Calculate all broadcast addresses to try for a given target IP."""
    targets = ['255.255.255.255']  # Limited broadcast — always try first

    if ip_address:
        parts = ip_address.strip().split('.')
        if len(parts) == 4:
            try:
                # Subnet-directed broadcast assuming /24 (most common home/office network)
                subnet_bcast = f"{parts[0]}.{parts[1]}.{parts[2]}.255"
                if subnet_bcast not in targets:
                    targets.append(subnet_bcast)
            except Exception:
                pass

    return targets


def send_wol_packet(mac_address: str, ip_address: str = None, broadcast_ip: str = None, port: int = 9) -> Tuple[bool, str]:
    """
    Send Wake-on-LAN magic packet.

    Args:
        mac_address: MAC address of the target computer
        ip_address:  IP address of the target (used to derive subnet broadcast)
        broadcast_ip: Override broadcast address (optional)
        port: UDP port (default 9)

    Returns:
        Tuple: (success: bool, message: str)
    """
    try:
        magic_packet = create_magic_packet(mac_address)

        # Build list of broadcast targets to try
        targets = _get_broadcast_addresses(ip_address)
        if broadcast_ip and broadcast_ip not in targets:
            targets.append(broadcast_ip)

        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

        sent_to = []
        for target in targets:
            try:
                sock.sendto(magic_packet, (target, port))
                sent_to.append(target)
            except Exception:
                pass

        sock.close()

        if sent_to:
            return True, f"WOL packet sent to: {', '.join(sent_to)}"
        return False, "Failed to send WOL packet — socket error on all broadcast addresses"

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
        try:
            stdin, stdout, stderr = client.exec_command(shutdown_cmd, timeout=5)
            
            # Try to read errors, but the connection may drop
            try:
                error = stderr.read().decode('utf-8').strip()
                if error and 'shutdown' not in error.lower():
                    return False, f"Shutdown command failed: {error}"
            except (paramiko.SSHException, socket.error, EOFError, OSError):
                # Connection dropped while reading - shutdown is working
                pass
        except (paramiko.SSHException, socket.error, EOFError, OSError):
            # Connection dropped after sending command - shutdown is working
            pass
        
        return True, f"Shutdown command sent successfully to {host}"
        
    except paramiko.AuthenticationException:
        return False, "SSH authentication failed. Check username and password."
    except paramiko.NoValidConnectionsError:
        return False, "Cannot connect to SSH server. Check host and port."
    except socket.timeout:
        return False, "SSH connection timed out"
    except socket.error as e:
        return False, f"Network error: {str(e)}"
    except paramiko.SSHException as e:
        return False, f"SSH connection failed: {str(e)}"
    except Exception as e:
        return False, f"Error: {str(e)}"
    finally:
        if client:
            try:
                client.close()
            except:
                pass
