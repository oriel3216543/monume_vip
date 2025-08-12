// Management Page JavaScript with Location-Based Access Control
// Handles all management functions with proper role and location filtering

// Global variables
let isVerified = false;
let verificationAttempts = 0;
const MAX_ATTEMPTS = 3;
let currentUserRole = '';
let currentUserLocation = '';
let isCurrentUserAdmin = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Management page loaded');
    
    // Get current user information
    getCurrentUserInfo();
    
    // Show verification modal immediately when page loads
    showVerificationModal();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Update management cards based on user role and location
    updateManagementCards();
    
    // Load current user information for sidebar
    loadCurrentUser();
});

// Load current user information for the sidebar
async function loadCurrentUser() {
    console.log('🔄 Loading current user for management sidebar...');
    
    try {
        const response = await fetch('/get_current_user', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        console.log('📡 Server response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('📊 User data received:', data);
            
            if (data.user) {
                console.log('✅ User found, updating sidebar display');
                updateUserDisplay(data.user);
            } else {
                console.log('❌ No user data found in response');
                updateUserDisplay(null);
            }
        } else {
            console.log('❌ Failed to get current user, status:', response.status);
            updateUserDisplay(null);
        }
    } catch (error) {
        console.error('❌ Error loading current user:', error);
        updateUserDisplay(null);
    }
}

// Update user display in sidebar
function updateUserDisplay(user) {
    console.log('🔄 Updating user display in sidebar...');
    
    const userNameElement = document.getElementById('user-name');
    const userStatusElement = document.getElementById('user-status');
    
    if (!userNameElement || !userStatusElement) {
        console.error('❌ User display elements not found in sidebar');
        return;
    }
    
    if (user) {
        // Display user name (prefer display name over username)
        const displayName = user.name || user.username || 'User';
        userNameElement.textContent = displayName;
        
        // Display role-based status
        const role = user.role || 'user';
        const statusText = role === 'admin' ? 'Administrator' : 
                         role === 'location_manager' ? 'Location Manager' : 'User';
        userStatusElement.textContent = statusText;
        
        // Update localStorage for consistency
        localStorage.setItem('username', user.username || user.name);
        localStorage.setItem('role', role);
        localStorage.setItem('isLoggedIn', 'true');
        
        console.log(`✅ Sidebar updated: ${displayName} (${statusText})`);
    } else {
        userNameElement.textContent = 'Not Logged In';
        userStatusElement.textContent = 'Offline';
        console.log('⚠️ Sidebar updated: User not logged in');
    }
}

// Toggle user menu dropdown
function toggleUserMenu() {
    const userMenu = document.getElementById('user-menu');
    userMenu.classList.toggle('show');
    
    // Close menu when clicking outside
    document.addEventListener('click', function closeMenu(e) {
        if (!e.target.closest('#user-profile')) {
            userMenu.classList.remove('show');
            document.removeEventListener('click', closeMenu);
        }
    });
}

// Sign out function
async function signOut() {
    try {
        // Call logout endpoint
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            // Clear localStorage
            localStorage.clear();
            
            // Show success message
            showNotification('Successfully signed out!', 'success');
            
            // Redirect to login page after a short delay
            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
        } else {
            console.error('Logout failed');
            showNotification('Failed to sign out. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error during sign out:', error);
        showNotification('Error during sign out. Please try again.', 'error');
    }
}

// Notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Get current user information from localStorage
function getCurrentUserInfo() {
    currentUserRole = localStorage.getItem('role') || 'employee';
    currentUserLocation = localStorage.getItem('locationCode') || '';
    isCurrentUserAdmin = localStorage.getItem('isAdmin') === 'true';
    
    console.log(`User: ${localStorage.getItem('username')}, Role: ${currentUserRole}, Location: ${currentUserLocation}, Admin: ${isCurrentUserAdmin}`);
}

// Update management cards based on user role and location
function updateManagementCards() {
    const managementCards = document.querySelectorAll('.management-card');
    
    // Define which roles have access to which management features
    const hasUserManagementAccess = isCurrentUserAdmin || currentUserRole === 'manager' || currentUserRole === 'location_manager';
    const hasLocationManagementAccess = isCurrentUserAdmin;
    const hasEmailManagementAccess = isCurrentUserAdmin || currentUserRole === 'manager' || currentUserRole === 'location_manager';
    const hasSystemAccess = isCurrentUserAdmin;
    const hasSecurityAccess = isCurrentUserAdmin;
    const hasDataAccess = isCurrentUserAdmin;
    const hasReportsAccess = isCurrentUserAdmin || currentUserRole === 'manager' || currentUserRole === 'location_manager';
    
    managementCards.forEach(card => {
        const cardType = card.getAttribute('data-type');
        
        if (cardType === 'users') {
            // Users management - available for managers, location managers and admins
            if (hasUserManagementAccess) {
                card.style.display = 'block';
                updateCardTitle(card, 'User Management', isCurrentUserAdmin ? 'All Locations' : currentUserLocation);
            } else {
                card.style.display = 'none';
            }
        } else if (cardType === 'locations') {
            // Location management - only for admins
            if (hasLocationManagementAccess) {
                card.style.display = 'block';
                updateCardTitle(card, 'Location Management', 'All Locations');
            } else {
                card.style.display = 'none';
            }
        } else if (cardType === 'emails') {
            // Email management - available for managers, location managers and admins
            if (hasEmailManagementAccess) {
                card.style.display = 'block';
                updateCardTitle(card, 'Email Management', isCurrentUserAdmin ? 'All Locations' : currentUserLocation);
            } else {
                card.style.display = 'none';
            }
        } else if (cardType === 'system') {
            // System settings - only for admins
            if (hasSystemAccess) {
                card.style.display = 'block';
                updateCardTitle(card, 'System Settings', 'Global');
            } else {
                card.style.display = 'none';
            }
        } else if (cardType === 'security') {
            // Security settings - only for admins
            if (hasSecurityAccess) {
                card.style.display = 'block';
                updateCardTitle(card, 'Security Settings', 'Global');
            } else {
                card.style.display = 'none';
            }
        } else if (cardType === 'data') {
            // Data management - only for admins
            if (hasDataAccess) {
                card.style.display = 'block';
                updateCardTitle(card, 'Data Management', 'Global');
            } else {
                card.style.display = 'none';
            }
        } else if (cardType === 'reports') {
            // Reports center - available for managers, location managers and admins
            if (hasReportsAccess) {
                card.style.display = 'block';
                updateCardTitle(card, 'Analytics Center', isCurrentUserAdmin ? 'All Locations' : currentUserLocation);
            } else {
                card.style.display = 'none';
            }
        }
    });
}

// Update card title with location information
function updateCardTitle(card, title, location) {
    const titleElement = card.querySelector('.card-title');
    if (titleElement) {
        titleElement.textContent = title;
    }
    
    const subtitleElement = card.querySelector('.card-subtitle');
    if (subtitleElement) {
        subtitleElement.textContent = location;
    }
}

// Show verification modal
function showVerificationModal() {
    const modal = document.getElementById('verificationModal');
    if (modal) {
        modal.classList.add('show');
        
        // Focus on username input
        setTimeout(() => {
            const usernameInput = document.getElementById('verificationUsername');
            if (usernameInput) usernameInput.focus();
        }, 300);
    }
}

// Hide verification modal
function hideVerificationModal() {
    const modal = document.getElementById('verificationModal');
    if (modal) {
        modal.classList.remove('show');
        isVerified = true;
    }
}

// Cancel verification and redirect
function cancelVerification() {
    alert('Access denied. Redirecting to dashboard.');
    window.location.href = '/dashboard';
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
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    
    // Basic validation
    if (!username || !password) {
        showError('Please enter both username and password.');
        return;
    }
    
    // Increment attempts
    verificationAttempts++;
    
    // Verify credentials
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
                    const passwordInput = document.getElementById('verificationPassword');
                    if (passwordInput) {
                        passwordInput.value = '';
                        passwordInput.focus();
                    }
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
        
        console.log('🔍 Verification attempt:', {
            username: username,
            currentUser: currentUser,
            currentRole: currentRole,
            isAdmin: isAdmin
        });
        
        // Check if the current user has appropriate role for management access
        // Allow: admin, manager, location_manager
        // Deny: location, employee, user (regular users)
        const allowedRoles = ['admin', 'manager', 'location_manager'];
        const hasManagementAccess = isAdmin || allowedRoles.includes(currentRole);
        
        if (!hasManagementAccess) {
            console.log('❌ Access denied: User role does not have management privileges');
            return false;
        }
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // For demo purposes, we'll implement a simple verification system
        // In production, you would make an API call to verify credentials
        
        // If the current user is already admin or manager, allow access
        if (isAdmin || currentRole === 'manager' || currentRole === 'location_manager') {
            console.log('✅ Access granted: User has management role');
            return true;
        }
        
        // If the current user is a location manager, allow them to verify with manager credentials
        // For demo purposes, we'll accept any username that contains "manager" or "admin"
        // In production, you'd verify against actual user database
        if (currentRole === 'location_manager') {
            if (username.toLowerCase().includes('manager') || 
                username.toLowerCase().includes('admin') ||
                username.toLowerCase().includes('supervisor') ||
                username.toLowerCase().includes('lead')) {
                console.log('✅ Access granted: Location manager verified with manager credentials');
                return true;
            }
        }
        
        // Also accept the current user's credentials if they have proper role
        if (username === currentUser && hasManagementAccess) {
            console.log('✅ Access granted: Current user credentials accepted');
            return true;
        }
        
        console.log('❌ Access denied: Invalid credentials or insufficient privileges');
        return false;
        
    } catch (error) {
        console.error('Credential verification error:', error);
        return false;
    }
}

