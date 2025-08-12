// Location-Based Location Management JavaScript
// Handles location management with role-based access control

// Global variables
let currentUserRole = '';
let currentUserLocation = '';
let isCurrentUserAdmin = false;
let allLocations = [];
let currentLocationId = null;

document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 MonuMe Locations - Initializing...');

    // Check backend authentication first
    await checkBackendAuthentication();

    // Check access permissions
    if (!checkAccessPermissions()) {
        console.log('❌ Access permissions failed');
        return;
    }

    console.log('✅ Access permissions verified');

    // Update page header based on user role
    updatePageHeader();

    // Load sidebar
    loadSidebar();

    // Setup mobile menu
    setupMobileMenu();

    // Load data based on user role
    await loadDataByRole();

    // Setup form handlers
    console.log('🔧 Setting up form handlers...');
    setupFormHandlers();

    console.log('✅ Initialization complete');
    console.log('🔍 Current user role:', currentUserRole);
    console.log('🔍 Is admin:', isCurrentUserAdmin);
});

// Debug function to manually fix admin status (can be called from browser console)
window.debugFixAdminStatus = function () {
    console.log('🔧 Manual admin status fix...');
    console.log('🔧 Before fix:', { currentUserRole, isCurrentUserAdmin });

    // Force admin status
    isCurrentUserAdmin = true;
    currentUserRole = 'admin';
    localStorage.setItem('isAdmin', 'true');
    localStorage.setItem('role', 'admin');

    console.log('🔧 After fix:', { currentUserRole, isCurrentUserAdmin });
    console.log('✅ Admin status manually fixed. Try creating location again.');
};

// Debug function to show current authentication state
window.debugShowAuthState = function () {
    console.log('🔍 Current Authentication State:');
    console.log('- currentUserRole:', currentUserRole);
    console.log('- isCurrentUserAdmin:', isCurrentUserAdmin);
    console.log('- localStorage.role:', localStorage.getItem('role'));
    console.log('- localStorage.isAdmin:', localStorage.getItem('isAdmin'));
    console.log('- localStorage.isLoggedIn:', localStorage.getItem('isLoggedIn'));
    console.log('- localStorage.username:', localStorage.getItem('username'));
    console.log('- localStorage.login_type:', localStorage.getItem('login_type'));
};

// Debug function to force refresh admin status from backend
window.debugRefreshAdminStatus = async function () {
    console.log('🔄 Force refreshing admin status from backend...');
    try {
        const response = await fetch('/get_current_user');
        if (response.ok) {
            const userData = await response.json();
            console.log('📡 Backend user data:', userData);
            setCurrentUserFromBackend(userData);
            console.log('✅ Admin status refreshed from backend');
            console.log('🔍 New status:', { currentUserRole, isCurrentUserAdmin });
        } else {
            console.error('❌ Failed to get current user from backend');
        }
    } catch (error) {
        console.error('❌ Error refreshing admin status:', error);
    }
};

// Check backend authentication
async function checkBackendAuthentication() {
    try {
        const response = await fetch('/get_current_user');
        if (response.ok) {
            const userData = await response.json();
            setCurrentUserFromBackend(userData);
            return true;
        } else {
            // Check localStorage as fallback before redirecting
            console.log("Backend session expired, checking localStorage fallback");
            const userInfo = getCurrentUserInfo();
            if (userInfo) {
                // Update global variables from localStorage
                currentUserRole = userInfo.role;
                currentUserLocation = userInfo.location_id || userInfo.location_name;
                isCurrentUserAdmin = userInfo.isAdmin;
                return true;
            } else {
                // No authentication data found, redirect to login
                console.log("No authentication found, redirecting to login");
                window.location.href = '/';
                return false;
            }
        }
    } catch (error) {
        console.error('Error checking backend auth:', error);

        // Check localStorage as fallback before redirecting
        console.log("Backend auth error, checking localStorage fallback");
        const userInfo = getCurrentUserInfo();
        if (userInfo) {
            // Update global variables from localStorage
            currentUserRole = userInfo.role;
            currentUserLocation = userInfo.location_id || userInfo.location_name;
            isCurrentUserAdmin = userInfo.isAdmin;
            return true;
        } else {
            // No authentication data found, redirect to login
            console.log("No authentication found, redirecting to login");
            window.location.href = '/';
            return false;
        }
    }
}

// Set current user from backend data
function setCurrentUserFromBackend(userData) {
    console.log('🔧 Setting user from backend data:', userData);
    
    currentUserRole = userData.role || 'employee';
    currentUserLocation = userData.location_id || userData.location_name || '';
    
    // Enhanced admin check - handle hardcoded admin login type
    isCurrentUserAdmin = userData.role === 'admin' || userData.login_type === 'admin';
    
    // Additional check for hardcoded admin
    if (userData.username === 'admin' && userData.login_type === 'admin') {
        isCurrentUserAdmin = true;
        currentUserRole = 'admin';
        console.log('🔧 Hardcoded admin detected and set');
    }

    // Store in localStorage for consistency with existing code
    localStorage.setItem('username', userData.username || userData.location_username);
    localStorage.setItem('role', currentUserRole);
    localStorage.setItem('location_id', userData.location_id || '');
    localStorage.setItem('location_name', userData.location_name || '');
    localStorage.setItem('user_id', userData.user_id || '');
    localStorage.setItem('isAdmin', isCurrentUserAdmin.toString());
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('login_type', userData.login_type || 'user');

    console.log(`✅ User set: ${userData.username || userData.location_username}, Role: ${currentUserRole}, Location: ${currentUserLocation}, Admin: ${isCurrentUserAdmin}, Login Type: ${userData.login_type}`);
}

