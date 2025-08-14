/**
 * MonuMe Tracker Sidebar Loader - Optimized for Immediate Loading
 * Ensures consistent sidebar loading across all pages with instant display
 */

class SidebarLoader {
    constructor() {
        this.sidebarContainer = null;
        this.isLoaded = false;
        this.retryCount = 0;
        this.maxRetries = 2;
        this.sidebarCache = null;
        this.initAttempted = false;
    }

    // Initialize sidebar loading with immediate display
    init() {
        // Prevent multiple initialization attempts
        if (this.initAttempted) {
            return;
        }
        this.initAttempted = true;

        console.log('SidebarLoader: Initializing with immediate loading...');
        
        // Check if sidebar already exists
        if (document.querySelector('.sidebar')) {
            console.log('SidebarLoader: Sidebar already exists');
            this.isLoaded = true;
            this.setupSidebar();
            return;
        }

        // Ensure DOM is ready before proceeding
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeSidebar();
            });
        } else {
            this.initializeSidebar();
        }
    }

    // Initialize sidebar after DOM is ready
    initializeSidebar() {
        // Double-check that body exists
        if (!document.body) {
            console.log('SidebarLoader: Document body not ready, retrying...');
            setTimeout(() => this.initializeSidebar(), 50);
            return;
        }

        // Create sidebar container immediately
        this.createSidebarContainer();
        
        // Show immediate fallback while loading
        this.showImmediateSidebar();
        
        // Load full sidebar content in background
        this.loadSidebarBackground();
    }

    // Create sidebar container
    createSidebarContainer() {
        // Remove any existing sidebar containers
        const existingContainer = document.getElementById('sidebar-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Create new sidebar container
        this.sidebarContainer = document.createElement('div');
        this.sidebarContainer.id = 'sidebar-container';
        this.sidebarContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 280px;
            height: 100vh;
            z-index: 1000;
            background: #ff9562;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        `;

        // Insert at the beginning of body
        document.body.insertBefore(this.sidebarContainer, document.body.firstChild);

        // Adjust main content immediately
        this.adjustMainContent();
    }

    // Show immediate sidebar with basic structure
    showImmediateSidebar() {
        const immediateHTML = `
            <div class="sidebar">
                <div class="sidebar-header">
                    <div class="sidebar-brand">
                        <a href="/dashboard" title="Go to Dashboard">
                            <div class="logo-container">
                                <div class="logo-fallback">M</div>
                            </div>
                        </a>
                    </div>
                </div>
                
                <nav class="sidebar-navigation">
                    <ul class="sidebar-menu">
                        <li class="menu-item">
                            <a href="/dashboard" class="menu-link">
                                <div class="menu-icon">
                                    <i class="fas fa-chart-pie"></i>
                                </div>
                                <span class="menu-text">Dashboard</span>
                            </a>
                        </li>
                        
                        <li class="menu-item">
                            <a href="/management" class="menu-link">
                                <div class="menu-icon">
                                    <i class="fas fa-cogs"></i>
                                </div>
                                <span class="menu-text">Management</span>
                            </a>
                        </li>
                        
                        <li class="menu-item">
                            <a href="/tracking" class="menu-link">
                                <div class="menu-icon">
                                    <i class="fas fa-chart-line"></i>
                                </div>
                                <span class="menu-text">Performance</span>
                            </a>
                        </li>
                        
                        <li class="menu-item">
                            <a href="/appointment" class="menu-link">
                                <div class="menu-icon">
                                    <i class="fas fa-calendar-check"></i>
                                </div>
                                <span class="menu-text">Appointments</span>
                            </a>
                        </li>

                        <!-- Appointments (no .html) -->
                        <li class="menu-item">
                            <a href="/appointment" class="menu-link">
                                <div class="menu-icon">
                                    <i class="fas fa-calendar-check"></i>
                                </div>
                                <span class="menu-text">Appointments</span>
                            </a>
                        </li>
                    </ul>
                </nav>
                
                <div class="sidebar-footer">
                    <div class="user-profile" id="user-profile">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-info">
                            <div class="user-name" id="user-name">Loading...</div>
                            <div class="user-status" id="user-status">Online</div>
                        </div>
                        <div class="user-menu-toggle">
                            <i class="fas fa-chevron-down"></i>
                        </div>
                        
                        <!-- Sign Out Button - Shows on Hover -->
                        <div class="sign-out-button" onclick="signOut()">
                            <i class="fas fa-sign-out-alt"></i>
                            <span>Sign Out</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.sidebarContainer.innerHTML = immediateHTML;
        
        // Apply immediate styles
        this.applyImmediateStyles();
        
        // Load external resources immediately
        this.loadExternalResources();
        
        // Setup basic functionality
        this.setupBasicSidebar();
        
        // Load user data immediately
        this.loadUserDataImmediately();
        
        console.log('SidebarLoader: Immediate sidebar displayed');
    }

    // Apply immediate styles for instant appearance
    applyImmediateStyles() {
        // Load immediate CSS file for instant styling
        if (!document.querySelector('link[href*="sidebar-styles.css"]')) {
            const immediateCSS = document.createElement('link');
            immediateCSS.href = '/sidebar-styles.css';
            immediateCSS.rel = 'stylesheet';
            document.head.appendChild(immediateCSS);
        }
        
        // Also inject critical styles inline for immediate effect
        const immediateStyles = `
            <style>
                :root {
                    --main-color: #ff9562;
                    --text-primary: #ffffff;
                    --text-secondary: rgba(255, 255, 255, 0.9);
                    --border-color: rgba(255, 255, 255, 0.2);
                    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    --border-radius: 12px;
                }

                .sidebar {
                    width: 280px;
                    background: linear-gradient(180deg, var(--main-color) 0%, #e8824d 100%);
                    min-height: 100vh;
                    position: fixed;
                    left: 0;
                    top: 0;
                    z-index: 100;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
                    border-right: 1px solid rgba(255, 255, 255, 0.3);
                    display: flex;
                    flex-direction: column;
                    font-family: 'Inter', 'Poppins', sans-serif;
                }

                .sidebar-header {
                    padding: 32px 24px 24px;
                    border-bottom: 1px solid var(--border-color);
                    background: rgba(255, 255, 255, 0.1);
                }

                .sidebar-brand a {
                    text-decoration: none;
                    color: inherit;
                    display: block;
                }

                .logo-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 8px;
                    width: 100%;
                    min-height: 80px;
                }

                .logo-fallback {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 60px;
                    height: 60px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    color: white;
                    font-size: 24px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 4px 16px rgba(255, 255, 255, 0.2);
                }

                .sidebar-navigation {
                    flex: 1;
                    overflow-y: auto;
                    padding: 40px 0;
                }

                .sidebar-menu {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .menu-item {
                    margin: 0 16px;
                    border-radius: var(--border-radius);
                    overflow: hidden;
                }

                .menu-link {
                    display: flex;
                    align-items: center;
                    padding: 18px 20px;
                    color: var(--text-secondary);
                    text-decoration: none;
                    font-size: 16px;
                    font-weight: 500;
                    border-radius: var(--border-radius);
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: var(--transition);
                }

                .menu-icon {
                    width: 44px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 10px;
                    margin-right: 16px;
                    font-size: 18px;
                    color: var(--text-primary);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .menu-text {
                    flex: 1;
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .menu-item:hover .menu-link {
                    background: rgba(255, 255, 255, 0.2);
                    transform: translateX(6px);
                    border-color: rgba(255, 255, 255, 0.4);
                }

                .menu-item:hover .menu-icon {
                    background: rgba(255, 255, 255, 0.3);
                    box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
                }

                .sidebar-footer {
                    padding: 24px;
                    border-top: 1px solid var(--border-color);
                    background: rgba(255, 255, 255, 0.1);
                }

                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: var(--border-radius);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                }

                .user-avatar {
                    width: 40px;
                    height: 40px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }

                .user-info {
                    flex: 1;
                }

                .user-name {
                    color: var(--text-primary);
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 2px;
                }

                .user-status {
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .user-status::before {
                    content: '';
                    width: 6px;
                    height: 6px;
                    background: #4caf50;
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }

                .user-menu-toggle {
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 12px;
                    transition: var(--transition);
                }

                .user-profile:hover .user-menu-toggle {
                    color: white;
                    transform: rotate(180deg);
                }

                /* Sign Out Button - Shows on Hover */
                .sign-out-button {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(239, 68, 68, 0.9);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    color: white;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    opacity: 0;
                    visibility: hidden;
                    transform: scale(0.95);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: var(--border-radius);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
                }

                .user-profile:hover .sign-out-button {
                    opacity: 1;
                    visibility: visible;
                    transform: scale(1);
                }

                .sign-out-button:hover {
                    background: rgba(239, 68, 68, 1);
                    transform: scale(1.02);
                    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
                }

                .sign-out-button i {
                    font-size: 16px;
                }

                .sign-out-button span {
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }



                @media screen and (max-width: 992px) {
                    .sidebar {
                        width: 72px;
                    }
                    
                    .menu-text,
                    .user-info {
                        display: none;
                    }
                    
                    .sidebar-header {
                        padding: 24px 12px;
                    }
                    
                    .menu-item {
                        margin: 0 8px 8px;
                    }
                    
                    .menu-link {
                        justify-content: center;
                        padding: 16px 12px;
                    }
                    
                    .menu-icon {
                        margin-right: 0;
                    }
                    
                    .sidebar-footer {
                        padding: 16px 12px;
                    }
                    
                    .user-profile {
                        justify-content: center;
                        padding: 12px 8px;
                    }

                    .sign-out-button {
                        font-size: 12px;
                        gap: 6px;
                    }

                    .sign-out-button span {
                        display: none;
                    }
                }

                @media screen and (max-width: 768px) {
                    .sidebar {
                        transform: translateX(-100%);
                        width: 280px;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', immediateStyles);
    }

    // Adjust main content to accommodate sidebar
    adjustMainContent() {
        const mainContent =
            document.querySelector('main') ||
            document.querySelector('.content-area') ||
            document.querySelector('.main-content') ||
            document.querySelector('.content');

        if (mainContent) {
            mainContent.style.marginLeft = '280px';
            if (!mainContent.style.width) {
                mainContent.style.width = 'calc(100% - 280px)';
            }
            // Clear any body-level offset set elsewhere
            document.body.style.marginLeft = '0px';
        } else {
            // As a last resort, adjust body
            document.body.style.marginLeft = '280px';
            document.body.style.transition = 'margin-left 0.3s ease';
        }
    }

    // Load sidebar content in background (non-blocking)
    async loadSidebarBackground() {
        try {
            console.log('SidebarLoader: Loading full sidebar content in background...');
            
            // Check cache first
            if (this.sidebarCache) {
                this.updateSidebarContent(this.sidebarCache);
                return;
            }
            
            const response = await fetch('/sidebar-template.html');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const sidebarHTML = await response.text();
            
            // Cache the result
            this.sidebarCache = sidebarHTML;
            
            // Extract the sidebar content
            const sidebarMatch = sidebarHTML.match(/<div class="sidebar">([\s\S]*?)<\/div>\s*<style>/);
            
            if (sidebarMatch) {
                const sidebarContent = `<div class="sidebar">${sidebarMatch[1]}</div>`;
                this.updateSidebarContent(sidebarContent);
                
                // Extract and inject additional styles
                const styleMatch = sidebarHTML.match(/<style>([\s\S]*?)<\/style>/);
                if (styleMatch) {
                    const styleElement = document.createElement('style');
                    styleElement.textContent = styleMatch[1];
                    document.head.appendChild(styleElement);
                }
                
                // Extract and inject scripts
                const scriptMatch = sidebarHTML.match(/<script>([\s\S]*?)<\/script>/);
                if (scriptMatch) {
                    const scriptElement = document.createElement('script');
                    scriptElement.textContent = scriptMatch[1];
                    document.head.appendChild(scriptElement);
                }
                
                this.isLoaded = true;
                this.setupSidebar();
                
                console.log('SidebarLoader: Full sidebar content loaded');
                
                // Dispatch custom event
                document.dispatchEvent(new CustomEvent('sidebarLoaded'));
                
            } else {
                throw new Error('Could not parse sidebar content');
            }
            
        } catch (error) {
            console.error('SidebarLoader: Error loading full sidebar content:', error);
            // Don't retry for background loading - immediate sidebar is already shown
        }
    }

    // Update sidebar content without blocking
    updateSidebarContent(newContent) {
        if (this.sidebarContainer) {
            this.sidebarContainer.innerHTML = newContent;
        }
    }

    // Load external resources immediately
    loadExternalResources() {
        // Load Google Fonts
        if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
            const fontLink = document.createElement('link');
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700;800&display=swap';
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
        }

        // Load Font Awesome
        if (!document.querySelector('link[href*="font-awesome"]')) {
            const faLink = document.createElement('link');
            faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
            faLink.rel = 'stylesheet';
            document.head.appendChild(faLink);
        }
    }

    // Setup basic sidebar functionality immediately
    setupBasicSidebar() {
        // Highlight current page
        this.highlightCurrentPage();
        
        // Setup responsive behavior
        this.setupResponsive();
        
        // Start periodic user data refresh
        this.startUserDataRefresh();
        
        // Setup user event listeners
        this.setupUserEventListeners();
        
        console.log('SidebarLoader: Basic sidebar setup complete');
    }

    // Load user data immediately
    async loadUserDataImmediately() {
        try {
            console.log('SidebarLoader: Loading user data...');
            
            const response = await fetch('/get_current_user', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('SidebarLoader: User data response:', data);
                
                if (data.success && data.user) {
                    this.updateUserDisplay(data.user);
                    console.log('SidebarLoader: User data loaded successfully:', data.user.name);
                } else {
                    console.log('SidebarLoader: No user data found in response');
                    this.loadUserFromLocalStorage();
                }
            } else {
                console.log('SidebarLoader: Failed to get current user, status:', response.status);
                this.loadUserFromLocalStorage();
            }
        } catch (error) {
            console.error('SidebarLoader: Error loading current user:', error);
            this.loadUserFromLocalStorage();
        }
    }

    // Load user data from localStorage as fallback
    loadUserFromLocalStorage() {
        console.log('SidebarLoader: Loading user data from localStorage...');
        
        const username = localStorage.getItem('username');
        const role = localStorage.getItem('role');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        
        if (username && isLoggedIn === 'true') {
            const user = {
                name: username,
                username: username,
                role: role || 'user',
                id: localStorage.getItem('user_id'),
                location_id: localStorage.getItem('location_id'),
                location_name: localStorage.getItem('location_name')
            };
            
            this.updateUserDisplay(user);
            console.log('SidebarLoader: User data loaded from localStorage:', user.name);
        } else {
            this.updateUserDisplay(null);
            console.log('SidebarLoader: No user data found in localStorage');
        }
    }

    // Refresh user data periodically
    startUserDataRefresh() {
        // Refresh user data every 30 seconds
        setInterval(() => {
            this.loadUserDataImmediately();
        }, 30000);
    }

    // Handle user login/logout events
    setupUserEventListeners() {
        // Listen for storage changes (when user logs in/out in another tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'isLoggedIn' || e.key === 'username' || e.key === 'role') {
                console.log('SidebarLoader: User data changed, refreshing...');
                this.loadUserDataImmediately();
            }
        });

        // Listen for custom login/logout events
        document.addEventListener('userLoggedIn', () => {
            console.log('SidebarLoader: User login event detected, refreshing...');
            this.loadUserDataImmediately();
        });

        document.addEventListener('userLoggedOut', () => {
            console.log('SidebarLoader: User logout event detected, clearing...');
            this.updateUserDisplay(null);
        });
    }
    
    // Update user display in sidebar
    updateUserDisplay(user) {
        const userNameElement = document.getElementById('user-name');
        const userStatusElement = document.getElementById('user-status');
        
        console.log('SidebarLoader: Updating user display with:', user);
        
        if (userNameElement && userStatusElement) {
            if (user) {
                // Display user name (prefer display name over username)
                const displayName = user.name || user.username || 'User';
                userNameElement.textContent = displayName;
                
                // Display role-based status
                const role = user.role || 'user';
                let statusText = 'User';
                
                if (role === 'admin') {
                    statusText = 'Administrator';
                } else if (role === 'location_manager') {
                    statusText = 'Location Manager';
                } else if (role === 'manager') {
                    statusText = 'Manager';
                }
                
                userStatusElement.textContent = statusText;
                
                // Update localStorage for consistency
                localStorage.setItem('username', user.username || user.name);
                localStorage.setItem('role', role);
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('user_id', user.id);
                
                if (user.location_id) {
                    localStorage.setItem('location_id', user.location_id);
                }
                if (user.location_name) {
                    localStorage.setItem('location_name', user.location_name);
                }
                
                console.log('SidebarLoader: User display updated successfully');
            } else {
                userNameElement.textContent = 'Not Logged In';
                userStatusElement.textContent = 'Offline';
                console.log('SidebarLoader: User display set to offline state');
            }
        } else {
            console.log('SidebarLoader: User display elements not found, retrying...');
            // Retry after a short delay if elements aren't found
            setTimeout(() => {
                this.updateUserDisplay(user);
            }, 100);
        }
    }

    // Highlight current page in sidebar
    highlightCurrentPage() {
        const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        const menuItems = document.querySelectorAll('.sidebar-menu li');
        
        menuItems.forEach(item => {
            const link = item.querySelector('a');
            if (link) {
                const href = link.getAttribute('href');
                if (href === currentPage || (currentPage === '' && href === 'dashboard.html')) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            }
        });
    }

    // Setup responsive behavior
    setupResponsive() {
        const handleResize = () => {
            if (window.innerWidth <= 992) {
                document.body.classList.add('sidebar-collapsed');
            } else {
                document.body.classList.remove('sidebar-collapsed');
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
    }

    // Setup sidebar functionality (called after full content loads)
    setupSidebar() {
        if (!this.isLoaded) return;

        // Additional setup can be added here
        console.log('SidebarLoader: Full sidebar setup complete');
    }

    // Toggle sidebar (for mobile)
    toggleSidebar() {
        document.body.classList.toggle('sidebar-open');
    }

    // Close sidebar (for mobile)
    closeSidebar() {
        document.body.classList.remove('sidebar-open');
    }
}

// Global sidebar loader instance
window.sidebarLoader = new SidebarLoader();

// Initialize when DOM is ready or immediately if already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.sidebarLoader.init();
    });
} else {
    // DOM is already ready, initialize immediately
    window.sidebarLoader.init();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarLoader;
}



window.signOut = async function() {
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
            
            // Update sidebar user display
            if (window.sidebarLoader) {
                window.sidebarLoader.updateUserDisplay(null);
            }
            
            // Trigger logout event
            document.dispatchEvent(new CustomEvent('userLoggedOut'));
            
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
};

// Notification function (if not already defined)
window.showNotification = function(message, type = 'info') {
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
}; 