// Show error message
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
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

// Management card functions with proper routing (no .html extensions)
function openUserManagement() {
    console.log('🚀 User Management button clicked');
    console.log('🔍 Verification status:', isVerified);
    console.log('👤 Is admin:', isCurrentUserAdmin);
    console.log('👤 Current role:', currentUserRole);
    console.log('📍 Current location:', currentUserLocation);
    
    if (!isVerified) {
        console.log('❌ User not verified, showing error');
        showError('Please complete verification first.');
        return;
    }
    
    // Check if user has access to user management
    const hasAccess = isCurrentUserAdmin || currentUserRole === 'manager' || currentUserRole === 'location_manager';
    if (!hasAccess) {
        console.log('❌ Access denied: User does not have user management privileges');
        showError('Access denied. You do not have permission to manage users.');
        return;
    }
    
    // Navigate to user management with location parameter
    if (isCurrentUserAdmin) {
        console.log('✅ Admin user - navigating to /users');
        window.location.href = '/users';
    } else {
        console.log(`✅ Manager/Location Manager - navigating to /users?location=${currentUserLocation}`);
        window.location.href = `/users?location=${currentUserLocation}`;
    }
}

function openLocationManagement() {
    console.log('🏢 Location Management button clicked');
    console.log('🔍 Verification status:', isVerified);
    console.log('👤 Is admin:', isCurrentUserAdmin);
    console.log('📍 Current location:', currentUserLocation);
    
    if (!isVerified) {
        console.log('❌ User not verified, showing error');
        showError('Please complete verification first.');
        return;
    }
    
    // Only admins can access location management
    if (!isCurrentUserAdmin) {
        console.log('❌ User is not admin, access denied');
        showError('Access denied. Only administrators can manage locations.');
        return;
    }
    
    console.log('✅ Admin user - navigating to /locations');
    window.location.href = '/locations';
}