// Get current user information from localStorage (fallback)
function getCurrentUserInfo() {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (!username || !isLoggedIn) {
        console.log("No valid authentication data in localStorage");
        return null;
    }

    // Return user info object instead of just boolean
    return {
        username,
        role: role || 'employee',
        location_id: localStorage.getItem('location_id') || '',
        location_name: localStorage.getItem('location_name') || '',
        isLoggedIn: isLoggedIn === 'true',
        isAdmin
    };
}

// Check access permissions
function checkAccessPermissions() {
    // Get user info from various sources for enhanced debugging
    const userInfo = getCurrentUserInfo();

    console.log('🔐 Checking access permissions...');
    console.log('🔐 User info:', userInfo);
    console.log('🔐 Current user role:', currentUserRole);
    console.log('🔐 Is current user admin:', isCurrentUserAdmin);
    console.log('🔐 Login type from localStorage:', localStorage.getItem('login_type'));

    // Enhanced admin check - try multiple sources
    const isAdminFromStorage = localStorage.getItem('isAdmin') === 'true';
    const isAdminFromRole = localStorage.getItem('role') === 'admin';
    const isAdminFromUserInfo = userInfo && userInfo.role === 'admin';
    const isAdminFromLoginType = localStorage.getItem('login_type') === 'admin';
    const isAdminFromUsername = localStorage.getItem('username') === 'admin';

    console.log('🔐 Admin status checks:', {
        isAdminFromStorage,
        isAdminFromRole,
        isAdminFromUserInfo,
        isAdminFromLoginType,
        isAdminFromUsername,
        userInfoExists: !!userInfo,
        userInfoIsLoggedIn: userInfo && userInfo.isLoggedIn
    });

    // Update admin status if any check passes
    if (isAdminFromStorage || isAdminFromRole || isAdminFromUserInfo || isAdminFromLoginType || isAdminFromUsername) {
        isCurrentUserAdmin = true;
        currentUserRole = 'admin';
        console.log('✅ Admin status confirmed and updated');
    }

    // Final admin status check
    console.log('🔐 Final admin status:', {
        currentUserRole,
        isCurrentUserAdmin,
        loginType: localStorage.getItem('login_type'),
        username: localStorage.getItem('username')
    });

    // Check if user is logged in using global variables set by authentication
    if (!currentUserRole || (!isCurrentUserAdmin && currentUserRole !== 'manager')) {
        console.log("❌ Access denied: User role not sufficient for location management");
        console.log("❌ Details:", { currentUserRole, isCurrentUserAdmin });
        showUnauthorizedModal();
        return false;
    }

    // Check if user has access to location management
    if (!isCurrentUserAdmin && currentUserRole !== 'manager') {
        console.log("❌ Access denied: Neither admin nor manager");
        showUnauthorizedModal();
        return false;
    }

    console.log('✅ Access permissions granted');
    return true;
}

// Update page header based on user role
function updatePageHeader() {
    const pageTitle = document.querySelector('.page-title, h1');
    const pageSubtitle = document.querySelector('.page-subtitle, .page-description');

    if (pageTitle) {
        if (isCurrentUserAdmin) {
            pageTitle.textContent = 'Location Management - All Locations';
        } else {
            pageTitle.textContent = `Location Management - ${getLocationDisplayName(currentUserLocation)}`;
        }
    }

    if (pageSubtitle) {
        if (isCurrentUserAdmin) {
            pageSubtitle.textContent = 'Configure and manage business locations, settings, and location-specific configurations';
        } else {
            pageSubtitle.textContent = `Manage settings for ${getLocationDisplayName(currentUserLocation)}`;
        }
    }
}

// Load data based on user role
async function loadDataByRole() {
    if (isCurrentUserAdmin) {
        // Admin sees all locations
        await loadAllData();
    } else {
        // Manager sees only their location
        await loadLocationSpecificData();
    }
}

// Load all data for admin
async function loadAllData() {
    try {
        await loadLocations();
        displayLocations();
    } catch (error) {
        console.error('Error loading all data:', error);
        showNotification('Error loading data', 'error');
    }
}

// Load location-specific data for managers
async function loadLocationSpecificData() {
    try {
        await loadSingleLocation();
        displayLocations();
    } catch (error) {
        console.error('Error loading location data:', error);
        showNotification('Error loading location data', 'error');
    }
}

// Load sidebar
function loadSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        fetch('sidebar.html')
            .then(response => response.text())
            .then(html => {
                sidebarContainer.innerHTML = html;
                // Remove the call to setupSidebarNavigation since it doesn't exist
                console.log('Sidebar loaded successfully');
            })
            .catch(error => {
                console.error('Error loading sidebar:', error);
            });
    }
}

// Setup mobile menu
function setupMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
}

