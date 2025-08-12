/**
 * Multi-Tenant Authentication and Location Management System
 * For MonuMe Tracker - Location-based Dashboard Access
 */

class MultiTenantAuth {
    constructor() {
        this.currentUser = null;
        this.currentLocation = null;
        this.isAdmin = false;
        this.init();
    }

    init() {
        // Check if user is already authenticated via backend session
        this.checkBackendAuth();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize location-specific routing
        this.initLocationRouting();
    }

    async checkBackendAuth() {
        try {
            const response = await fetch('/get_current_user');
            if (response.ok) {
                const userData = await response.json();
                this.setCurrentUser(userData);
                return true;
            } else {
                // Clear any stale localStorage data
                this.clearStoredAuth();
                return false;
            }
        } catch (error) {
            console.error('Error checking backend auth:', error);
            this.clearStoredAuth();
            return false;
        }
    }

    setCurrentUser(userData) {
        this.currentUser = userData;
        this.isAdmin = userData.role === 'admin';
        this.currentLocation = userData.location_id || userData.location_name;
        
        // Store in localStorage for frontend consistency
        localStorage.setItem('username', userData.username || userData.location_username);
        localStorage.setItem('role', userData.role || 'user');
        localStorage.setItem('location_id', userData.location_id || '');
        localStorage.setItem('location_name', userData.location_name || '');
        localStorage.setItem('user_id', userData.user_id || '');
        localStorage.setItem('isAdmin', this.isAdmin.toString());
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('login_type', userData.login_type || 'user');
        
        console.log('User authenticated:', userData);
    }

    clearStoredAuth() {
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        localStorage.removeItem('location_id');
        localStorage.removeItem('location_name');
        localStorage.removeItem('user_id');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('login_type');
        localStorage.removeItem('monume_user');
        localStorage.removeItem('monume_location');
        localStorage.removeItem('monume_is_admin');
    }

    loadStoredAuth() {
        const username = localStorage.getItem('username');
        const role = localStorage.getItem('role');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        
        if (username && isLoggedIn) {
            this.currentUser = {
                username: username,
                role: role,
                location_id: localStorage.getItem('location_id'),
                location_name: localStorage.getItem('location_name'),
                user_id: localStorage.getItem('user_id'),
                login_type: localStorage.getItem('login_type')
            };
            this.isAdmin = localStorage.getItem('isAdmin') === 'true';
            this.currentLocation = localStorage.getItem('location_id') || localStorage.getItem('location_name');
        }
    }