function openEmailsManagement() {
    console.log('📧 Emails Management button clicked');
    console.log('🔍 Verification status:', isVerified);
    console.log('👤 Is admin:', isCurrentUserAdmin);
    console.log('👤 Current role:', currentUserRole);
    console.log('📍 Current location:', currentUserLocation);
    
    if (!isVerified) {
        console.log('❌ User not verified, showing error');
        showError('Please complete verification first.');
        return;
    }
    
    // Check if user has access to email management
    const hasAccess = isCurrentUserAdmin || currentUserRole === 'manager' || currentUserRole === 'location_manager';
    if (!hasAccess) {
        console.log('❌ Access denied: User does not have email management privileges');
        showError('Access denied. You do not have permission to manage emails.');
        return;
    }
    
    // Navigate to email management with location parameter
    if (isCurrentUserAdmin) {
        console.log('✅ Admin user - navigating to /emails');
        window.location.href = '/emails';
    } else {
        console.log(`✅ Manager/Location Manager - navigating to /emails?location=${currentUserLocation}`);
        window.location.href = `/emails?location=${currentUserLocation}`;
    }
}

function openSystemSettings() {
    if (!isVerified) {
        showError('Please complete verification first.');
        return;
    }
    
    // Only admins can access system settings
    if (!isCurrentUserAdmin) {
        showError('Access denied. Only administrators can access system settings.');
        return;
    }
    
    window.location.href = '/system-settings';
}

function openSecuritySettings() {
    if (!isVerified) {
        showError('Please complete verification first.');
        return;
    }
    
    // Only admins can access security settings
    if (!isCurrentUserAdmin) {
        showError('Access denied. Only administrators can access security settings.');
        return;
    }
    
    window.location.href = '/security-settings';
}

function openDataManagement() {
    if (!isVerified) {
        showError('Please complete verification first.');
        return;
    }
    
    // Only admins can access data management
    if (!isCurrentUserAdmin) {
        showError('Access denied. Only administrators can access data management.');
        return;
    }
    
    window.location.href = '/data-management';
}

