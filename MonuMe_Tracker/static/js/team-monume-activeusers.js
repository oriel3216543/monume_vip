// 🚀 Enhanced Modal System for Team MonuMe with Password Confirmation and Force Out
console.log('🔥 Loading Enhanced Team MonuMe Modal System...');

// ===== Server-backed users (location-aware) =====
let __allowedUsersCache = null;
async function fetchAllowedUsers() {
    try {
        if (__allowedUsersCache) return __allowedUsersCache;
        const resp = await fetch('/api/users?all=true', {
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!resp.ok) throw new Error('Failed to fetch users');
        const data = await resp.json();
        const list = (data && data.success && Array.isArray(data.users)) ? data.users : [];
        // Normalize shape
        __allowedUsersCache = list.map(u => ({
            id: String(u.id),
            username: u.username || u.name || String(u.id),
            fullName: u.name || u.username,
            role: (u.role || 'user').toLowerCase(),
            locationId: u.location_id,
            locationName: u.location_name
        }));
        return __allowedUsersCache;
    } catch (e) {
        console.error('fetchAllowedUsers error:', e);
        return [];
    }
}

async function fetchCurrentUser() {
    try {
        const resp = await fetch('/get_current_user', {
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data && data.authenticated && data.user) {
            return data.user; // {name, username, role, location_id, ...}
        }
    } catch (e) { console.error('fetchCurrentUser error:', e); }
    return null;
}

// Global variables for selected user and current operations
let selectedUser = null;
let targetForceOutUser = null;
let targetInactiveUser = null;

// Quick success message function
function showQuickSuccessMessage(message) {
    // Create success overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 15000;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.3s ease;
    `;
    
    // Create success message box
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        background: linear-gradient(135deg, #4caf50, #81c784);
        color: white;
        padding: 30px 40px;
        border-radius: 20px;
        font-size: 24px;
        font-weight: 600;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: successPop 0.5s ease;
        max-width: 80%;
    `;
    
    messageBox.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
        <div>${message}</div>
        <div style="font-size: 16px; margin-top: 10px; opacity: 0.9;">Redirecting to tracking page...</div>
    `;
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes successPop {
            0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }
            50% { transform: scale(1.1) rotate(5deg); }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);
    
    // Remove after 1.8 seconds
    setTimeout(() => {
        overlay.remove();
        style.remove();
    }, 1800);
}

// User database setup
function setupUserDatabase() {
    console.log('🔧 Setting up user database...');
    
    // No longer seed local demo users; rely on server API filtering by role/location
    console.log('➡️ Using server-side users via /api/users (location-aware)');

    // Initialize active users
    if (!localStorage.getItem('activeUsers')) {
        localStorage.setItem('activeUsers', JSON.stringify([]));
        console.log('✅ Active users storage initialized');
    }
    
    console.log('✅ User database setup complete');
}

// Update active user count display
function updateActiveUsersCount() {
    const activeUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]');
    const activeUsersElement = document.getElementById('activeUsers');
    if (activeUsersElement) {
        activeUsersElement.textContent = activeUsers.length;
    }
}

// ===== USER SELECTION MODAL =====
function openUserModal() {
    console.log('🎯 Opening user selection modal...');
    
    const modal = document.getElementById('user-modal');
    const usersGrid = document.getElementById('users-grid');
    
    if (!modal || !usersGrid) {
        alert('Modal not ready. Please refresh the page.');
        return;
    }

    // Get all users and active users
    const allUsers = await fetchAllowedUsers();
    const activeUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]');
    const activeUsernames = activeUsers.map(user => user.username);

    // Clear and populate grid
    usersGrid.innerHTML = '';

    // Filter out already active users
    const availableUsers = allUsers.filter(user => !activeUsernames.includes(user.username));

    if (availableUsers.length === 0) {
        usersGrid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1/-1; padding: 20px;">All users are currently active</p>';
    } else {
        availableUsers.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            userCard.innerHTML = `
                <div class="user-name">${user.fullName || user.username}</div>
                <div class="user-role">${(user.role || '').toString()}</div>
            `;
            userCard.onclick = () => selectUserForPassword(user);
            usersGrid.appendChild(userCard);
        });
    }

    // Show modal
    modal.style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

// ===== PASSWORD CONFIRMATION MODAL =====
function selectUserForPassword(user) {
    console.log('👤 User selected for password confirmation:', user.username);
    selectedUser = user;
    
    // Close user selection modal
    closeUserModal();
    
    // Open password confirmation modal
    const passwordModal = document.getElementById('password-modal');
    const userNameEl = document.getElementById('password-user-name');
    const userRoleEl = document.getElementById('password-user-role');
    const passwordInput = document.getElementById('password-input');
    
    userNameEl.textContent = user.fullName || user.username;
    userRoleEl.textContent = user.role;
    passwordInput.value = '';
    
    passwordModal.style.display = 'flex';
    
    // Focus on password input
    setTimeout(() => {
        passwordInput.focus();
    }, 100);
}

function closePasswordModal() {
    document.getElementById('password-modal').style.display = 'none';
    selectedUser = null;
    
    // Clear password field
    document.getElementById('password-input').value = '';
}

function confirmPassword() {
    const passwordInput = document.getElementById('password-input');
    const enteredPassword = passwordInput.value;
    
    if (!selectedUser) {
        alert('❌ Error: No user selected');
        return;
    }
    
    if (!enteredPassword) {
        alert('❌ Please enter a password');
        passwordInput.focus();
        return;
    }
    
    if (!selectedUser.password || enteredPassword === selectedUser.password) {
        // Add to active users
    const activeUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]');
    activeUsers.push({
            username: selectedUser.username,
            fullName: selectedUser.fullName,
        role: selectedUser.role,
            department: selectedUser.department,
            startTime: new Date().toISOString(),
            sessionId: Date.now()
        });
        localStorage.setItem('activeUsers', JSON.stringify(activeUsers));
        
        // Update count and close modal
        updateActiveUsersCount();
        closePasswordModal();
        
        // Show quick success message immediately
        showQuickSuccessMessage(`${selectedUser.fullName || selectedUser.username} is now active!`);
        
        // Redirect to tracking.html after showing success message
        setTimeout(() => {
            window.location.href = 'tracking.html';
        }, 2000);
        
        console.log('🎉 User activated successfully! Redirecting to tracking.html...');
    } else {
        alert('❌ Invalid password. Please try again.');
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// ===== ACTIVE USERS MANAGEMENT MODAL =====
function openActiveUsersModal() {
    console.log('👥 Opening active users management modal...');
    
    const modal = document.getElementById('active-users-modal');
    const activeUsersList = document.getElementById('active-users-list');
    
    if (!modal || !activeUsersList) {
        alert('Active users modal not ready. Please refresh the page.');
        return;
    }
    
    // Get active users
    const activeUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]');
    
    // Clear and populate list
    activeUsersList.innerHTML = '';
    
    if (activeUsers.length === 0) {
        activeUsersList.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No active users at the moment</p>';
        } else {
        // Get system users for accurate display names
    const allSystemUsers = await fetchAllowedUsers();
        
        activeUsers.forEach(user => {
            // Find the system user to get accurate details
            const systemUser = allSystemUsers.find(sysUser => sysUser.username === user.username);
            const displayName = systemUser ? (systemUser.fullName || systemUser.username) : (user.fullName || user.username);
            const displayRole = systemUser ? systemUser.role : (user.role || 'Employee');
            
            const startTime = new Date(user.startTime);
            const duration = Math.floor((new Date() - startTime) / 1000 / 60); // minutes
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            
            const userItem = document.createElement('div');
            userItem.className = 'active-user-item';
            userItem.innerHTML = `
                <div class="active-user-info">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-details">
                        <div class="user-name">${displayName}</div>
                        <div class="session-time">Active for ${durationText} • ${displayRole}</div>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="inactive-btn" onclick="openInactiveModal('${user.username}', '${displayName}', '${displayRole}')">Inactive</button>
                    <button class="forceout-btn" onclick="openForceOutModal('${user.username}', '${displayName}')">Force Out</button>
                </div>
            `;
            activeUsersList.appendChild(userItem);
        });
    }
    
    // Show modal
    modal.style.display = 'flex';
}

function closeActiveUsersModal() {
    document.getElementById('active-users-modal').style.display = 'none';
}

// ===== INACTIVE USER MODAL =====
async function openInactiveModal(username, fullName, role) {
    console.log('⏸️ Opening inactive confirmation modal for:', username);
    
    // Find the user to get their details from the system users
    const allUsers = await fetchAllowedUsers();
    const systemUser = allUsers.find(u => u.username === username);
    
    if (!systemUser) {
        alert('❌ User not found in system');
        return;
    }
    
    targetInactiveUser = systemUser;
    
    const modal = document.getElementById('inactive-confirm-modal');
    const userNameEl = document.getElementById('inactive-user-name');
    const userRoleEl = document.getElementById('inactive-user-role');
    const passwordInput = document.getElementById('inactive-password-input');
    
    // Use system user data as primary source, fallback to parameters
    const displayName = systemUser.fullName || systemUser.username || fullName || username;
    const displayRole = systemUser.role || role || 'Employee';
    
    userNameEl.textContent = displayName;
    userRoleEl.textContent = displayRole;
    passwordInput.value = '';
    
    modal.style.display = 'flex';
    
    console.log('✅ Inactive modal opened for:', displayName, '(' + displayRole + ')');
    
    // Focus on password input
    setTimeout(() => {
        passwordInput.focus();
    }, 100);
}

function closeInactiveModal() {
    document.getElementById('inactive-confirm-modal').style.display = 'none';
    targetInactiveUser = null;
    
    // Clear password field
    document.getElementById('inactive-password-input').value = '';
}

function confirmInactive() {
    const passwordInput = document.getElementById('inactive-password-input');
    const enteredPassword = passwordInput.value;
    
    if (!targetInactiveUser) {
        alert('❌ Error: No user selected');
        return;
    }
    
    if (!enteredPassword) {
        alert('❌ Please enter your password');
        passwordInput.focus();
        return;
    }
    
    if (!targetInactiveUser.password || enteredPassword === targetInactiveUser.password) {
        // Remove from active users
        let activeUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]');
        activeUsers = activeUsers.filter(activeUser => activeUser.username !== targetInactiveUser.username);
        localStorage.setItem('activeUsers', JSON.stringify(activeUsers));
        
        // Update count and close modals
        updateActiveUsersCount();
        closeInactiveModal();
        
        // Refresh active users modal
        setTimeout(() => {
            openActiveUsersModal();
        }, 200);
        
        // Success notification
        setTimeout(() => {
            alert(`✅ ${targetInactiveUser.fullName || targetInactiveUser.username} has been made inactive`);
        }, 100);
        
        console.log('⏸️ User made inactive successfully');
    } else {
        alert('❌ Invalid password. Cannot make user inactive.');
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// ===== FORCE OUT MODAL =====
async function openForceOutModal(username, fullName) {
    console.log('⚠️ Opening force out modal for:', username);
    
    // FORCE database reinitialization to ensure fresh data
    console.log('🔄 Force reinitializing user database...');
    const currentUsers = localStorage.getItem('monumeUsers');
    if (!currentUsers || JSON.parse(currentUsers).length === 0) {
        console.log('📝 Database empty or missing, creating fresh database...');
        localStorage.removeItem('monumeUsers');
        setupUserDatabase();
    }
    
    // Get fresh user data
    let allUsers = await fetchAllowedUsers();
    console.log('🔍 STEP 1 - Total users loaded:', allUsers.length);
    
    // If still empty, force create the database
    if (allUsers.length === 0) {
        console.log('🚨 EMERGENCY: Creating users manually...');
        const emergencyUsers = [
            { id: 1, username: 'Admin', password: 'admin123', role: 'Administrator', fullName: 'System Administrator' },
            { id: 2, username: 'Manager', password: 'manager123', role: 'Manager', fullName: 'Operations Manager' },
            { id: 3, username: 'Supervisor', password: 'super123', role: 'Manager', fullName: 'Lisa Anderson' },
            { id: 4, username: 'Staff1', password: 'staff123', role: 'Employee', fullName: 'Sarah Johnson' },
            { id: 5, username: 'Staff2', password: 'staff123', role: 'Employee', fullName: 'Mike Williams' }
        ];
        localStorage.setItem('monumeUsers', JSON.stringify(emergencyUsers));
        allUsers = emergencyUsers;
        console.log('✅ Emergency users created:', allUsers.length);
    }
    
    console.log('🔍 STEP 2 - All users data:', allUsers);
    
    // Find target user
    const systemUser = allUsers.find(u => u.username === username);
    if (!systemUser) {
        alert('❌ User not found in system');
        return;
    }
    
    // Use system user data as primary source
    const displayName = systemUser.fullName || systemUser.username || fullName || username;
    targetForceOutUser = { username, fullName: displayName };
    
    // Get modal elements
    const modal = document.getElementById('forceout-confirm-modal');
    const targetUserEl = document.getElementById('forceout-target-user');
    const adminSelect = document.getElementById('admin-select');
    const adminPassword = document.getElementById('admin-password');
    
    if (!adminSelect) {
        console.error('❌ Admin select element not found!');
        alert('❌ Force out modal not properly initialized');
        return;
    }
    
    // Set target user
    targetUserEl.textContent = displayName;
    
    // STEP 3: Filter for admins and managers with detailed logging
    console.log('🔍 STEP 3 - Filtering for admins and managers...');
    const adminsAndManagers = [];
    
    allUsers.forEach((user, index) => {
        console.log(`👤 User ${index + 1}: ${user.username} | Role: "${user.role}" | Full Name: "${user.fullName}"`);
        
        // Check for both capitalized and lowercase versions
        const userRole = (user.role || '').toLowerCase();
        const isAdmin = userRole === 'admin';
        const isManager = userRole === 'manager';
        
        if (isAdmin || isManager) {
            adminsAndManagers.push(user);
            console.log(`✅ ADMIN/MANAGER FOUND: ${user.fullName || user.username} (${user.role})`);
        } else {
            console.log(`❌ Not admin/manager: ${user.username} has role "${user.role}"`);
        }
    });
    
    console.log('🔍 STEP 4 - Final admin/manager count:', adminsAndManagers.length);
    console.log('🔍 STEP 4 - Admin/Manager list:', adminsAndManagers);
    
    if (adminsAndManagers.length === 0) {
        console.error('🚨 CRITICAL: No admins or managers found!');
        console.log('📋 All user roles:', allUsers.map(u => `${u.username}: "${u.role}"`));
        alert('❌ Critical Error: No administrators or managers found in the system!\n\nAvailable roles:\n' + 
              allUsers.map(u => `${u.username}: ${u.role}`).join('\n'));
        return;
    }
    
    // STEP 5: Populate dropdown with extensive logging
    console.log('🔍 STEP 5 - Populating dropdown...');
    adminSelect.innerHTML = '<option value="">Choose admin/manager...</option>';
    
    adminsAndManagers.forEach((admin, index) => {
        const option = document.createElement('option');
        option.value = admin.username;
        const adminDisplayName = admin.fullName || admin.username;
        option.textContent = `${adminDisplayName} (${admin.role})`;
        adminSelect.appendChild(option);
        
        console.log(`➕ ADDED DROPDOWN OPTION ${index + 1}:`);
        console.log(`   Value: "${option.value}"`);
        console.log(`   Text: "${option.textContent}"`);
    });
    
    // Clear password field
    adminPassword.value = '';
    
    console.log('🔍 STEP 6 - Final dropdown HTML:', adminSelect.innerHTML);
    console.log('🔍 STEP 6 - Dropdown options count:', adminSelect.options.length);
    
    // STEP 7: Show modal and verify
    modal.style.display = 'flex';
    
    // Double-check dropdown after a brief delay
    setTimeout(() => {
        console.log('🔍 VERIFICATION - Dropdown still has options:', adminSelect.options.length);
        console.log('🔍 VERIFICATION - Dropdown HTML:', adminSelect.innerHTML);
        
        if (adminSelect.options.length <= 1) {
            console.error('🚨 DROPDOWN LOST OPTIONS! Attempting recovery...');
            // Try to repopulate
            adminsAndManagers.forEach((admin) => {
                const option = document.createElement('option');
                option.value = admin.username;
                option.textContent = `${admin.fullName || admin.username} (${admin.role})`;
                adminSelect.appendChild(option);
            });
        }
    }, 100);
    
    console.log('✅ Force out modal setup complete for:', displayName);
}

function closeForceOutModal() {
    document.getElementById('forceout-confirm-modal').style.display = 'none';
    targetForceOutUser = null;
    
    // Clear form
    document.getElementById('admin-select').value = '';
    document.getElementById('admin-password').value = '';
}

function executeForceOut() {
    const adminSelect = document.getElementById('admin-select');
    const adminPassword = document.getElementById('admin-password');
    
    const selectedAdminUsername = adminSelect.value;
    const enteredPassword = adminPassword.value;
    
    if (!selectedAdminUsername) {
        alert('❌ Please select an admin or manager');
        return;
    }
    
    if (!enteredPassword) {
        alert('❌ Please enter admin password');
        adminPassword.focus();
        return;
    }
    
    if (!targetForceOutUser) {
        alert('❌ Error: No target user selected');
        return;
    }
    
    // Verify admin password
    const allUsers = JSON.parse(localStorage.getItem('monumeUsers') || '[]');
    const admin = allUsers.find(user => user.username === selectedAdminUsername);
    
    if (!admin) {
        alert('❌ Admin user not found');
        return;
    }
    
    if (enteredPassword !== admin.password) {
        alert('❌ Invalid admin password');
        adminPassword.value = '';
        adminPassword.focus();
        return;
    }
    
    // Execute force out
    let activeUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]');
    const userBeforeForceOut = activeUsers.find(user => user.username === targetForceOutUser.username);
    
    if (!userBeforeForceOut) {
        alert('❌ User is no longer active');
        closeForceOutModal();
        return;
    }
    
    // Remove user from active users
    activeUsers = activeUsers.filter(user => user.username !== targetForceOutUser.username);
    localStorage.setItem('activeUsers', JSON.stringify(activeUsers));
    
    // Update count
    updateActiveUsersCount();
    
    // Close modals
    closeForceOutModal();
    closeActiveUsersModal();
    
    // Success notification
    setTimeout(() => {
        alert(`⚠️ ${targetForceOutUser.fullName || targetForceOutUser.username} has been forced out by ${admin.fullName || admin.username}`);
    }, 100);
    
    console.log('⚠️ Force out executed successfully');
}

// ===== SETUP BUTTON HANDLERS =====
function setupButtons() {
    // Start Session button
    const startBtn = document.getElementById('start-session-btn');
    if (startBtn) {
        startBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            openUserModal();
        };
        console.log('✅ Start Session button connected');
    }

    // View Active Users button
    const viewBtn = document.getElementById('view-active-users-btn');
    if (viewBtn) {
        viewBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            openActiveUsersModal();
        };
        console.log('✅ View Active Users button connected');
    }

    // Team card click handler
    const teamCard = document.getElementById('team-monume-card');
    if (teamCard) {
        teamCard.onclick = function(e) {
            if (!e.target.closest('.stat-card-actions')) {
                e.preventDefault();
                openUserModal();
            }
        };
        teamCard.style.cursor = 'pointer';
        teamCard.title = 'Click to start a new user session';
        console.log('✅ Team card click handler connected');
    }

    // Enter key support for password inputs
    const passwordInput = document.getElementById('password-input');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                confirmPassword();
            }
        });
    }

    const adminPasswordInput = document.getElementById('admin-password');
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                executeForceOut();
            }
        });
    }

    const inactivePasswordInput = document.getElementById('inactive-password-input');
    if (inactivePasswordInput) {
        inactivePasswordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                confirmInactive();
            }
        });
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Enhanced Team MonuMe System...');
    
    // Setup database and update count
    setupUserDatabase();
    updateActiveUsersCount();
    
    // Setup button handlers with a delay to ensure DOM is ready
    setTimeout(() => {
        setupButtons();
        console.log('✅ Enhanced Team MonuMe System ready!');
    }, 500);
});

// ===== GLOBAL FUNCTIONS FOR COMPATIBILITY =====
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.closePasswordModal = closePasswordModal;
window.confirmPassword = confirmPassword;
window.openActiveUsersModal = openActiveUsersModal;
window.closeActiveUsersModal = closeActiveUsersModal;
window.openInactiveModal = openInactiveModal;
window.closeInactiveModal = closeInactiveModal;
window.confirmInactive = confirmInactive;
window.openForceOutModal = openForceOutModal;
window.closeForceOutModal = closeForceOutModal;
window.executeForceOut = executeForceOut;

// ===== DEBUG FUNCTIONS =====
window.debugUserSystem = function() {
    console.log('🔍 === ENHANCED USER SYSTEM DEBUG ===');
    const users = JSON.parse(localStorage.getItem('monumeUsers') || '[]');
    const activeUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]');
    
    console.log('Total users:', users.length);
    console.log('Active users:', activeUsers.length);
    console.log('Admin/Manager users:', users.filter(u => u.role === 'Administrator' || u.role === 'Manager').length);
    
    console.log('Available users:', users.map(u => `${u.username} (${u.role})`));
    console.log('Active users:', activeUsers.map(u => u.username));
    
    console.log('Modals available:');
    console.log('- User Modal:', !!document.getElementById('user-modal'));
    console.log('- Password Modal:', !!document.getElementById('password-modal'));
    console.log('- Active Users Modal:', !!document.getElementById('active-users-modal'));
    console.log('- Inactive Modal:', !!document.getElementById('inactive-confirm-modal'));
    console.log('- Force Out Modal:', !!document.getElementById('forceout-confirm-modal'));
};

window.resetActiveUsers = function() {
    localStorage.setItem('activeUsers', JSON.stringify([]));
    updateActiveUsersCount();
    console.log('🔄 Active users reset');
};

window.debugActiveUsers = function() {
    console.log('🔍 === ACTIVE USERS DEBUG ===');
    const activeUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]');
    const systemUsers = JSON.parse(localStorage.getItem('monumeUsers') || '[]');
    
    console.log('Active Users:', activeUsers.length);
    activeUsers.forEach((user, index) => {
        const systemUser = systemUsers.find(sysUser => sysUser.username === user.username);
        console.log(`${index + 1}. ${user.username}:`);
        console.log('  - Active User Data:', user);
        console.log('  - System User Data:', systemUser);
        console.log('  - Display Name:', systemUser ? (systemUser.fullName || systemUser.username) : (user.fullName || user.username));
    });
    
    console.log('System Users (Admins/Managers):');
    const admins = systemUsers.filter(u => u.role === 'Administrator' || u.role === 'Manager');
    admins.forEach(admin => {
        console.log(`  - ${admin.fullName || admin.username} (${admin.role})`);
    });
};

window.debugUserDatabase = function() {
    console.log('🔍 === USER DATABASE DEBUG ===');
    const systemUsers = JSON.parse(localStorage.getItem('monumeUsers') || '[]');
    
    console.log('Total Users in Database:', systemUsers.length);
    console.log('Full Database:', systemUsers);
    
    console.log('\n📋 Users by Role:');
    const roleGroups = {};
    systemUsers.forEach(user => {
        const role = user.role || 'Unknown';
        if (!roleGroups[role]) roleGroups[role] = [];
        roleGroups[role].push(user);
    });
    
    Object.keys(roleGroups).forEach(role => {
        console.log(`  ${role}: ${roleGroups[role].length} users`);
        roleGroups[role].forEach(user => {
            console.log(`    - ${user.fullName || user.username} (${user.username})`);
        });
    });
    
    // Check for admins and managers specifically
    const admins = systemUsers.filter(u => u.role === 'Administrator');
    const managers = systemUsers.filter(u => u.role === 'Manager');
    
    console.log(`\n🔑 Administrators: ${admins.length}`);
    admins.forEach(admin => console.log(`  - ${admin.fullName || admin.username}`));
    
    console.log(`\n👥 Managers: ${managers.length}`);
    managers.forEach(manager => console.log(`  - ${manager.fullName || manager.username}`));
    
    return {
        totalUsers: systemUsers.length,
        administrators: admins.length,
        managers: managers.length,
        allUsers: systemUsers
    };
};

window.resetUserDatabase = function() {
    console.log('🔄 Resetting user database...');
    localStorage.removeItem('monumeUsers');
    setupUserDatabase();
    const result = debugUserDatabase();
    console.log('✅ User database reset complete!');
    return result;
};

window.testForceOutModal = function() {
    console.log('🧪 Testing Force Out Modal...');
    
    // First, ensure we have some active users to test with
    const activeUsers = JSON.parse(localStorage.getItem('activeUsers') || '[]');
    if (activeUsers.length === 0) {
        console.log('📝 Adding test active user...');
        const testUser = {
            username: 'Admin',
            fullName: 'System Administrator', 
            role: 'Administrator',
            startTime: new Date().toISOString(),
            sessionId: Date.now()
        };
        activeUsers.push(testUser);
        localStorage.setItem('activeUsers', JSON.stringify(activeUsers));
        updateActiveUsersCount();
    }
    
    // Test the force out modal
    const testUsername = activeUsers[0].username;
    const testFullName = activeUsers[0].fullName;
    
    console.log(`🎯 Testing force out modal for: ${testFullName} (${testUsername})`);
    openForceOutModal(testUsername, testFullName);
    
    return {
        activeUsers: activeUsers.length,
        testUser: { username: testUsername, fullName: testFullName }
    };
};

window.fixDropdownNow = function() {
    console.log('🔧 EMERGENCY FIX: Attempting to fix admin dropdown...');
    
    // Force reset and recreate database
    localStorage.removeItem('monumeUsers');
    setupUserDatabase();
    
    // Get the dropdown element
    const adminSelect = document.getElementById('admin-select');
    if (!adminSelect) {
        console.log('❌ Admin dropdown not found on page');
        return false;
    }
    
    // Get fresh users
    const allUsers = JSON.parse(localStorage.getItem('monumeUsers') || '[]');
    const admins = allUsers.filter(u => u.role === 'Administrator' || u.role === 'Manager');
    
    console.log('👥 Found admins for dropdown:', admins.length);
    admins.forEach(admin => {
        console.log(`  - ${admin.fullName || admin.username} (${admin.role})`);
    });
    
    // Clear and repopulate dropdown
    adminSelect.innerHTML = '<option value="">Choose admin/manager...</option>';
    
    admins.forEach(admin => {
        const option = document.createElement('option');
        option.value = admin.username;
        option.textContent = `${admin.fullName || admin.username} (${admin.role})`;
        adminSelect.appendChild(option);
        console.log(`✅ Added: ${option.textContent}`);
    });
    
    console.log('🔍 Final dropdown HTML:', adminSelect.innerHTML);
    console.log('✅ Dropdown fix complete!');
    
    return {
        success: true,
        adminCount: admins.length,
        dropdownOptions: adminSelect.options.length
    };
};

console.log('✅ Enhanced Team MonuMe System loaded with:');
console.log('  📋 User Selection Modal');
console.log('  🔐 Password Confirmation Modal');
console.log('  👥 Active Users Management Modal');
console.log('  ⏸️ Inactive User Confirmation Modal');
console.log('  ⚠️ Force Out Modal with Admin Authorization');
console.log('  🔄 Auto-redirect to tracking.html after activation');

console.log('\n🔧 DEBUG COMMANDS AVAILABLE:');
console.log('  debugUserDatabase() - Check user database');
console.log('  debugActiveUsers() - Check active users');
console.log('  resetUserDatabase() - Reset user database');
console.log('  resetActiveUsers() - Clear active users');
console.log('  testForceOutModal() - Test force out modal with admin dropdown');
console.log('  fixDropdownNow() - Force fix admin dropdown immediately');

// Initial database check
setTimeout(() => {
    console.log('\n🔍 INITIAL SYSTEM CHECK:');
    const users = JSON.parse(localStorage.getItem('monumeUsers') || '[]');
    const admins = users.filter(u => u.role === 'Administrator' || u.role === 'Manager');
    console.log(`📊 Total users: ${users.length}`);
    console.log(`🔑 Admins/Managers: ${admins.length}`);
    if (admins.length > 0) {
        console.log('✅ Admin dropdown should work properly');
        admins.forEach(admin => {
            console.log(`  - ${admin.fullName || admin.username} (${admin.role})`);
        });
    } else {
        console.log('❌ No admins/managers found - Force Out will not work!');
        console.log('💡 Run resetUserDatabase() to fix this');
    }
}, 1000); 