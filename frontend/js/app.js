// Utility functions
const API = {
    call: async (url, options = {}) => {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        const response = await fetch(url, { ...defaultOptions, ...options });
        
        if (!response.ok && response.status !== 400) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        return await response.json();
    },
    
    get: (url) => API.call(url),
    
    post: (url, data) => API.call(url, {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    
    delete: (url) => API.call(url, {
        method: 'DELETE'
    })
};

// ==================== WEBSOCKET CONNECTION ====================
let socket = null;
let computerStatuses = {};

function initWebSocket() {
    // Connect to WebSocket server
    socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    
    socket.on('connect', function() {
        console.log('WebSocket connected');
    });
    
    socket.on('disconnect', function() {
        console.log('WebSocket disconnected');
    });
    
    socket.on('status_update', function(data) {
        console.log('Status update:', data);
        updateComputerStatus(data.computer_id, data.status);
        computerStatuses[data.computer_id] = data.status;
    });
}

function updateComputerStatus(computerId, status) {
    // Update status badge
    const statusBadge = document.querySelector(`[data-status-badge="${computerId}"]`);
    if (statusBadge) {
        statusBadge.className = 'status-badge status-' + status;
        statusBadge.textContent = status === 'online' ? '🟢 Online' : 
                                   status === 'offline' ? '🔴 Offline' : '⚪ Unknown';
    }
    
    // Update button states
    const wakeBtn = document.querySelector(`[data-wake-btn="${computerId}"]`);
    const shutdownBtn = document.querySelector(`[data-shutdown-btn="${computerId}"]`);
    
    if (wakeBtn && shutdownBtn) {
        if (status === 'online') {
            wakeBtn.disabled = true;
            wakeBtn.classList.add('btn-disabled');
            shutdownBtn.disabled = false;
            shutdownBtn.classList.remove('btn-disabled');
        } else {
            wakeBtn.disabled = false;
            wakeBtn.classList.remove('btn-disabled');
            shutdownBtn.disabled = true;
            shutdownBtn.classList.add('btn-disabled');
        }
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-error',
        'info': 'alert-info',
        'warning': 'alert-warning'
    }[type] || 'alert-info';
    
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass}`;
    alert.textContent = message;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.maxWidth = '400px';
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

// WOL Button Handler
function setupWOLButtons() {
    const wolButtons = document.querySelectorAll('[data-wol-btn]');
    
    wolButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const computerId = button.dataset.computerId;
            const computerName = button.dataset.computerName;
            
            button.disabled = true;
            button.innerHTML = '<span class="spinner"></span> Sending...';
            
            try {
                const result = await API.post('/dashboard', {
                    computer_id: computerId
                });
                
                if (result.success) {
                    showNotification(`WOL packet sent to ${computerName}!`, 'success');
                } else {
                    showNotification(`Error: ${result.message}`, 'error');
                }
            } catch (error) {
                showNotification(`Error: ${error.message}`, 'error');
            } finally {
                button.disabled = false;
                button.innerHTML = '🔌 Wake Up';
            }
        });
    });
}

// Shutdown Button Handler
function setupShutdownButtons() {
    const shutdownButtons = document.querySelectorAll('[data-shutdown-btn]');
    
    shutdownButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const computerId = button.dataset.computerId;
            const computerName = button.dataset.computerName;
            
            if (!confirm(`Da li ste sigurni da želite da ugasite računar "${computerName}"?`)) {
                return;
            }
            
            button.disabled = true;
            const originalHTML = button.innerHTML;
            button.innerHTML = '<span class="spinner"></span> Gašenje...';
            
            try {
                const result = await API.post('/api/shutdown', {
                    computer_id: computerId
                });
                
                if (result.success) {
                    showNotification(`Računar ${computerName} se gasi!`, 'success');
                    // Update status immediately
                    updateComputerStatus(computerId, 'offline');
                } else {
                    showNotification(`Greška: ${result.message}`, 'error');
                }
            } catch (error) {
                showNotification(`Greška: ${error.message}`, 'error');
            } finally {
                button.disabled = false;
                button.innerHTML = originalHTML;
            }
        });
    });
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Form validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return true;
    
    return form.checkValidity();
}

// Toggle admin status
async function toggleAdminStatus(userId) {
    if (!confirm('Are you sure you want to change this user\'s admin status?')) {
        return;
    }
    
    try {
        const result = await API.post(`/admin/users/${userId}/toggle-admin`, {});
        
        if (result.success) {
            showNotification(result.message, 'success');
            location.reload();
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Delete user
async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const result = await API.post(`/admin/users/${userId}/delete`, {});
        
        if (result.success) {
            showNotification(result.message, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Delete computer
async function deleteComputer(computerId, computerName) {
    if (!confirm(`Are you sure you want to delete "${computerName}"?`)) {
        return;
    }
    
    try {
        const form = new FormData();
        
        const response = await fetch(`/computers/${computerId}/delete`, {
            method: 'POST',
            body: form
        });
        
        if (response.ok) {
            showNotification(`Computer "${computerName}" deleted!`, 'success');
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification('Error deleting computer', 'error');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Change password
async function changePassword() {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!oldPassword || !newPassword || !confirmPassword) {
        showNotification('All fields are required', 'warning');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    try {
        const result = await API.post('/profile/change-password', {
            old_password: oldPassword,
            new_password: newPassword
        });
        
        if (result.success) {
            showNotification(result.message, 'success');
            document.getElementById('oldPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initWebSocket();
    setupWOLButtons();
    setupShutdownButtons();
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
});