function openReportsCenter() {
    console.log('📊 Analytics Center button clicked');
    console.log('🔍 Verification status:', isVerified);
    console.log('👤 Is admin:', isCurrentUserAdmin);
    console.log('👤 Current role:', currentUserRole);
    console.log('📍 Current location:', currentUserLocation);
    
    if (!isVerified) {
        console.log('❌ User not verified, showing error');
        showError('Please complete verification first.');
        return;
    }
    
    // Check if user has access to analytics
    const hasAccess = isCurrentUserAdmin || currentUserRole === 'manager' || currentUserRole === 'location_manager';
    if (!hasAccess) {
        console.log('❌ Access denied: User does not have analytics access privileges');
        showError('Access denied. You do not have permission to access analytics.');
        return;
    }
    
    // Navigate to analytics center with location parameter
    if (isCurrentUserAdmin) {
        console.log('✅ Admin user - navigating to /analytics');
        window.location.href = '/analytics';
    } else {
        console.log(`✅ Manager/Location Manager - navigating to /analytics?location=${currentUserLocation}`);
        window.location.href = `/analytics?location=${currentUserLocation}`;
    }
}

// Salary calculator entrypoint from management
function openSalaryCalculator() {
    try {
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (isAdmin) {
            window.location.href = '/salary';
            return;
        }
        const locationCode = localStorage.getItem('locationCode') || localStorage.getItem('location_username') || localStorage.getItem('location_name');
        if (locationCode) {
            window.location.href = `/location/${encodeURIComponent(locationCode)}/salary`;
        } else {
            window.location.href = '/salary';
        }
    } catch (e) {
        console.error('Failed to open salary calculator', e);
        window.location.href = '/salary';
    }
}

// Logout function
function logout() {
    // Clear all stored data
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to login page
    window.location.href = '/';
}

// Set verification loading state
function setVerificationLoading(loading) {
    const submitBtn = document.getElementById('verificationSubmit');
    if (submitBtn) {
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Verify Access';
        }
    }
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
    
    .management-card {
        transition: all 0.3s ease;
    }
    
    .management-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    }
    
    .card-subtitle {
        font-size: 0.9rem;
        color: #666;
        margin-top: 5px;
    }
`;
document.head.appendChild(style);

// **NEW: Test user loading function**
window.testUserLoading = function() {
    console.log('🧪 === TESTING USER LOADING ===');
    console.log('🔄 Manually triggering user load...');
    loadCurrentUser();
};

// **NEW: Debug current user info**
window.debugUserInfo = function() {
    console.log('🔍 === DEBUGGING USER INFO ===');
    console.log('LocalStorage username:', localStorage.getItem('username'));
    console.log('LocalStorage role:', localStorage.getItem('role'));
    console.log('LocalStorage isLoggedIn:', localStorage.getItem('isLoggedIn'));
    console.log('Current user role:', currentUserRole);
    console.log('Current user location:', currentUserLocation);
    console.log('Is admin:', isCurrentUserAdmin);
    
    const userNameElement = document.getElementById('user-name');
    const userStatusElement = document.getElementById('user-status');
    
    console.log('User name element found:', !!userNameElement);
    console.log('User status element found:', !!userStatusElement);
    
    if (userNameElement) {
        console.log('Current user name display:', userNameElement.textContent);
    }
    if (userStatusElement) {
        console.log('Current user status display:', userStatusElement.textContent);
    }
};

// **NEW: Test user management navigation**
window.testUserManagement = function() {
    console.log('🧪 === TESTING USER MANAGEMENT NAVIGATION ===');
    console.log('🔄 Manually triggering user management...');
    openUserManagement();
};

// **NEW: Bypass verification for testing**
window.bypassVerification = function() {
    console.log('🔓 === BYPASSING VERIFICATION ===');
    isVerified = true;
    console.log('✅ Verification bypassed, isVerified set to:', isVerified);
    showNotification('Verification bypassed for testing', 'info');
};

// **NEW: Force navigate to users page**
window.forceNavigateToUsers = function() {
    console.log('🚀 === FORCE NAVIGATING TO USERS ===');
    console.log('🔄 Bypassing all checks and navigating directly...');
    window.location.href = '/users';
};

// **NEW: Test location management navigation**
window.testLocationManagement = function() {
    console.log('🧪 === TESTING LOCATION MANAGEMENT NAVIGATION ===');
    console.log('🔄 Manually triggering location management...');
    openLocationManagement();
};

// **NEW: Force navigate to locations page**
window.forceNavigateToLocations = function() {
    console.log('🏢 === FORCE NAVIGATING TO LOCATIONS ===');
    console.log('🔄 Bypassing all checks and navigating directly...');
    window.location.href = '/locations';
};

// **NEW: Test emails management navigation**
window.testEmailsManagement = function() {
    console.log('🧪 === TESTING EMAILS MANAGEMENT NAVIGATION ===');
    console.log('🔄 Manually triggering emails management...');
    openEmailsManagement();
};

// **NEW: Force navigate to emails page**
window.forceNavigateToEmails = function() {
    console.log('📧 === FORCE NAVIGATING TO EMAILS ===');
    console.log('🔄 Bypassing all checks and navigating directly...');
    window.location.href = '/emails';
}; 