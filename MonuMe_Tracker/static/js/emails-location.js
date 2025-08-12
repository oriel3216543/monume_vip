// Location-Based Email Management JavaScript
// Handles email settings and template editing with location-based filtering

// Global variables
let currentUserRole = '';
let currentUserLocation = '';
let isCurrentUserAdmin = false;
let emailSettings = {};
let emailTemplates = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Email management page loaded');
    
    // Get current user information
    getCurrentUserInfo();
    
    // Check access permissions
    if (!checkAccessPermissions()) {
        return;
    }
    
    // Update page header based on user role
    updatePageHeader();
    
    // Load email settings based on location
    loadEmailSettings();
    
    // Initialize event listeners
    initializeEventListeners();
});

// Get current user information from localStorage
function getCurrentUserInfo() {
    currentUserRole = localStorage.getItem('role') || 'employee';
            currentUserLocation = localStorage.getItem('locationCode') || localStorage.getItem('location_username') || localStorage.getItem('location_name') || '';
    isCurrentUserAdmin = localStorage.getItem('isAdmin') === 'true';
    
    console.log(`User: ${localStorage.getItem('username')}, Role: ${currentUserRole}, Location: ${currentUserLocation}, Admin: ${isCurrentUserAdmin}`);
}

// Check access permissions
function checkAccessPermissions() {
    // Check if user is logged in
    const username = localStorage.getItem("username");
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    
    if (!username || !isLoggedIn) {
        window.location.href = "/";
        return false;
    }
    
    // Check if user has access to email management
    if (!isCurrentUserAdmin && currentUserRole !== 'manager') {
        showUnauthorizedModal();
        return false;
    }
    
    return true;
}

// Update page header based on user role
function updatePageHeader() {
    const pageTitle = document.querySelector('.page-title, h1');
    const pageSubtitle = document.querySelector('.page-subtitle, .page-description');
    
    if (pageTitle) {
        if (isCurrentUserAdmin) {
            pageTitle.textContent = 'Email Management - All Locations';
        } else {
            pageTitle.textContent = `Email Management - ${getLocationDisplayName(currentUserLocation)}`;
        }
    }
    
    if (pageSubtitle) {
        if (isCurrentUserAdmin) {
            pageSubtitle.textContent = 'Manage email templates and settings across all locations';
        } else {
            pageSubtitle.textContent = `Manage email templates and settings for ${getLocationDisplayName(currentUserLocation)}`;
        }
    }
}

// Load email settings based on location
async function loadEmailSettings() {
    try {
        // Show loading state
        showLoadingState();
        
        // Get email settings from backend
        const response = await fetch('/get-email-config');
        if (!response.ok) {
            throw new Error('Failed to fetch email settings');
        }
        
        const data = await response.json();
        emailSettings = data.settings || {};
        emailTemplates = data.templates || {};
        
        // Filter settings based on user role and location
        filterEmailSettingsByLocation();
        
        // Display settings
        displayEmailSettings();
        
        // Hide loading state
        hideLoadingState();
        
    } catch (error) {
        console.error('Error loading email settings:', error);
        hideLoadingState();
        showNotification('Error loading email settings: ' + error.message, 'error');
    }
}

// Filter email settings based on user role and location
function filterEmailSettingsByLocation() {
    if (isCurrentUserAdmin) {
        // Admin sees all settings
        return;
    } else {
        // Manager sees only their location's settings
        const locationKey = currentUserLocation;
        
        // Filter settings to only show current location
        if (emailSettings[locationKey]) {
            emailSettings = { [locationKey]: emailSettings[locationKey] };
        } else {
            emailSettings = {};
        }
        
        // Filter templates to only show current location
        if (emailTemplates[locationKey]) {
            emailTemplates = { [locationKey]: emailTemplates[locationKey] };
        } else {
            emailTemplates = {};
        }
    }
}