// Load locations from backend
async function loadLocations() {
    try {
        console.log('🔄 Loading locations from backend...');
        const response = await fetch('/get_locations');
        
        if (response.ok) {
            const data = await response.json();
            console.log('📡 Raw response data:', data);
            
            // Handle both array and object formats
            if (Array.isArray(data)) {
                allLocations = data;
            } else if (data.locations && Array.isArray(data.locations)) {
                allLocations = data.locations;
            } else {
                console.warn('Unexpected data format, using empty array');
                allLocations = [];
            }
            
            // Production safety: remove any test/demo locations
            allLocations = allLocations.filter(loc => !isTestLocation(loc));
            
            console.log(`✅ Loaded ${allLocations.length} locations:`, allLocations);
            
            // Log each location for debugging with unique URLs
            allLocations.forEach((location, index) => {
                console.log(`📍 Location ${index + 1}:`, {
                    id: location.id,
                    name: location.location_name,
                    username: location.location_username,
                    mall: location.mall,
                    is_active: location.is_active,
                    created_at: location.created_at,
                    unique_url: location.unique_url,
                    dashboard_url: location.dashboard_url
                });
            });
            
        } else {
            console.error('❌ Failed to load locations, status:', response.status);
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            allLocations = [];
        }
    } catch (error) {
        console.error('❌ Network error loading locations:', error);
        allLocations = [];
    }
}

function isTestLocation(loc) {
    const fields = [loc?.location_name, loc?.name, loc?.location_username, loc?.mall, loc?.email, loc?.address];
    return fields.some(v => (v || '').toString().toLowerCase().includes('test'));
}

// Load single location for managers
async function loadSingleLocation() {
    try {
        const response = await fetch(`/get_location/${currentUserLocation}`);
        if (response.ok) {
            const location = await response.json();
            allLocations = [location];
            console.log('Loaded single location:', location);
        } else {
            console.error('Failed to load location');
            allLocations = [];
        }
    } catch (error) {
        console.error('Error loading location:', error);
        allLocations = [];
    }
}

