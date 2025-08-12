// Management Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Management page loaded');
    
    // Show verification modal immediately when page loads
    showVerificationModal();
    
    // Initialize event listeners
    initializeEventListeners();
});

// Global variables
let isVerified = false;
let verificationAttempts = 0;
const MAX_ATTEMPTS = 3;

// Show verification modal
function showVerificationModal() {
    const modal = document.getElementById('verificationModal');
    modal.classList.add('show');
    
    // Focus on username input
    setTimeout(() => {
        document.getElementById('verificationUsername').focus();
    }, 300);
}

// Hide verification modal
function hideVerificationModal() {
    const modal = document.getElementById('verificationModal');
    modal.classList.remove('show');
    isVerified = true;
}

// Cancel verification and redirect
function cancelVerification() {
    alert('Access denied. Redirecting to dashboard.');
    window.location.href = 'dashboard.html';
}

// Initialize event listeners
function initializeEventListeners() {
    // Verification form submission
    const verificationForm = document.getElementById('verificationForm');
    if (verificationForm) {
        verificationForm.addEventListener('submit', handleVerification);
    }
    
    // Enter key on verification inputs
    const verificationInputs = document.querySelectorAll('.verification-input');
    verificationInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleVerification(e);
            }
        });
    });
    
    // Escape key to cancel verification
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !isVerified) {
            cancelVerification();
        }
    });
}

// Handle verification form submission
function handleVerification(e) {
    e.preventDefault();
    
    const username = document.getElementById('verificationUsername').value.trim();
    const password = document.getElementById('verificationPassword').value;
    const errorMessage = document.getElementById('errorMessage');
    
    // Clear previous error
    errorMessage.style.display = 'none';
    
    // Basic validation
    if (!username || !password) {
        showError('Please enter both username and password.');
        return;
    }
    
    // Increment attempts
    verificationAttempts++;
    
    // Verify credentials (this would typically call your backend API)
    verifyCredentials(username, password)
        .then(success => {
            if (success) {
                hideVerificationModal();
                showSuccessMessage('Access granted! Welcome to the Management Center.');
            } else {
                if (verificationAttempts >= MAX_ATTEMPTS) {
                    showError('Maximum attempts reached. Access denied.');
                    setTimeout(() => {
                        cancelVerification();
                    }, 2000);
                } else {
                    showError(`Invalid credentials. ${MAX_ATTEMPTS - verificationAttempts} attempts remaining.`);
                    document.getElementById('verificationPassword').value = '';
                    document.getElementById('verificationPassword').focus();
                }
            }
        })
        .catch(error => {
            console.error('Verification error:', error);
            showError('An error occurred during verification. Please try again.');
        });
}

// Verify credentials against backend
async function verifyCredentials(username, password) {
    try {
        // Get current user info from localStorage
        const currentUser = localStorage.getItem('username');
        const currentRole = localStorage.getItem('role');
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        
        // Check if the current user is admin or manager
        if (!isAdmin && currentRole !== 'manager') {
            return false;
        }
        
        // For demo purposes, accept the current user's credentials
        // In production, you would make an API call to verify
        if (username === currentUser) {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 500));
            return true;
        }
        
        // Additional verification logic can be added here
        // For now, we'll accept any username if the current user has proper role
        return isAdmin || currentRole === 'manager';
        
    } catch (error) {
        console.error('Credential verification error:', error);
        return false;
    }
}

// Show error message
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Show success message
function showSuccessMessage(message) {
    // Create a temporary success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Management card functions
function openUserManagement() {
    if (!isVerified) {
        showError('Please complete verification first.');
        return;
    }
    // Navigate to user management page
    window.location.href = 'users.html';
}

function openLocationManagement() {
    if (!isVerified) {
        showError('Please complete verification first.');
        return;
    }
    // Navigate to location management page
    window.location.href = 'locations.html';
}

function openEmailsManagement() {
    if (!isVerified) {
        showError('Please complete verification first.');
        return;
    }
    // Navigate to emails management page
    window.location.href = 'emails.html';
}

function openSystemSettings() {
    if (!isVerified) {
        showError('Please complete verification first.');
        return;
    }
    // Navigate to system settings page or show settings modal
    alert('System Settings feature coming soon!');
    // window.location.href = 'system-settings.html';
}

function openSecuritySettings() {
    if (!isVerified) {
        showError('Please complete verification first.');
        return;
    }
    // Navigate to security settings page or show security modal
    alert('Security Settings feature coming soon!');
    // window.location.href = 'security-settings.html';
}

function openDataManagement() {
    if (!isVerified) {
        showError('Please complete verification first.');
        return;
    }
    // Navigate to data management page or show data modal
    alert('Data Management feature coming soon!');
    // window.location.href = 'data-management.html';
}

function openReportsCenter() {
    if (!isVerified) {
        showError('Please complete verification first.');
        return;
    }
    // Navigate to reports center page
    window.location.href = 'analytics.html';
}

// Logout function
function logout() {
    // Clear localStorage
    localStorage.removeItem('username');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('role');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('locationCode');
    localStorage.removeItem('location_username');
    localStorage.removeItem('location_name');
    localStorage.removeItem('location_id');
    
    // Redirect to login page
    window.location.href = 'index.html';
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Prevent access to management functions without verification
document.addEventListener('click', function(e) {
    if (e.target.closest('.management-card') && !isVerified) {
        e.preventDefault();
        e.stopPropagation();
        showError('Please complete verification first.');
        showVerificationModal();
    }
});

// Add loading state to verification button
function setVerificationLoading(loading) {
    const submitBtn = document.querySelector('.verification-btn.primary');
    if (loading) {
        submitBtn.textContent = 'Verifying...';
        submitBtn.disabled = true;
    } else {
        submitBtn.textContent = 'Verify Access';
        submitBtn.disabled = false;
    }
}

// Enhanced verification with loading state
async function handleVerification(e) {
    e.preventDefault();
    
    const username = document.getElementById('verificationUsername').value.trim();
    const password = document.getElementById('verificationPassword').value;
    const errorMessage = document.getElementById('errorMessage');
    
    // Clear previous error
    errorMessage.style.display = 'none';
    
    // Basic validation
    if (!username || !password) {
        showError('Please enter both username and password.');
        return;
    }
    
    // Increment attempts
    verificationAttempts++;
    
    // Show loading state
    setVerificationLoading(true);
    
    try {
        // Verify credentials
        const success = await verifyCredentials(username, password);
        
        if (success) {
            hideVerificationModal();
            showSuccessMessage('Access granted! Welcome to the Management Center.');
        } else {
            if (verificationAttempts >= MAX_ATTEMPTS) {
                showError('Maximum attempts reached. Access denied.');
                setTimeout(() => {
                    cancelVerification();
                }, 2000);
            } else {
                showError(`Invalid credentials. ${MAX_ATTEMPTS - verificationAttempts} attempts remaining.`);
                document.getElementById('verificationPassword').value = '';
                document.getElementById('verificationPassword').focus();
            }
        }
    } catch (error) {
        console.error('Verification error:', error);
        showError('An error occurred during verification. Please try again.');
    } finally {
        // Hide loading state
        setVerificationLoading(false);
    }
}

console.log('Management JavaScript loaded successfully');