// Display email settings in the UI
function displayEmailSettings() {
    const settingsContainer = document.getElementById('email-settings-container');
    if (!settingsContainer) return;
    
    if (Object.keys(emailSettings).length === 0) {
        settingsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon"><i class="fas fa-envelope"></i></div>
                <h3>No Email Settings Found</h3>
                <p>${isCurrentUserAdmin ? 'No email settings configured for any location.' : `No email settings configured for ${getLocationDisplayName(currentUserLocation)}.`}</p>
                <button class="btn btn-primary" onclick="createDefaultSettings()">
                    <i class="fas fa-plus"></i> Create Default Settings
                </button>
            </div>`;
        return;
    }
    
    let settingsHTML = '';
    
    Object.keys(emailSettings).forEach(location => {
        const settings = emailSettings[location];
        const templates = emailTemplates[location] || {};
        
        settingsHTML += `
            <div class="email-settings-card" data-location="${location}">
                <div class="settings-header">
                    <h3>${getLocationDisplayName(location)}</h3>
                    <div class="location-badge">${location}</div>
                </div>
                
                <div class="settings-content">
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" 
                                   ${settings.auto_email_enabled ? 'checked' : ''} 
                                   onchange="updateSetting('${location}', 'auto_email_enabled', this.checked)">
                            Auto-send appointment emails
                        </label>
                    </div>
                    
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" 
                                   ${settings.daily_email_enabled ? 'checked' : ''} 
                                   onchange="updateSetting('${location}', 'daily_email_enabled', this.checked)">
                            Send daily summary emails
                        </label>
                    </div>
                    
                    <div class="setting-group">
                        <label class="setting-label">
                            <input type="checkbox" 
                                   ${settings.weekly_email_enabled ? 'checked' : ''} 
                                   onchange="updateSetting('${location}', 'weekly_email_enabled', this.checked)">
                            Send weekly summary emails
                        </label>
                    </div>
                    
                    <div class="setting-group">
                        <label class="setting-label">SMTP Server:</label>
                        <input type="text" 
                               value="${settings.smtp_server || ''}" 
                               onchange="updateSetting('${location}', 'smtp_server', this.value)"
                               placeholder="smtp.gmail.com">
                    </div>
                    
                    <div class="setting-group">
                        <label class="setting-label">SMTP Port:</label>
                        <input type="number" 
                               value="${settings.smtp_port || 587}" 
                               onchange="updateSetting('${location}', 'smtp_port', this.value)"
                               placeholder="587">
                    </div>
                    
                    <div class="setting-group">
                        <label class="setting-label">Email Username:</label>
                        <input type="email" 
                               value="${settings.email_username || ''}" 
                               onchange="updateSetting('${location}', 'email_username', this.value)"
                               placeholder="your-email@gmail.com">
                    </div>
                    
                    <div class="setting-group">
                        <label class="setting-label">Email Password:</label>
                        <input type="password" 
                               value="${settings.email_password || ''}" 
                               onchange="updateSetting('${location}', 'email_password', this.value)"
                               placeholder="App password">
                    </div>
                </div>
                
                <div class="templates-section">
                    <h4>Email Templates</h4>
                    <div class="template-group">
                        <label class="template-label">Appointment Confirmation:</label>
                        <textarea class="template-textarea" 
                                  onchange="updateTemplate('${location}', 'appointment_confirmation', this.value)"
                                  placeholder="Enter appointment confirmation template...">${templates.appointment_confirmation || ''}</textarea>
                    </div>
                    
                    <div class="template-group">
                        <label class="template-label">Appointment Reminder:</label>
                        <textarea class="template-textarea" 
                                  onchange="updateTemplate('${location}', 'appointment_reminder', this.value)"
                                  placeholder="Enter appointment reminder template...">${templates.appointment_reminder || ''}</textarea>
                    </div>
                    
                    <div class="template-group">
                        <label class="template-label">Daily Summary:</label>
                        <textarea class="template-textarea" 
                                  onchange="updateTemplate('${location}', 'daily_summary', this.value)"
                                  placeholder="Enter daily summary template...">${templates.daily_summary || ''}</textarea>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button class="btn btn-primary" onclick="testEmailSettings('${location}')">
                        <i class="fas fa-paper-plane"></i> Test Settings
                    </button>
                    <button class="btn btn-secondary" onclick="saveSettings('${location}')">
                        <i class="fas fa-save"></i> Save Settings
                    </button>
                </div>
            </div>
        `;
    });
    
    settingsContainer.innerHTML = settingsHTML;
}

// Update email setting
async function updateSetting(location, setting, value) {
    try {
        // Update local state
        if (!emailSettings[location]) {
            emailSettings[location] = {};
        }
        emailSettings[location][setting] = value;
        
        // Save to backend
        const response = await fetch('/save-email-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location: location,
                setting: setting,
                value: value
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save setting');
        }
        
        showNotification(`Setting updated for ${getLocationDisplayName(location)}`, 'success');
        
    } catch (error) {
        console.error('Error updating setting:', error);
        showNotification('Error updating setting: ' + error.message, 'error');
    }
}

// Update email template
async function updateTemplate(location, template, content) {
    try {
        // Update local state
        if (!emailTemplates[location]) {
            emailTemplates[location] = {};
        }
        emailTemplates[location][template] = content;
        
        // Save to backend
        const response = await fetch('/save-email-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location: location,
                template: template,
                content: content
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save template');
        }
        
        showNotification(`Template updated for ${getLocationDisplayName(location)}`, 'success');
        
    } catch (error) {
        console.error('Error updating template:', error);
        showNotification('Error updating template: ' + error.message, 'error');
    }
}

// Test email settings
async function testEmailSettings(location) {
    try {
        const testEmail = prompt('Enter test email address:');
        if (!testEmail) return;
        
        const response = await fetch('/test-email-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location: location,
                test_email: testEmail
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`Test email sent successfully to ${testEmail}`, 'success');
        } else {
            showNotification('Failed to send test email: ' + (data.error || 'Unknown error'), 'error');
        }
        
    } catch (error) {
        console.error('Error testing email settings:', error);
        showNotification('Error testing email settings: ' + error.message, 'error');
    }
}

// Save all settings for a location
async function saveSettings(location) {
    try {
        const response = await fetch('/save-email-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                location: location,
                settings: emailSettings[location],
                templates: emailTemplates[location]
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save settings');
        }
        
        showNotification(`Settings saved successfully for ${getLocationDisplayName(location)}`, 'success');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings: ' + error.message, 'error');
    }
}

// Create default settings
async function createDefaultSettings() {
    try {
        const location = isCurrentUserAdmin ? prompt('Enter location code:') : currentUserLocation;
        if (!location) return;
        
        const defaultSettings = {
            auto_email_enabled: true,
            daily_email_enabled: false,
            weekly_email_enabled: true,
            smtp_server: 'smtp.gmail.com',
            smtp_port: 587,
            email_username: '',
            email_password: ''
        };
        
        const defaultTemplates = {
            appointment_confirmation: `Hello {customerName},\n\nYour appointment is confirmed for {date} at {time}.\n\nLocation: {location}\nService: {service}\n\nThank you!`,
            appointment_reminder: `Hello {customerName},\n\nThis is a reminder for your appointment tomorrow at {time}.\n\nLocation: {location}\nService: {service}\n\nSee you soon!`,
            daily_summary: `Daily Summary for {date}\n\nTotal Appointments: {totalAppointments}\nCompleted: {completed}\nCancelled: {cancelled}\n\nRevenue: ${revenue}`
        };
        
        // Update local state
        emailSettings[location] = defaultSettings;
        emailTemplates[location] = defaultTemplates;
        
        // Save to backend
        await saveSettings(location);
        
        // Refresh display
        displayEmailSettings();
        
    } catch (error) {
        console.error('Error creating default settings:', error);
        showNotification('Error creating default settings: ' + error.message, 'error');
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Add any additional event listeners here
}

// Show loading state
function showLoadingState() {
    const container = document.getElementById('email-settings-container');
    if (container) {
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading email settings...</p>
            </div>
        `;
    }
}