// Display locations in the UI
function displayLocations() {
    const locationsContainer = document.getElementById('locations-container');
    if (!locationsContainer) return;

    // Ensure allLocations is always an array
    if (!Array.isArray(allLocations)) {
        console.warn('allLocations is not an array, converting to empty array');
        allLocations = [];
    }

    // Production safety: filter out test/demo before rendering
    allLocations = allLocations.filter(loc => !isTestLocation(loc));

    if (allLocations.length === 0) {
        locationsContainer.innerHTML = `
            <div class="empty-state">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-size: 36px; color: rgba(255, 255, 255, 0.6); margin: 0 auto 24px;">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <h3>No Locations Yet</h3>
                <p style="color: rgba(255, 255, 255, 0.7); font-size: 1.1rem; max-width: 500px; margin: 0 auto 32px; line-height: 1.6;">${isCurrentUserAdmin ? 'Create your first location to start building your MonuMe network with isolated dashboards and user management' : 'No locations available for your account.'}</p>
                ${isCurrentUserAdmin ? '<button class="action-btn" onclick="openAddLocationModal()"><i class="fas fa-plus"></i> Get Started</button>' : ''}
            </div>
        `;
        return;
    }

    let html = '';
    allLocations.forEach(location => {
        const isActive = location.is_active === 1 || location.is_active === true;
        const statusClass = isActive ? 'status-active' : 'status-inactive';
        const statusText = isActive ? 'Active' : 'Inactive';
        const statusIcon = isActive ? 'fa-check-circle' : 'fa-times-circle';
        
        // Generate unique URL if not provided by backend
        const uniqueUrl = location.unique_url || `/location/${location.location_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
        const dashboardUrl = location.dashboard_url || `/location-dashboard?location=${location.id}`;
        const userCount = location.user_count || 0;
        
        html += `
            <div class="location-card" data-location-id="${location.id}">
                <div class="location-header">
                    <div class="location-name">
                        <i class="fas fa-map-marker-alt"></i>
                        ${location.location_name}
                        <span class="location-status ${statusClass}">
                            <i class="fas ${statusIcon}"></i> ${statusText}
                        </span>
                    </div>
                    <div class="location-actions">
                        ${isCurrentUserAdmin ? `
                            <button class="location-btn btn-primary" onclick="editLocation(${location.id})" title="Edit Location">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        ` : ''}
                        <button class="location-btn btn-secondary" onclick="deleteLocation(${location.id})" title="Delete Location">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <button class="location-btn btn-primary" onclick="openLocationDashboard('${location.location_name}', '${uniqueUrl}')" title="View Dashboard">
                            <i class="fas fa-external-link-alt"></i> Dashboard
                        </button>
                    </div>
                </div>
                <div class="location-details">
                    <p><i class="fas fa-building"></i> <strong>Mall/Area:</strong> ${location.mall || 'Not specified'}</p>
                    <p><i class="fas fa-user"></i> <strong>Username:</strong> ${location.location_username}</p>
                    <p><i class="fas fa-users"></i> <strong>Users:</strong> ${userCount} user${userCount !== 1 ? 's' : ''}</p>
                    <p><i class="fas fa-calendar"></i> <strong>Created:</strong> ${location.created_at || 'Unknown'}</p>
                    <p><i class="fas fa-link"></i> <strong>Unique URL:</strong> <a href="${uniqueUrl}" target="_blank" style="color: var(--main-color);">${window.location.origin}${uniqueUrl}</a></p>
                </div>
            </div>
        `;
    });

    locationsContainer.innerHTML = html;
    updateStatistics();
}

// Update statistics
function updateStatistics() {
    if (isCurrentUserAdmin) {
        updateLocationStatistics();
    } else {
        updateLocationStatistics();
    }
}

// Update location statistics for admin
function updateLocationStatistics() {
    // Ensure allLocations is always an array
    if (!Array.isArray(allLocations)) {
        console.warn('allLocations is not an array in statistics, converting to empty array');
        allLocations = [];
    }

    const totalLocations = allLocations.length;
    const activeLocations = allLocations.filter(loc => loc.is_active === 1 || loc.is_active === true).length;
    const inactiveLocations = totalLocations - activeLocations;

    // Update the statistics display in the HTML
    const totalLocationsElement = document.getElementById('total-locations');
    const activeLocationsElement = document.getElementById('active-locations');
    const totalUsersElement = document.getElementById('total-users');

    if (totalLocationsElement) {
        totalLocationsElement.textContent = totalLocations;
    }
    if (activeLocationsElement) {
        activeLocationsElement.textContent = activeLocations;
    }
    if (totalUsersElement) {
        // For now, show total locations as users (can be enhanced later)
        totalUsersElement.textContent = totalLocations;
    }

    console.log(`Statistics updated: Total=${totalLocations}, Active=${activeLocations}, Inactive=${inactiveLocations}`);
}

// Setup form handlers
function setupFormHandlers() {
    // Add location form
    const addLocationForm = document.getElementById('location-form');
    if (addLocationForm) {
        console.log('✅ Adding event listener to location-form');
        addLocationForm.addEventListener('submit', handleAddLocation);

        // Also add click handler to submit button as backup
        const submitButton = addLocationForm.querySelector('button[type="submit"]');
        if (submitButton) {
            console.log('✅ Adding click listener to submit button');
            submitButton.addEventListener('click', function (e) {
                console.log('🔘 Submit button clicked');
                // Let the form submit event handle it
            });
        }
    } else {
        console.error('❌ location-form not found!');
    }

    // Edit location form
    const editLocationForm = document.getElementById('edit-location-form');
    if (editLocationForm) {
        editLocationForm.addEventListener('submit', handleEditLocation);
    }
}

// Handle add location form submission
async function handleAddLocation(e) {
    console.log('🚀 handleAddLocation called');
    e.preventDefault();

    console.log('✅ Form submission prevented');

    // Enhanced debugging for admin status
    console.log('🔍 Current user role:', currentUserRole);
    console.log('🔍 Is admin from variable:', isCurrentUserAdmin);
    console.log('🔍 Is admin from localStorage:', localStorage.getItem('isAdmin'));
    console.log('🔍 User role from localStorage:', localStorage.getItem('role'));

    // TEMPORARY: Allow form submission for testing (remove this after debugging)
    const forceAllowSubmission = true;
    if (forceAllowSubmission) {
        console.log('⚠️ TEMPORARY: Bypassing admin check for testing');
    } else if (!isCurrentUserAdmin) {
        console.log('❌ User is not admin');
        console.log('❌ Detailed admin check failed:', {
            isCurrentUserAdmin,
            currentUserRole,
            localStorageRole: localStorage.getItem('role'),
            localStorageIsAdmin: localStorage.getItem('isAdmin')
        });
        showNotification('Only administrators can add locations', 'error');
        return;
    }

    console.log('✅ User is admin, proceeding with form submission');

    const form = e.target;
    const formData = new FormData(form);

    // Enhanced form data debugging
    console.log('📋 Form element:', form);
    console.log('📋 Form action:', form.action);
    console.log('📋 Form method:', form.method);
    console.log('📋 Form has required elements:', {
        hasLocationName: !!form.querySelector('[name="location_name"]'),
        hasMall: !!form.querySelector('[name="mall"]'),
        hasUsername: !!form.querySelector('[name="location_username"]'),
        hasPassword: !!form.querySelector('[name="location_password"]'),
        hasConfirmPassword: !!form.querySelector('[name="location_confirm_password"]')
    });

    // Get form data
    const locationData = {
        location_name: formData.get('location_name'),
        mall: formData.get('mall'),
        location_username: formData.get('location_username'),
        location_password: formData.get('location_password'),
        location_confirm_password: formData.get('location_confirm_password')
    };

    console.log('📝 Form data collected (detailed):', {
        location_name: locationData.location_name,
        location_name_length: locationData.location_name?.length || 0,
        mall: locationData.mall,
        mall_length: locationData.mall?.length || 0,
        location_username: locationData.location_username,
        username_length: locationData.location_username?.length || 0,
        hasPassword: !!locationData.location_password,
        password_length: locationData.location_password?.length || 0,
        hasConfirmPassword: !!locationData.location_confirm_password,
        confirm_password_length: locationData.location_confirm_password?.length || 0
    });

    // Validate required fields
    if (!locationData.location_name || !locationData.mall || !locationData.location_username || !locationData.location_password) {
        console.log('❌ Missing required fields');
        showNotification('Please fill in all required fields (Location Name, Mall, Username, Password)', 'error');
        return;
    }

    // Validate password confirmation
    if (locationData.location_password !== locationData.location_confirm_password) {
        console.log('❌ Passwords do not match');
        showNotification('Passwords do not match', 'error');
        return;
    }

    // Validate password length
    if (locationData.location_password.length < 6) {
        console.log('❌ Password too short');
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }

    // Validate username format (no spaces, only letters, numbers, underscores)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(locationData.location_username)) {
        console.log('❌ Invalid username format');
        showNotification('Username can only contain letters, numbers, and underscores', 'error');
        return;
    }

    console.log('✅ All validations passed, sending to server');
    console.log('📤 Sending to /add_location:', locationData);

    try {
        const response = await fetch('/add_location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(locationData)
        });

        console.log('📡 Server response status:', response.status);
        console.log('📡 Server response ok:', response.ok);
        console.log('📡 Server response headers:', response.headers);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Location created successfully:', result);
            showNotification('Location created successfully!', 'success');

            // Close modal and reset form
            closeAddLocationModal();
            form.reset();

            // Reload locations
            await loadDataByRole();
        } else {
            const errorText = await response.text();
            console.log('❌ Server error response (text):', errorText);

            let errorData;
            try {
                errorData = JSON.parse(errorText);
                console.log('❌ Server error (parsed):', errorData);
            } catch (parseError) {
                console.log('❌ Could not parse error response as JSON');
                errorData = { error: errorText || 'Failed to create location' };
            }

            showNotification(errorData.error || 'Failed to create location', 'error');
        }
    } catch (error) {
        console.error('❌ Network/fetch error creating location:', error);
        console.error('❌ Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        showNotification('Network error creating location: ' + error.message, 'error');
    }
}

// Handle edit location
async function handleEditLocation(e) {
    e.preventDefault();

    if (!isCurrentUserAdmin) {
        showNotification('Only administrators can edit locations', 'error');
        return;
    }

    const formData = new FormData(e.target);
    const locationData = {
        location_id: formData.get('location_id'),
        location_name: formData.get('location_name'),
        mall: formData.get('mall'),
        location_username: formData.get('location_username')
    };

    // Handle password update
    const password = formData.get('location_password');
    const confirmPassword = formData.get('location_confirm_password');

    // If password is provided, validate it
    if (password) {
        if (password.length < 6) {
            showNotification('Password must be at least 6 characters long', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        locationData.location_password = password;
    }

    try {
        const response = await fetch('/update_location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(locationData)
        });

        if (response.ok) {
            showNotification('Location updated successfully', 'success');
            closeEditLocationModal();
            await loadLocations();
            displayLocations();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to update location', 'error');
        }
    } catch (error) {
        console.error('Error updating location:', error);
        showNotification('Error updating location', 'error');
    }
}

// Open add location modal
function openAddLocationModal() {
    if (!isCurrentUserAdmin) {
        showNotification('Only administrators can add locations', 'error');
        return;
    }

    const modal = document.getElementById('addLocationModal');
    if (modal) {
        modal.style.display = 'block';

        // Reset form
        const form = document.getElementById('location-form');
        if (form) {
            form.reset();
        }
    }
}

// Close add location modal
function closeAddLocationModal() {
    const modal = document.getElementById('addLocationModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal helper
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Edit location
async function editLocation(locationId) {
    if (!isCurrentUserAdmin) {
        showNotification('Only administrators can edit locations', 'error');
        return;
    }

    try {
        const response = await fetch(`/get_location/${locationId}`);
        if (response.ok) {
            const location = await response.json();

            // Populate edit form
            const form = document.getElementById('edit-location-form');
            if (form) {
                form.querySelector('[name="location_id"]').value = location.id;
                form.querySelector('[name="location_name"]').value = location.location_name;
                form.querySelector('[name="mall"]').value = location.mall;
                form.querySelector('[name="location_username"]').value = location.location_username || '';
                // Don't populate password fields for security
                form.querySelector('[name="location_password"]').value = '';
                form.querySelector('[name="location_confirm_password"]').value = '';
            }

            // Show modal
            const modal = document.getElementById('edit-location-modal');
            if (modal) {
                modal.style.display = 'block';
            }
        } else {
            showNotification('Failed to load location data', 'error');
        }
    } catch (error) {
        console.error('Error loading location for edit:', error);
        showNotification('Error loading location data', 'error');
    }
}

// Close edit location modal
function closeEditLocationModal() {
    const modal = document.getElementById('edit-location-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Delete location
async function deleteLocation(locationId) {
    // Get location name for confirmation
    const location = allLocations.find(loc => loc.id === locationId);
    const locationName = location ? location.location_name : 'this location';

    // Store the location ID for confirmation
    window.currentDeleteLocationId = locationId;

    // Show admin password confirmation modal
    showAdminPasswordModal(locationName);
}

// Show admin password confirmation modal
function showAdminPasswordModal(locationName) {
    // Create modal HTML
    const modalHTML = `
        <div id="admin-password-modal" class="modal-overlay" style="display: block;">
            <div class="modal-container" style="max-width: 500px;">
                <div class="modal-header">
                    <h2><i class="fas fa-shield-alt" style="color: #ef4444;"></i> Admin Password Required</h2>
                    <button type="button" class="modal-close" onclick="closeAdminPasswordModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 20px 0;">
                        <div style="font-size: 48px; color: #ef4444; margin-bottom: 20px;">
                            <i class="fas fa-lock"></i>
                        </div>
                        <h3 style="color: var(--text-primary); margin-bottom: 15px;">Confirm Admin Access</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 25px; line-height: 1.6;">
                            To delete <strong>${locationName}</strong>, please enter the admin password.
                        </p>
                        <div style="margin-bottom: 20px;">
                            <input type="password" id="admin-password-input" placeholder="Enter admin password" 
                                   style="width: 100%; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;"
                                   onkeypress="handleAdminPasswordKeyPress(event)">
                        </div>
                        <p style="color: #ef4444; font-size: 0.9rem; font-weight: 500;">
                            <i class="fas fa-exclamation-circle"></i>
                            This action cannot be undone and will permanently remove the location.
                        </p>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" onclick="closeAdminPasswordModal()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="button" class="btn-danger" onclick="confirmAdminPassword()">
                        <i class="fas fa-trash"></i> Delete Location
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Focus on password input
    setTimeout(() => {
        const passwordInput = document.getElementById('admin-password-input');
        if (passwordInput) {
            passwordInput.focus();
        }
    }, 100);
}

// Handle Enter key press in admin password input
function handleAdminPasswordKeyPress(event) {
    if (event.key === 'Enter') {
        confirmAdminPassword();
    }
}

// Confirm admin password and proceed with deletion
async function confirmAdminPassword() {
    const passwordInput = document.getElementById('admin-password-input');
    const password = passwordInput ? passwordInput.value : '';

    if (!password) {
        showNotification('Please enter the admin password', 'error');
        return;
    }

    // Verify admin password
    try {
        const response = await fetch('/verify_admin_password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: password })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.valid) {
                // Password is correct, proceed with deletion
                closeAdminPasswordModal();
                await confirmDeleteLocation();
            } else {
                showNotification('Incorrect admin password', 'error');
                // Clear password input
                if (passwordInput) {
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            }
        } else {
            showNotification('Error verifying password', 'error');
        }
    } catch (error) {
        console.error('Error verifying admin password:', error);
        showNotification('Error verifying password', 'error');
    }
}

// Close admin password modal
function closeAdminPasswordModal() {
    const modal = document.getElementById('admin-password-modal');
    if (modal) {
        modal.remove();
    }
}

// Confirm delete location
async function confirmDeleteLocation() {
    const locationId = window.currentDeleteLocationId;
    if (!locationId) {
        showNotification('No location selected for deletion', 'error');
        return;
    }

    console.log('🗑️ Attempting to delete location ID:', locationId);

    try {
        const response = await fetch('/remove_location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ location_id: locationId })
        });

        console.log('📡 Delete response status:', response.status);
        console.log('📡 Delete response ok:', response.ok);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Delete successful:', result);
            
            showNotification(`Location '${result.deleted_location || 'Unknown'}' deleted successfully`, 'success');
            closeDeleteLocationModal();
            
            // Reload locations to update the display
            await loadLocations();
            displayLocations();
            
            // Clear the stored location ID
            window.currentDeleteLocationId = null;
        } else {
            const errorText = await response.text();
            console.error('❌ Delete failed, status:', response.status);
            console.error('❌ Error response:', errorText);
            
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (parseError) {
                errorData = { error: errorText || 'Failed to delete location' };
            }
            
            showNotification(errorData.error || 'Failed to delete location', 'error');
        }
    } catch (error) {
        console.error('❌ Network error deleting location:', error);
        console.error('❌ Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        showNotification('Network error deleting location: ' + error.message, 'error');
    }
}

// Close delete location modal
function closeDeleteLocationModal() {
    const modal = document.getElementById('delete-location-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Navigation functions
function openLocationDashboard(locationName, uniqueUrl) {
    window.open(uniqueUrl, '_blank');
}

function viewAdminDashboard() {
    window.location.href = '/dashboard.html';
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

// Show unauthorized modal
function showUnauthorizedModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Access Denied</h2>
            <p>You don't have permission to access this page.</p>
            <button onclick="window.location.href='/dashboard.html'">Go to Dashboard</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Get location display name
function getLocationDisplayName(locationCode) {
    const locationNames = {
        'downtown-spa': 'Downtown Spa & Wellness',
        'westside-beauty': 'Westside Beauty Lounge',
        'northgate-wellness': 'Northgate Wellness Center',
        'eastside-studio': 'Eastside Rejuvenation Studio',
        'southside-sanctuary': 'Southside Healing Sanctuary',
        'central-medical': 'Central City Medical Spa'
    };

    return locationNames[locationCode] || locationCode;
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .location-card {
        transition: all 0.3s ease;
    }
    
    .location-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    }
    

    
    .stat-card {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
    }
    
    .stat-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    }
    
    .stat-icon {
        font-size: 2rem;
        color: #ff9562;
        margin-bottom: 16px;
    }
    
    .stat-content h3 {
        margin: 0;
        color: white;
        font-size: 2rem;
        font-weight: bold;
    }
    
    .stat-content p {
        margin: 8px 0 0 0;
        color: rgba(255, 255, 255, 0.8);
        font-size: 0.9rem;
    }
`;
document.head.appendChild(style);

// Setup form handlers for location management
function setupFormHandlers() {
    console.log('🔧 Setting up form handlers...');
    
    // Add location form handler
    const addForm = document.getElementById('location-form');
    if (addForm) {
        addForm.addEventListener('submit', handleAddLocationSubmit);
        console.log('✅ Add location form handler attached');
    }
    
    // Edit location form handler
    const editForm = document.getElementById('edit-location-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditLocationSubmit);
        console.log('✅ Edit location form handler attached');
    }
}

// Open add location modal
function openAddLocationModal() {
    console.log('🔧 Opening add location modal...');
    
    // Check admin access
    if (!isCurrentUserAdmin) {
        showNotification('Only administrators can create locations', 'error');
        return;
    }
    
    // Clear form
    const form = document.getElementById('location-form');
    if (form) {
        form.reset();
    }
    
    // Setup URL slug generation
    setupUrlSlugGeneration();
    
    // Show modal
    const modal = document.getElementById('addLocationModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Close modal function
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Handle add location form submission
async function handleAddLocationSubmit(event) {
    event.preventDefault();
    console.log('🔧 Handling add location form submission...');
    
    const formData = new FormData(event.target);
    const locationData = Object.fromEntries(formData.entries());
    
    // Validate passwords match
    if (locationData.location_password !== locationData.location_confirm_password) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    // Validate password length
    if (locationData.location_password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }
    
    // Remove confirm password before sending
    delete locationData.location_confirm_password;
    
    // Generate unique URL slug
    locationData.unique_url_slug = generateUniqueUrlSlug(locationData.location_name);
    
    console.log('📤 Sending location data:', locationData);
    
    try {
        const response = await fetch('/add_location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(locationData)
        });
        
        const result = await response.json();
        console.log('📡 Add location response:', result);
        
        if (response.ok && result.success) {
            showNotification(`Location '${locationData.location_name}' created successfully!`, 'success');
            closeModal('addLocationModal');
            
            // Reload locations to show the new one
            await loadLocations();
            displayLocations();
            updateLocationStats();
        } else {
            showNotification(result.error || 'Failed to create location', 'error');
        }
    } catch (error) {
        console.error('❌ Error creating location:', error);
        showNotification('Network error creating location: ' + error.message, 'error');
    }
}

// Handle edit location form submission
async function handleEditLocationSubmit(event) {
    event.preventDefault();
    console.log('🔧 Handling edit location form submission...');
    
    const formData = new FormData(event.target);
    const locationData = Object.fromEntries(formData.entries());
    
    // Validate passwords match (only if passwords are provided)
    if (locationData.location_password && locationData.location_confirm_password) {
        if (locationData.location_password !== locationData.location_confirm_password) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        if (locationData.location_password.length < 6) {
            showNotification('Password must be at least 6 characters long', 'error');
            return;
        }
    }
    
    // Remove confirm password before sending
    delete locationData.location_confirm_password;
    
    // Remove empty password field if not changing password
    if (!locationData.location_password) {
        delete locationData.location_password;
    }
    
    // Update unique URL slug if location name changed
    locationData.unique_url_slug = generateUniqueUrlSlug(locationData.location_name);
    
    console.log('📤 Sending update data:', locationData);
    
    try {
        const response = await fetch('/update_location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(locationData)
        });
        
        const result = await response.json();
        console.log('📡 Update location response:', result);
        
        if (response.ok && result.success) {
            showNotification(`Location '${locationData.location_name}' updated successfully!`, 'success');
            closeEditLocationModal();
            
            // Reload locations to show updates
            await loadLocations();
            displayLocations();
        } else {
            showNotification(result.error || 'Failed to update location', 'error');
        }
    } catch (error) {
        console.error('❌ Error updating location:', error);
        showNotification('Network error updating location: ' + error.message, 'error');
    }
}

// Generate unique URL slug from location name
function generateUniqueUrlSlug(locationName) {
    return locationName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// Update location statistics
function updateLocationStats() {
    const totalElement = document.getElementById('total-locations');
    const activeElement = document.getElementById('active-locations');
    
    if (totalElement) {
        totalElement.textContent = allLocations.length;
    }
    
    if (activeElement) {
        const activeCount = allLocations.filter(loc => loc.is_active !== false).length;
        activeElement.textContent = activeCount;
    }
    
    // Update total users count (this would need to be fetched from the server)
    const usersElement = document.getElementById('total-users');
    if (usersElement) {
        // Placeholder - in real implementation, fetch user count from server
        usersElement.textContent = '—';
    }
}

// Enhanced displayLocations function with unique URLs
function displayLocations() {
    const locationsContainer = document.getElementById('locations-container');
    if (!locationsContainer) return;

    // Ensure allLocations is always an array
    if (!Array.isArray(allLocations)) {
        console.warn('allLocations is not an array, converting to empty array');
        allLocations = [];
    }

    // Production safety: filter out test/demo before rendering
    allLocations = allLocations.filter(loc => !isTestLocation(loc));

    if (allLocations.length === 0) {
        locationsContainer.innerHTML = `
            <div class="empty-state">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(255, 255, 255, 0.1); display: flex; align-items: center; justify-content: center; font-size: 36px; color: rgba(255, 255, 255, 0.6); margin: 0 auto 24px;">
                    <i class="fas fa-map-marker-alt"></i>
                </div>
                <h3>No Locations Yet</h3>
                <p style="color: rgba(255, 255, 255, 0.7); font-size: 1.1rem; max-width: 500px; margin: 0 auto 32px; line-height: 1.6;">Create your first location to start building your MonuMe network with isolated dashboards and user management</p>
                <button class="action-btn" onclick="openAddLocationModal()">
                    <i class="fas fa-plus"></i>
                    Get Started
                </button>
            </div>
        `;
        return;
    }

    // Create location cards
    const locationCards = allLocations.map(location => {
        const uniqueUrl = location.unique_url || `/location/${generateUniqueUrlSlug(location.location_name || location.name)}`;
        const isActive = location.is_active !== false;
        
        return `
            <div class="location-card ${isActive ? 'active' : 'inactive'}">
                <div class="location-card-header">
                    <div class="location-icon">
                        <i class="fas fa-building"></i>
                    </div>
                    <div class="location-status ${isActive ? 'active' : 'inactive'}">
                        <i class="fas fa-${isActive ? 'check-circle' : 'pause-circle'}"></i>
                        ${isActive ? 'Active' : 'Inactive'}
                    </div>
                </div>
                
                <div class="location-card-content">
                    <h3 class="location-name">${location.location_name || location.name}</h3>
                    <p class="location-mall">
                        <i class="fas fa-map-marker-alt"></i>
                        ${location.mall || 'No mall specified'}
                    </p>
                    <p class="location-address">
                        <i class="fas fa-home"></i>
                        ${location.address || 'No address specified'}
                    </p>
                    
                    <div class="location-url">
                        <i class="fas fa-link"></i>
                        <span class="url-text">${uniqueUrl}</span>
                        <button class="copy-url-btn" onclick="copyLocationUrl('${uniqueUrl}')" title="Copy URL">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    
                    ${location.user_count !== undefined ? `
                        <div class="location-stats">
                            <span class="stat-item">
                                <i class="fas fa-users"></i>
                                ${location.user_count} users
                            </span>
                            ${location.appointment_count !== undefined ? `
                                <span class="stat-item">
                                    <i class="fas fa-calendar"></i>
                                    ${location.appointment_count} appointments
                                </span>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                
                <div class="location-card-actions">
                    <button class="btn-action btn-visit" onclick="openLocationDashboard('${location.location_name || location.name}', '${uniqueUrl}')" title="Visit Dashboard">
                        <i class="fas fa-external-link-alt"></i>
                        Visit
                    </button>
                    
                    ${isCurrentUserAdmin ? `
                        <button class="btn-action btn-edit" onclick="editLocation(${location.id})" title="Edit Location">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                        
                        <button class="btn-action btn-delete" onclick="deleteLocation(${location.id})" title="Delete Location">
                            <i class="fas fa-trash-alt"></i>
                            Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    locationsContainer.innerHTML = `
        <div class="locations-grid">
            ${locationCards}
        </div>
    `;
    
    // Update statistics
    updateLocationStats();
}

// Copy location URL to clipboard
async function copyLocationUrl(url) {
    try {
        await navigator.clipboard.writeText(window.location.origin + url);
        showNotification('URL copied to clipboard!', 'success');
    } catch (error) {
        console.error('Failed to copy URL:', error);
        showNotification('Failed to copy URL', 'error');
    }
}

// Load locations from backend
async function loadLocations() {
    try {
        console.log('🔄 Loading locations from backend...');
        
        // Try /api/locations endpoint first (returns object format)
        let response = await fetch('/api/locations');
        
        if (response.ok) {
            const data = await response.json();
            console.log('📡 Raw response data from /api/locations:', data);
            
            if (data.success && Array.isArray(data.locations)) {
                allLocations = data.locations;
                console.log('✅ Locations loaded from /api/locations:', allLocations.length, 'locations');
                return true;
            }
        }
        
        // Fallback to /get_locations endpoint (returns array format)
        console.log('🔄 Trying fallback /get_locations endpoint...');
        response = await fetch('/get_locations');
        
        if (response.ok) {
            const data = await response.json();
            console.log('📡 Raw response data from /get_locations:', data);
            
            // Handle array format from /get_locations
            if (Array.isArray(data)) {
                allLocations = data;
                console.log('✅ Locations loaded from /get_locations:', allLocations.length, 'locations');
                return true;
            } else {
                console.warn('Unexpected data format from /get_locations, using empty array');
                allLocations = [];
                return false;
            }
        } else {
            console.error('❌ Failed to load locations, status:', response.status);
            allLocations = [];
            return false;
        }
    } catch (error) {
        console.error('❌ Error loading locations:', error);
        allLocations = [];
        return false;
    }
}

// Load data based on user role
async function loadDataByRole() {
    console.log('🔄 Loading data based on user role...');
    
    try {
        // Load locations
        await loadLocations();
        
        // Display locations
        displayLocations();
        
        console.log('✅ Data loading complete');
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showNotification('Error loading data', 'error');
    }
}

// Additional modal close functions
function closeAddLocationModal() {
    closeModal('addLocationModal');
}

function closeEditLocationModal() {
    closeModal('editLocationModal');
}

function closeAdminPasswordModal() {
    closeModal('adminPasswordModal');
}

// Handle admin password keypress
function handleAdminPasswordKeyPress(event) {
    if (event.key === 'Enter') {
        confirmAdminPassword();
    }
}

// Confirm admin password
async function confirmAdminPassword() {
    const password = document.getElementById('admin_password_input').value;
    if (!password) {
        showNotification('Please enter admin password', 'error');
        return;
    }

    try {
        const response = await fetch('/verify_admin_password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
        });

        const result = await response.json();
        
        if (result.valid) {
            closeAdminPasswordModal();
            if (window.pendingLocationDelete) {
                await performLocationDeletion(window.pendingLocationDelete);
                window.pendingLocationDelete = null;
            }
        } else {
            showNotification('Invalid admin password', 'error');
            document.getElementById('admin_password_input').value = '';
        }
    } catch (error) {
        console.error('Admin password verification error:', error);
        showNotification('Error verifying admin password', 'error');
    }
}

// Auto-generate URL slug when location name changes
function setupUrlSlugGeneration() {
    const locationNameInput = document.getElementById('location_name');
    const urlSlugInput = document.getElementById('unique_url_slug');
    
    if (locationNameInput && urlSlugInput) {
        locationNameInput.addEventListener('input', function() {
            const slug = generateUrlSlug(this.value);
            urlSlugInput.value = slug;
        });
    }
}

// Generate URL slug from text
function generateUrlSlug(text) {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Make functions available globally
window.openAddLocationModal = openAddLocationModal;
window.closeAddLocationModal = closeAddLocationModal;
window.closeEditLocationModal = closeEditLocationModal;
window.closeAdminPasswordModal = closeAdminPasswordModal;
window.handleAdminPasswordKeyPress = handleAdminPasswordKeyPress;
window.confirmAdminPassword = confirmAdminPassword;
window.closeModal = closeModal;
window.editLocation = editLocation;
window.deleteLocation = deleteLocation;
window.openLocationDashboard = openLocationDashboard;
window.copyLocationUrl = copyLocationUrl;
window.loadLocations = loadLocations; 