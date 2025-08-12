// User Management System
class UserManager {
    constructor() {
        this.users = [];
        this.locations = [];
        this.currentEditingUser = null;
        this.tierCounter = 0;
        
        this.init();
    }

    init() {
        this.loadData();
        this.renderLocations();
        this.renderUsers();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close modals on outside click
        document.getElementById('userModal').addEventListener('click', (e) => {
            if (e.target.id === 'userModal') {
                this.closeUserModal();
            }
        });

        document.getElementById('locationModal').addEventListener('click', (e) => {
            if (e.target.id === 'locationModal') {
                this.closeLocationModal();
            }
        });

        // Enter key for location modal
        document.getElementById('locationName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveLocation();
            }
        });
    }

    // Data Management
    loadData() {
        // Load users from localStorage
        const savedUsers = localStorage.getItem('salaryCalc_users');
        if (savedUsers) {
            this.users = JSON.parse(savedUsers);
        }

        // Load locations from localStorage
        const savedLocations = localStorage.getItem('salaryCalc_locations');
        if (savedLocations) {
            this.locations = JSON.parse(savedLocations);
        } else {
            // Default locations
            this.locations = ['New York', 'Los Angeles', 'Chicago', 'Miami'];
            this.saveData();
        }
    }

    saveData() {
        localStorage.setItem('salaryCalc_users', JSON.stringify(this.users));
        localStorage.setItem('salaryCalc_locations', JSON.stringify(this.locations));
    }

    // Location Management
    openLocationModal() {
        const modal = document.getElementById('locationModal');
        document.getElementById('locationName').value = '';
        modal.style.display = 'block';
    }

    closeLocationModal() {
        const modal = document.getElementById('locationModal');
        modal.style.display = 'none';
        document.getElementById('locationName').value = '';
    }

    saveLocation() {
        const locationName = document.getElementById('locationName').value.trim();

        if (!locationName) {
            this.showMessage('Please enter a location name', 'error');
            return;
        }

        if (this.locations.includes(locationName)) {
            this.showMessage('Location already exists', 'error');
            return;
        }

        this.locations.push(locationName);
        this.saveData();
        this.renderLocations();
        this.populateLocationDropdown();
        this.closeLocationModal();

        this.showMessage(`Location "${locationName}" added successfully`, 'success');
    }

    removeLocation(locationName) {
        // Check if any users are in this location
        const usersInLocation = this.users.filter(user => user.location === locationName);
        if (usersInLocation.length > 0) {
            this.showMessage(`Cannot remove location. ${usersInLocation.length} user(s) still assigned to this location.`, 'error');
            return;
        }

        this.locations = this.locations.filter(loc => loc !== locationName);
        this.saveData();
        this.renderLocations();
        this.populateLocationDropdown();

        this.showMessage(`Location "${locationName}" removed successfully`, 'success');
    }

    renderLocations() {
        const container = document.getElementById('locationsList');
        
        if (this.locations.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: var(--dark); opacity: 0.6; padding: 40px; font-size: 1.1rem;">✨ No locations created yet</div>';
            return;
        }

        container.innerHTML = this.locations.map(location => {
            const userCount = this.users.filter(u => u.location === location).length;
            return `
                <div class="location-card">
                    <div class="location-info">
                        <h4>${location}</h4>
                        <div class="count">${userCount} team member(s)</div>
                    </div>
                    <div class="location-actions">
                        <button class="action-btn" onclick="userManager.removeLocation('${location}')" 
                                ${userCount > 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} 
                                title="${userCount > 0 ? 'Cannot delete - has assigned users' : 'Remove location'}">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // User Management
    openUserModal(userId = null) {
        this.currentEditingUser = userId;
        const modal = document.getElementById('userModal');
        const title = document.getElementById('modalTitle');
        
        if (userId) {
            const user = this.users.find(u => u.id === userId);
            title.textContent = 'Edit User';
            this.populateUserForm(user);
        } else {
            title.textContent = 'Add New User';
            this.resetUserForm();
        }
        
        this.populateLocationDropdown();
        this.populateCopyTiersDropdown(userId);
        modal.style.display = 'block';
    }

    closeUserModal() {
        const modal = document.getElementById('userModal');
        modal.style.display = 'none';
        this.currentEditingUser = null;
        this.resetUserForm();
    }

    populateLocationDropdown() {
        const select = document.getElementById('userLocation');
        select.innerHTML = '<option value="">Select Location</option>';
        
        this.locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            select.appendChild(option);
        });
    }

    populateCopyTiersDropdown(excludeUserId = null) {
        const select = document.getElementById('copyFromUser');
        select.innerHTML = '<option value="">Select team member...</option>';
        
        // Filter out the current user being edited to avoid copying from self
        const availableUsers = this.users.filter(user => user.id !== excludeUserId);
        
        if (availableUsers.length === 0) {
            select.innerHTML = '<option value="">No other team members available</option>';
            return;
        }
        
        availableUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.name} (${user.location}) - ${user.tiers?.length || 0} tiers`;
            select.appendChild(option);
        });
    }

    resetUserForm() {
        document.getElementById('userName').value = '';
        document.getElementById('userLocation').value = '';
        document.getElementById('copyFromUser').value = '';
        this.renderTierEditors([
            { threshold: 0, rate: 15, type: 'hourly' },
            { threshold: 300, rate: 17, type: 'hourly' },
            { threshold: 600, rate: 19, type: 'hourly' },
            { threshold: 900, rate: 21, type: 'hourly' }
        ]);
    }

    populateUserForm(user) {
        document.getElementById('userName').value = user.name;
        document.getElementById('userLocation').value = user.location;
        this.renderTierEditors(user.tiers);
    }

    // Tier Management
    renderTierEditors(tiers = []) {
        const container = document.getElementById('tiersEditor');
        container.innerHTML = '';
        this.tierCounter = 0;

        if (tiers.length === 0) {
            tiers = [{ threshold: 0, rate: 15, type: 'hourly' }];
        }

        tiers.forEach(tier => {
            this.addTierEditor(tier);
        });
    }

    addTierEditor(tierData = null) {
        const container = document.getElementById('tiersEditor');
        const tierId = this.tierCounter++;
        
        const tier = tierData || { threshold: 0, rate: 15, type: 'hourly' };
        
        const tierDiv = document.createElement('div');
        tierDiv.className = 'tier-editor';
        tierDiv.id = `tier-${tierId}`;
        
        tierDiv.innerHTML = `
            <div>
                <label style="font-size: 0.8rem; color: var(--dark); opacity: 0.8; font-weight: 500;">Sales Threshold ($)</label>
                <input type="number" class="tier-input tier-threshold" value="${tier.threshold}" min="0" step="1" placeholder="0">
            </div>
            <div>
                <label style="font-size: 0.8rem; color: var(--dark); opacity: 0.8; font-weight: 500;">Rate/Percentage</label>
                <input type="number" class="tier-input tier-rate" value="${tier.rate}" min="0" step="0.01" placeholder="15">
            </div>
            <div>
                <label style="font-size: 0.8rem; color: var(--dark); opacity: 0.8; font-weight: 500;">Type</label>
                <select class="tier-input tier-type">
                    <option value="hourly" ${tier.type === 'hourly' ? 'selected' : ''}>💵 $/Hour</option>
                    <option value="commission" ${tier.type === 'commission' ? 'selected' : ''}>📊 % Commission</option>
                </select>
            </div>
            <button type="button" class="remove-tier" onclick="userManager.removeTierEditor('tier-${tierId}')" title="Remove tier">🗑️</button>
        `;
        
        container.appendChild(tierDiv);
    }

    removeTierEditor(tierId) {
        const tierDiv = document.getElementById(tierId);
        if (tierDiv) {
            tierDiv.remove();
        }
    }

    copyTiersFromUser() {
        const select = document.getElementById('copyFromUser');
        const selectedUserId = select.value;
        
        if (!selectedUserId) {
            alert('⚠️ Please select a team member to copy tiers from');
            return;
        }
        
        const sourceUser = this.users.find(u => u.id === selectedUserId);
        if (!sourceUser || !sourceUser.tiers || sourceUser.tiers.length === 0) {
            alert('❌ Selected user has no tiers to copy');
            return;
        }
        
        const confirmation = confirm(`📋 Copy ${sourceUser.tiers.length} tier(s) from ${sourceUser.name}?\n\nThis will replace all current tiers.`);
        if (!confirmation) return;
        
        // Clear existing tiers
        const container = document.getElementById('tiersEditor');
        container.innerHTML = '';
        this.tierCounter = 0;
        
        // Copy and add new tiers
        sourceUser.tiers.forEach(tier => {
            const copiedTier = {
                threshold: tier.threshold,
                rate: tier.rate,
                type: tier.type
            };
            this.addTierEditor(copiedTier);
        });
        
        // Reset the dropdown
        select.value = '';
        
        alert(`✅ Successfully copied ${sourceUser.tiers.length} tier(s) from ${sourceUser.name}!`);
    }

    collectTierData() {
        const tiers = [];
        const tierElements = document.querySelectorAll('.tier-editor');
        
        tierElements.forEach(tierDiv => {
            const threshold = parseFloat(tierDiv.querySelector('.tier-threshold').value) || 0;
            const rate = parseFloat(tierDiv.querySelector('.tier-rate').value) || 0;
            const type = tierDiv.querySelector('.tier-type').value;
            
            tiers.push({ threshold, rate, type });
        });
        
        // Sort by threshold
        tiers.sort((a, b) => a.threshold - b.threshold);
        
        return tiers;
    }

    saveUser() {
        const name = document.getElementById('userName').value.trim();
        const location = document.getElementById('userLocation').value;
        const tiers = this.collectTierData();

        // Validation
        if (!name) {
            this.showMessage('Please enter a full name', 'error');
            return;
        }

        if (!location) {
            this.showMessage('Please select a location', 'error');
            return;
        }

        if (tiers.length === 0) {
            this.showMessage('Please add at least one commission tier', 'error');
            return;
        }

        // Check for duplicate name (excluding current user if editing)
        const duplicateUser = this.users.find(user => 
            user.name.toLowerCase() === name.toLowerCase() && 
            user.id !== this.currentEditingUser
        );

        if (duplicateUser) {
            this.showMessage('A user with this name already exists', 'error');
            return;
        }

        if (this.currentEditingUser) {
            // Update existing user
            const userIndex = this.users.findIndex(u => u.id === this.currentEditingUser);
            this.users[userIndex] = {
                ...this.users[userIndex],
                name,
                location,
                tiers,
                updatedAt: new Date().toISOString()
            };
            this.showMessage('User updated successfully', 'success');
        } else {
            // Create new user
            const newUser = {
                id: Date.now().toString(),
                name,
                location,
                tiers,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.users.push(newUser);
            this.showMessage('User created successfully', 'success');
        }

        this.saveData();
        this.renderUsers();
        this.renderLocations();
        this.closeUserModal();
    }

    deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        if (confirm(`Are you sure you want to delete user "${user.name}"?`)) {
            this.users = this.users.filter(u => u.id !== userId);
            this.saveData();
            this.renderUsers();
            this.renderLocations();
            this.showMessage('User deleted successfully', 'success');
        }
    }

    renderUsers() {
        const container = document.getElementById('usersContainer');
        
        // Create users grid with modern cards
        const usersHtml = this.users.map(user => {
            const tiersHtml = user.tiers.map(tier => `
                <div class="tier-item">
                    ${tier.type === 'hourly' ? '$' + tier.rate + '/hr' : tier.rate + '%'} (≥$${tier.threshold})
                </div>
            `).join('');

            return `
                <div class="user-card">
                    <div class="user-header">
                        <div class="user-info">
                            <h3>${user.name}</h3>
                            <div class="user-location">📍 ${user.location}</div>
                        </div>
                        <div class="user-actions">
                            <button class="action-btn" onclick="userManager.openUserModal('${user.id}')" title="Edit user">✏️</button>
                            <button class="action-btn" onclick="userManager.deleteUser('${user.id}')" title="Delete user">🗑️</button>
                        </div>
                    </div>
                    <div class="tiers-preview">
                        <div class="tiers-title">💰 Commission Tiers (${user.tiers.length})</div>
                        <div class="tier-items">
                            ${tiersHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Always include the add user card first
        container.innerHTML = `
            <div class="add-user-card" onclick="openUserModal()">
                <div class="add-user-icon">👤</div>
                <div class="add-user-text">Add Team Member</div>
                <div class="add-user-hint">Create a new user with custom commission tiers</div>
            </div>
            ${usersHtml}
        `;
    }

    // Utility Functions
    showMessage(text, type) {
        const messagesDiv = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        messagesDiv.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }

    // Export Functions
    exportAllUsers() {
        if (this.users.length === 0) {
            this.showMessage('No users to export', 'error');
            return;
        }

        const data = {
            users: this.users,
            locations: this.locations,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showMessage('Users exported successfully', 'success');
    }

    // Public API for external use
    getUsers() {
        return this.users;
    }

    getLocations() {
        return this.locations;
    }

    getUserById(userId) {
        return this.users.find(u => u.id === userId);
    }

    getUsersByLocation(location) {
        return this.users.filter(u => u.location === location);
    }
}

// Global functions for HTML onclick events
let userManager;

document.addEventListener('DOMContentLoaded', function() {
    userManager = new UserManager();
});

// Global functions that can be called from HTML
function openLocationModal() {
    if (userManager) userManager.openLocationModal();
}

function closeLocationModal() {
    if (userManager) userManager.closeLocationModal();
}

function saveLocation() {
    if (userManager) userManager.saveLocation();
}

function openUserModal(userId = null) {
    if (userManager) userManager.openUserModal(userId);
}

function closeUserModal() {
    if (userManager) userManager.closeUserModal();
}

function addTierEditor() {
    if (userManager) userManager.addTierEditor();
}

function saveUser() {
    if (userManager) userManager.saveUser();
}

function exportAllUsers() {
    if (userManager) userManager.exportAllUsers();
}

function copyTiersFromUser() {
    if (userManager) userManager.copyTiersFromUser();
} 