    // Location-based authentication
    async authenticateLocation(username, password, locationCode) {
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    login_type: 'location'
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.setCurrentUser(data);
                return {
                    success: true,
                    user: data,
                    redirectUrl: '/location-dashboard.html'
                };
            } else {
                return { success: false, message: data.error || 'Authentication failed' };
            }
        } catch (error) {
            console.error('Location authentication error:', error);
            return { success: false, message: 'Network error during authentication' };
        }
    }

    // Admin authentication
    async authenticateAdmin(username, password) {
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    login_type: 'user'
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.setCurrentUser(data);
                return {
                    success: true,
                    user: data,
                    redirectUrl: '/dashboard.html'
                };
            } else {
                return { success: false, message: data.error || 'Authentication failed' };
            }
        } catch (error) {
            console.error('Admin authentication error:', error);
            return { success: false, message: 'Network error during authentication' };
        }
    }

    // Get users for a specific location
    async getLocationUsers(locationCode) {
        try {
            const response = await fetch(`/api/location/users?location_id=${locationCode}`);
            if (response.ok) {
                return await response.json();
            } else {
                console.error('Failed to fetch location users');
                return [];
            }
        } catch (error) {
            console.error('Error fetching location users:', error);
            return [];
        }
    }

    // Update users for a specific location
    async updateLocationUsers(locationCode, users) {
        try {
            const response = await fetch('/api/location/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    location_id: locationCode,
                    users: users
                })
            });
            
            if (response.ok) {
                console.log(`Updated users for location: ${locationCode}`);
                return true;
            } else {
                console.error('Failed to update location users');
                return false;
            }
        } catch (error) {
            console.error('Error updating location users:', error);
            return false;
        }
    }

    // Add a new location with initial manager
    async addLocation(locationData) {
        try {
            const response = await fetch('/add_location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(locationData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`Added new location: ${locationData.location_name}`);
                return result;
            } else {
                const error = await response.json();
                console.error('Failed to add location:', error);
                return { success: false, error: error.error };
            }
        } catch (error) {
            console.error('Error adding location:', error);
            return { success: false, error: 'Network error' };
        }
    }

    // Remove a location and all its users
    async removeLocation(locationId) {
        try {
            const response = await fetch('/remove_location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ location_id: locationId })
            });
            
            if (response.ok) {
                console.log(`Removed location: ${locationId}`);
                return true;
            } else {
                const error = await response.json();
                console.error('Failed to remove location:', error);
                return false;
            }
        } catch (error) {
            console.error('Error removing location:', error);
            return false;
        }
    }

    // Get all locations
    async getAllLocations() {
        try {
            const response = await fetch('/get_locations');
            if (response.ok) {
                return await response.json();
            } else {
                console.error('Failed to fetch locations');
                return [];
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
            return [];
        }
    }

    // Generate location dashboard URL
    getLocationDashboardUrl(locationCode) {
        return `/location-dashboard.html?location=${locationCode}`;
    }

    // Check if user has access to specific location
    hasLocationAccess(locationCode) {
        if (this.isAdmin) return true;
        return this.currentLocation == locationCode;
    }

    // Get user role for location
    getUserRole() {
        return this.currentUser?.role || 'viewer';
    }

    // Logout
    async logout() {
        try {
            await fetch('/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        this.currentUser = null;
        this.currentLocation = null;
        this.isAdmin = false;
        this.clearStoredAuth();

        // Redirect to login
        window.location.href = '/';
    }

    // Setup event listeners
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupLoginForms();
            this.setupLogoutButtons();
        });
    }

    setupLoginForms() {
        // Location login form
        const locationLoginForm = document.getElementById('location-login-form');
        if (locationLoginForm) {
            locationLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLocationLogin(e);
            });
        }

        // Admin login form
        const adminLoginForm = document.getElementById('admin-login-form');
        if (adminLoginForm) {
            adminLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAdminLogin(e);
            });
        }
    }

    setupLogoutButtons() {
        const logoutButtons = document.querySelectorAll('.logout-btn, [data-action="logout"]');
        logoutButtons.forEach(btn => {
            btn.addEventListener('click', () => this.logout());
        });
    }

    async handleLocationLogin(event) {
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');
        const locationCode = formData.get('location') || this.extractLocationFromUrl();

        const result = await this.authenticateLocation(username, password, locationCode);
        
        if (result.success) {
            window.location.href = result.redirectUrl;
        } else {
            this.showError(result.message);
        }
    }

    async handleAdminLogin(event) {
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');

        const result = await this.authenticateAdmin(username, password);
        
        if (result.success) {
            window.location.href = result.redirectUrl;
        } else {
            this.showError(result.message);
        }
    }

    extractLocationFromUrl() {
        const pathParts = window.location.pathname.split('/');
        return pathParts[1] || null;
    }

    showError(message) {
        // Create or update error display
        let errorDiv = document.getElementById('auth-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'auth-error';
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ef4444;
                color: white;
                padding: 16px 24px;
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
                z-index: 9999;
                font-weight: 600;
                animation: slideIn 0.3s ease;
            `;
            document.body.appendChild(errorDiv);
        }

        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (errorDiv) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // Initialize location-specific routing
    initLocationRouting() {
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split('/');
        
        // Check if this is a location-specific route
        if (pathParts.length >= 2 && pathParts[1] && pathParts[1] !== 'admin') {
            const locationCode = pathParts[1];
            
            // Verify access
            if (!this.hasLocationAccess(locationCode)) {
                // Redirect to location login
                this.redirectToLocationLogin(locationCode);
                return;
            }
            
            // Set up location-specific UI
            this.setupLocationUI(locationCode);
        }
        
        // Check admin routes
        if (currentPath.startsWith('/admin') && !this.isAdmin) {
            window.location.href = '/admin/login';
        }
    }

    redirectToLocationLogin(locationCode) {
        window.location.href = `/${locationCode}/login`;
    }

    setupLocationUI(locationCode) {
        // Add location branding
        this.addLocationBranding(locationCode);
        
        // Restrict navigation based on user role
        this.restrictNavigation();
        
        // Add location-specific features
        this.addLocationFeatures(locationCode);
    }

    addLocationBranding(locationCode) {
        const locationNames = {
            'downtown-spa': 'Downtown Spa & Wellness',
            'westside-beauty': 'Westside Beauty Lounge',
            'northgate-wellness': 'Northgate Wellness Center',
            'eastside-studio': 'Eastside Rejuvenation Studio',
            'southside-sanctuary': 'Southside Healing Sanctuary',
            'central-medical': 'Central City Medical Spa'
        };

        const locationName = locationNames[locationCode] || locationCode;
        
        // Update page title
        document.title = `${locationName} - MonuMe Tracker`;
        
        // Update header if exists
        const headerTitle = document.querySelector('.app-title, .location-title');
        if (headerTitle) {
            headerTitle.textContent = locationName;
        }
    }

    restrictNavigation() {
        const role = this.getUserRole();
        
        // Hide admin-only features for non-admin users
        if (role !== 'admin' && role !== 'manager') {
            const adminElements = document.querySelectorAll('[data-admin-only]');
            adminElements.forEach(el => el.style.display = 'none');
        }
        
        // Hide manager-only features for staff/viewers
        if (role === 'viewer') {
            const managerElements = document.querySelectorAll('[data-manager-only]');
            managerElements.forEach(el => el.style.display = 'none');
        }
    }

    addLocationFeatures(locationCode) {
        // Add location-specific customizations
        document.body.setAttribute('data-location', locationCode);
        document.body.setAttribute('data-user-role', this.getUserRole());
    }
}

// Initialize the multi-tenant authentication system
const multiTenantAuth = new MultiTenantAuth();
window.MultiTenantAuth = multiTenantAuth;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiTenantAuth;
} 