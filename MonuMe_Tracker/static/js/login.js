/**
 * MonuMe VIP Login System
 * Handles unified login for both admin and location users
 */

class MonuMeLogin {
    constructor() {
        this.isAuthenticating = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createBackgroundElements();
        this.checkServerConnection();
    }

    setupEventListeners() {
        // Form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Input validation
        const inputs = document.querySelectorAll('.form-input');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.clearMessages());
        });
    }

    createBackgroundElements() {
        const container = document.getElementById('bgElements');
        if (!container) return;

        const numberOfElements = 15;
        
        for (let i = 0; i < numberOfElements; i++) {
            const element = document.createElement('div');
            element.className = 'bg-circle';
            
            const size = Math.random() * 100 + 50;
            element.style.width = `${size}px`;
            element.style.height = `${size}px`;
            element.style.left = `${Math.random() * 100}%`;
            element.style.top = `${Math.random() * 100}%`;
            element.style.opacity = Math.random() * 0.3 + 0.1;
            
            const duration = Math.random() * 20 + 15;
            element.style.animationDuration = `${duration}s`;
            element.style.animationDelay = `${Math.random() * 10}s`;
            
            container.appendChild(element);
        }
    }

    async checkServerConnection() {
        try {
            const response = await fetch('/api/health', {
                method: 'GET',
                timeout: 5000
            });
            
            if (!response.ok) {
                console.warn('Server health check failed');
            }
        } catch (error) {
            console.warn('Server connection check failed:', error);
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        if (this.isAuthenticating) return;
        
        const username = document.getElementById('username')?.value?.trim();
        const password = document.getElementById('password')?.value?.trim();
        
        if (!username || !password) {
            this.showError('Please enter both username and password');
            return;
        }
        
        await this.performLogin(username, password);
    }

    async performLogin(username, password) {
        this.isAuthenticating = true;
        const loginBtn = document.getElementById('loginBtn');
        const originalText = loginBtn?.innerHTML;
        
        // Update UI
        this.updateLoginButton(true);
        this.clearMessages();
        
        try {
            console.log('Attempting login for:', username);
            
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                }),
                credentials: 'same-origin'
            });
            
            console.log('Login response status:', response.status);
            
            const data = await response.json();
            console.log('Login response data:', data);
            
            if (response.ok && data.success) {
                await this.handleLoginSuccess(data);
            } else {
                // Handle specific error cases
                if (response.status === 500) {
                    this.handleLoginError('Server error: Please try again or contact administrator.');
                } else if (response.status === 401) {
                    this.handleLoginError(data.message || 'Invalid username or password');
                } else if (response.status === 400) {
                    this.handleLoginError(data.message || 'Please check your input');
                } else {
                    this.handleLoginError(data.message || 'Authentication failed');
                }
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.handleLoginError('Network error. Please check your connection and try again.');
        } finally {
            this.isAuthenticating = false;
            this.updateLoginButton(false, originalText);
        }
    }

    async handleLoginSuccess(data) {
        this.showSuccess('Authentication successful! Redirecting...');
        
        // Store authentication data
        const authData = {
            username: data.user.username,
            role: data.user.role,
            user_id: data.user.id,
            location_id: data.user.location_id || '',
            locationCode: data.user.location_username || data.user.location_name || data.user.location_id || '',
            location_name: data.user.location_name || data.user.name || '',
            isAdmin: data.user.role === 'admin',
            isLoggedIn: true,
            login_type: data.user.role === 'admin' ? 'admin' : (data.user.role === 'location_manager' ? 'location_manager' : 'location'),
            loginTime: new Date().toISOString()
        };

        // Store in localStorage
        Object.entries(authData).forEach(([key, value]) => {
            localStorage.setItem(key, String(value));
        });

        // Redirect based on user role
        setTimeout(() => {
            if (data.user.role === 'admin') {
                window.location.href = '/dashboard';
            } else if (data.user.role === 'location_manager') {
                window.location.href = '/dashboard';  // Location users also go to dashboard
            } else {
                window.location.href = '/dashboard';
            }
        }, 1500);
    }

    handleLoginError(message) {
        this.showError(message);
        
        // Clear password field for security
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    updateLoginButton(isLoading, originalText = null) {
        const loginBtn = document.getElementById('loginBtn');
        if (!loginBtn) return;

        if (isLoading) {
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
            loginBtn.disabled = true;
        } else {
            loginBtn.innerHTML = originalText || '<i class="fas fa-sign-in-alt"></i> Sign In';
            loginBtn.disabled = false;
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
        
        if (successDiv) {
            successDiv.style.display = 'none';
        }

        // Auto-hide after 5 seconds
        setTimeout(() => this.clearMessages(), 5000);
    }

    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        const errorDiv = document.getElementById('errorMessage');
        
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
        }
        
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    clearMessages() {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        
        if (errorDiv) errorDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'none';
    }

    // Static method to check if user is already logged in (without auto-redirect)
    static checkExistingLogin() {
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const loginTime = localStorage.getItem('loginTime');
        const role = localStorage.getItem('role');

        if (isLoggedIn === 'true' && loginTime && role) {
            // Check if login is still valid (24 hours)
            const loginDate = new Date(loginTime);
            const now = new Date();
            const hoursDiff = (now - loginDate) / (1000 * 60 * 60);

            if (hoursDiff < 24) {
                // Return true if valid login exists, but don't auto-redirect
                // This allows users to manually access the login page if needed
                return true;
            } else {
                // Clear expired login
                MonuMeLogin.clearAuthData();
            }
        }
        return false;
    }

    // Static method to clear authentication data
    static clearAuthData() {
        const authKeys = [
            'username', 'role', 'user_id', 'location_id', 
            'locationCode', 'location_name', 'location_username',
            'isAdmin', 'isLoggedIn', 'login_type', 'loginTime'
        ];
        
        authKeys.forEach(key => localStorage.removeItem(key));
    }

    // Static method to logout and clear session (for login page)
    static logoutAndClearSession() {
        // Clear localStorage data
        MonuMeLogin.clearAuthData();
        
        // Clear any server-side session
        fetch('/api/logout', {
            method: 'POST',
            credentials: 'same-origin'
        }).catch(err => console.log('Logout API call failed:', err));
        
        // Refresh the page to show clean login form
        window.location.reload();
    }

    // Static method to get current user data
    static getCurrentUser() {
        if (localStorage.getItem('isLoggedIn') !== 'true') {
            return null;
        }

        return {
            username: localStorage.getItem('username'),
            role: localStorage.getItem('role'),
            user_id: localStorage.getItem('user_id'),
            location_id: localStorage.getItem('location_id'),
            locationCode: localStorage.getItem('locationCode'),
            location_name: localStorage.getItem('location_name'),
            location_username: localStorage.getItem('location_username'),
            isAdmin: localStorage.getItem('isAdmin') === 'true',
            login_type: localStorage.getItem('login_type')
        };
    }
}

// Initialize login system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Always start from a clean state on the login page to avoid stale sessions
    try { MonuMeLogin.clearAuthData(); } catch (e) { /* ignore */ }
    fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(()=>{});

    // Initialize the login instance
    window.monumeLogin = new MonuMeLogin();
});

// Export for use in other scripts
window.MonuMeLogin = MonuMeLogin; 