// Hide loading state
function hideLoadingState() {
    // Loading state will be replaced by actual content
}

// Show unauthorized modal
function showUnauthorizedModal() {
    const modal = document.getElementById('unauthorized-modal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        alert('Access denied. You do not have permission to access email management.');
        window.location.href = 'dashboard.html';
    }
}

// Helper functions
function getLocationDisplayName(locationCode) {
    const locationMap = {
        'downtown-spa': 'Downtown Spa',
        'westside-beauty': 'Westside Beauty',
        'northgate-wellness': 'Northgate Wellness',
        'eastside-studio': 'Eastside Studio',
        'southside-sanctuary': 'Southside Sanctuary',
        'central-medical': 'Central Medical'
    };
    return locationMap[locationCode] || locationCode || 'Current Location';
}

// Enhanced notification function
function showNotification(message, type = 'info') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        padding: 15px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideInRight 0.3s ease-out;
    `;
    
    // Set color based on type
    const colors = {
        'success': '#10b981',
        'error': '#ef4444',
        'warning': '#f59e0b',
        'info': '#3b82f6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 18px;
            padding: 0;
            margin-left: 15px;
        ">&times;</button>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// Add CSS styles
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
    
    .email-settings-card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 24px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
    }
    
    .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .settings-header h3 {
        margin: 0;
        color: #333;
        font-size: 1.5rem;
    }
    
    .location-badge {
        background: #ff9562;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
    }
    
    .setting-group {
        margin-bottom: 16px;
    }
    
    .setting-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: #333;
    }
    
    .setting-label input[type="text"],
    .setting-label input[type="email"],
    .setting-label input[type="password"],
    .setting-label input[type="number"] {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        margin-top: 4px;
    }
    
    .templates-section {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #e5e7eb;
    }
    
    .templates-section h4 {
        margin: 0 0 16px 0;
        color: #333;
    }
    
    .template-group {
        margin-bottom: 16px;
    }
    
    .template-label {
        display: block;
        font-weight: 500;
        color: #333;
        margin-bottom: 8px;
    }
    
    .template-textarea {
        width: 100%;
        min-height: 100px;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-family: inherit;
        resize: vertical;
    }
    
    .settings-actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #e5e7eb;
    }
    
    .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
    }
    
    .btn-primary {
        background: #ff9562;
        color: white;
    }
    
    .btn-primary:hover {
        background: #ff7f42;
        transform: translateY(-2px);
    }
    
    .btn-secondary {
        background: #6b7280;
        color: white;
    }
    
    .btn-secondary:hover {
        background: #4b5563;
        transform: translateY(-2px);
    }
    
    .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: #666;
    }
    
    .empty-state__icon {
        font-size: 48px;
        color: #ccc;
        margin-bottom: 20px;
    }
    
    .empty-state h3 {
        margin-bottom: 10px;
        color: #333;
    }
    
    .empty-state p {
        color: #666;
        line-height: 1.5;
        margin-bottom: 24px;
    }
    
    .loading-state {
        text-align: center;
        padding: 40px;
        color: #666;
    }
    
    .loading-state i {
        font-size: 24px;
        margin-bottom: 16px;
    }
`;
document.head.appendChild(style); 