/**
 * Users Management System
 * Handles all user management operations for MonuMe Tracker
 */

class UsersManager {
    constructor() {
        this.users = [];
        this.locations = [];
        this.filteredUsers = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.searchTerm = '';
        this.currentUser = null;
        this.isEditing = false;
        this.currentLoggedInUser = null; // Store current logged-in user info
        
        this.init();
    }

    async init() {
        await this.loadCurrentUser();
        this.bindEvents();
        this.loadLocations();
        this.loadUsers();
        this.updateStats();
        this.updateUIForUserRole();
        
        // If current user is not loaded, try again after a short delay
        if (!this.currentLoggedInUser) {
            setTimeout(async () => {
                await this.loadCurrentUser();
                this.updateUIForUserRole();
            }, 1000);
        }
    }

    async loadCurrentUser() {
        try {
            console.log('Loading current user information...');
            const response = await fetch('/get_current_user', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!response.ok) {
                console.error('Failed to get current user:', response.status);
                return;
            }
            
            const data = await response.json();
            if (data.success && data.user) {
                this.currentLoggedInUser = data.user;
                console.log('Current user loaded:', this.currentLoggedInUser);
                
                // Update user info in sidebar
                this.updateUserInfoInSidebar();
            } else {
                console.error('Failed to get current user data:', data);
            }
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    }

    updateUserInfoInSidebar() {
        if (!this.currentLoggedInUser) return;
        
        const userNameElement = document.getElementById('user-name');
        const userStatusElement = document.getElementById('user-status');
        
        if (userNameElement) {
            userNameElement.textContent = this.currentLoggedInUser.name || this.currentLoggedInUser.username || 'User';
        }
        
        if (userStatusElement) {
            const roleText = this.currentLoggedInUser.role === 'admin' ? 'Administrator' : 
                           this.currentLoggedInUser.role === 'location_manager' ? 'Location Manager' : 'User';
            userStatusElement.textContent = roleText;
        }
    }

    updateUIForUserRole() {
        if (!this.currentLoggedInUser) return;
        
        const isAdmin = this.currentLoggedInUser.role === 'admin';
        const isLocationUser = this.currentLoggedInUser.role === 'location_manager';
        
        // Update page header based on user role
        this.updatePageHeader();
        
        // Update location filter visibility
        this.updateLocationFilterVisibility();
        
        // Update add user button visibility
        this.updateAddUserButtonVisibility();
        
        // Update action buttons visibility
        this.updateActionButtonsVisibility();
        
        // Update statistics cards based on user role
        this.updateStatisticsCards();
        
        // Update statistics card descriptions
        this.updateStatisticsCardDescriptions();
    }

    updatePageHeader() {
        const pageHeader = document.querySelector('.page-header h1');
        const pageDescription = document.querySelector('.page-header p');
        
        if (!pageHeader || !pageDescription) return;
        
        if (this.currentLoggedInUser.role === 'admin') {
            pageHeader.innerHTML = '<i class="fas fa-users"></i> User Management';
            pageDescription.textContent = 'Manage your team members, assign roles, and track user activities across all locations with complete access control';
        } else if (this.currentLoggedInUser.role === 'location_manager') {
            pageHeader.innerHTML = '<i class="fas fa-users"></i> Location Team';
            pageDescription.textContent = `Manage team members for ${this.currentLoggedInUser.location_name || 'your location'} and track their activities`;
        } else {
            pageHeader.innerHTML = '<i class="fas fa-users"></i> Team Members';
            pageDescription.textContent = 'View team members and their information';
        }
    }

    updateLocationFilterVisibility() {
        // Find the location filter group by looking for the location filter inside it
        const locationFilter = document.getElementById('locationFilter');
        if (!locationFilter) return;
        
        const locationFilterGroup = locationFilter.closest('.filter-group');
        if (!locationFilterGroup) return;
        
        if (this.currentLoggedInUser.role === 'admin') {
            // Admin can see all locations, show the filter
            locationFilterGroup.style.display = 'flex';
        } else {
            // Non-admin users can only see their own location, hide the filter
            locationFilterGroup.style.display = 'none';
            
            // Set the location filter to their location if they have one
            if (this.currentLoggedInUser.location_id) {
                locationFilter.value = this.currentLoggedInUser.location_id.toString();
            }
        }
    }

    updateAddUserButtonVisibility() {
        const addUserBtn = document.querySelector('.add-user-btn');
        if (!addUserBtn) return;
        
        // Admin and location users can add new users
        if (this.currentLoggedInUser.role === 'admin' || this.currentLoggedInUser.role === 'location_manager') {
            addUserBtn.style.display = 'inline-flex';
        } else {
            addUserBtn.style.display = 'none';
        }
    }

    updateActionButtonsVisibility() {
        // This will be called after users are loaded to update action buttons
        // We'll implement this in the renderUsers method
    }

    updateStatisticsCards() {
        // Find locations card by looking for the icon
        const statCards = document.querySelectorAll('.stat-card');
        let locationsCard = null;
        
        statCards.forEach(card => {
            const icon = card.querySelector('.fa-map-marker-alt');
            if (icon) {
                locationsCard = card;
            }
        });
        
        if (locationsCard && this.currentLoggedInUser.role !== 'admin') {
            // Non-admin users don't need to see locations count
            locationsCard.style.display = 'none';
        }
    }

    updateStatisticsCardDescriptions() {
        if (!this.currentLoggedInUser) return;
        
        // Find cards by looking for specific icons
        const statCards = document.querySelectorAll('.stat-card');
        let totalUsersDesc = null;
        let activeUsersDesc = null;
        let locationsDesc = null;
        
        statCards.forEach(card => {
            const icon = card.querySelector('.fa-users');
            if (icon) {
                totalUsersDesc = card.querySelector('.stat-card-description');
            }
            
            const activeIcon = card.querySelector('.fa-user-check');
            if (activeIcon) {
                activeUsersDesc = card.querySelector('.stat-card-description');
            }
            
            const locationIcon = card.querySelector('.fa-map-marker-alt');
            if (locationIcon) {
                locationsDesc = card.querySelector('.stat-card-description');
            }
        });
        
        if (this.currentLoggedInUser.role === 'admin') {
            if (totalUsersDesc) totalUsersDesc.textContent = 'Total Users';
            if (activeUsersDesc) activeUsersDesc.textContent = 'Active Users';
            if (locationsDesc) locationsDesc.textContent = 'Locations';
        } else {
            if (totalUsersDesc) totalUsersDesc.textContent = 'Team Members';
            if (activeUsersDesc) activeUsersDesc.textContent = 'Active Members';
            if (locationsDesc) locationsDesc.textContent = 'Location';
        }
    }

    bindEvents() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.filterUsers();
                this.currentPage = 1;
                this.renderUsers();
            });
        }

        // Role filter
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) {
            roleFilter.addEventListener('change', () => {
                this.filterUsers();
                this.currentPage = 1;
                this.renderUsers();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterUsers();
                this.currentPage = 1;
                this.renderUsers();
            });
        }

        // Location filter
        const locationFilter = document.getElementById('locationFilter');
        if (locationFilter) {
            locationFilter.addEventListener('change', () => {
                this.filterUsers();
                this.currentPage = 1;
                this.renderUsers();
            });
        }

        // Form validation
        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveUser();
            });
        }

        // Password confirmation validation
        const passwordInput = document.getElementById('userPassword');
        const confirmPasswordInput = document.getElementById('userConfirmPassword');
        
        if (passwordInput && confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }
    }

    async loadLocations() {
        try {
            console.log('Loading locations...');
            const response = await fetch('/api/locations', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            console.log('Locations response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Locations response error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Locations API response:', data);
            
            // Handle the API response structure
            this.locations = data.success ? data.locations : [];
            // Production safety: remove any test/demo locations by name/username
            this.locations = Array.isArray(this.locations) ? this.locations.filter(loc => !this.isTestLocation(loc)) : [];
            console.log(`Loaded ${this.locations.length} locations successfully`);
            this.populateLocationSelect();
            
            // Update UI for user role after locations are loaded
            this.updateUIForUserRole();
            
        } catch (error) {
            console.error('Error loading locations:', error);
            this.showError(`Failed to load locations: ${error.message}`);
            this.locations = []; // Initialize as empty array
        }
    }

    async loadUsers() {
        try {
            this.showLoading(true);
            console.log('Starting to load users...');
            
            // Build query parameters for pagination and filtering
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.itemsPerPage
            });
            
            // Add search parameter if provided
            if (this.searchTerm) {
                params.append('search', this.searchTerm);
            }
            
            // Add role filter if selected
            const roleFilter = document.getElementById('roleFilter');
            if (roleFilter && roleFilter.value) {
                params.append('role', roleFilter.value);
            }
            
            // Add status filter if selected
            const statusFilter = document.getElementById('statusFilter');
            if (statusFilter && statusFilter.value) {
                params.append('status', statusFilter.value === 'true' ? 'active' : 'inactive');
            }
            
            // Add location filter if selected or if user is not admin
            const locationFilter = document.getElementById('locationFilter');
            if (locationFilter && locationFilter.value) {
                params.append('location_id', locationFilter.value);
            } else if (this.currentLoggedInUser && this.currentLoggedInUser.role !== 'admin' && this.currentLoggedInUser.location_id) {
                // For non-admin users, automatically filter by their location
                params.append('location_id', this.currentLoggedInUser.location_id.toString());
            }
            
            console.log('Making API request to:', `/api/users?${params}`);
            const response = await fetch(`/api/users?${params}`, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error text:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Users API response:', data);
            
            // Handle the API response structure
            if (data.success) {
                this.users = data.users || [];
                // Production safety: remove any test/demo users by name/username/email
                this.users = this.users.filter(u => !this.isTestUser(u));
                this.filteredUsers = [...this.users];
                console.log(`Loaded ${this.users.length} users successfully`);
                
                // Update pagination info if available
                if (data.pagination) {
                    this.totalPages = data.pagination.pages;
                    this.totalUsers = data.pagination.total;
                    console.log(`Pagination: page ${data.pagination.page} of ${data.pagination.pages}, total: ${data.pagination.total}`);
                }
            } else {
                throw new Error(data.message || 'Failed to load users');
            }
            
            this.renderUsers();
            this.updateStats();
            
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError(`Failed to load users: ${error.message}`);
            this.users = []; // Initialize as empty array
            this.filteredUsers = [];
        } finally {
            this.showLoading(false);
        }
    }

    // Helper: identify test/demo location by fields
    isTestLocation(location) {
        const fields = [location?.location_name, location?.name, location?.location_username, location?.mall, location?.email, location?.address];
        return fields.some(v => (v || '').toString().toLowerCase().includes('test'));
    }

    // Helper: identify test/demo user by fields
    isTestUser(user) {
        const fields = [user?.username, user?.name, user?.email];
        return fields.some(v => (v || '').toString().toLowerCase().includes('test'));
    }

    populateLocationSelect() {
        // Populate location select for user form
        const locationSelect = document.getElementById('userLocation');
        if (locationSelect) {
            // Clear existing options except the first one
            locationSelect.innerHTML = '<option value="">Select Location</option>';
            
            // Add location options based on user role
            if (Array.isArray(this.locations)) {
                this.locations.forEach(location => {
                    // For non-admin users, only show their own location
                    if (this.currentLoggedInUser && this.currentLoggedInUser.role !== 'admin') {
                        if (location.id === this.currentLoggedInUser.location_id) {
                            const option = document.createElement('option');
                            option.value = location.id;
                            option.textContent = location.name || location.location_name;
                            locationSelect.appendChild(option);
                        }
                    } else {
                        // Admin can see all locations
                        const option = document.createElement('option');
                        option.value = location.id;
                        option.textContent = location.name || location.location_name;
                        locationSelect.appendChild(option);
                    }
                });
            }
        }

        // Populate location filter dropdown
        const locationFilter = document.getElementById('locationFilter');
        if (locationFilter) {
            // Clear existing options except the first one
            locationFilter.innerHTML = '<option value="">All Locations</option>';
            
            // Add location options based on user role
            if (Array.isArray(this.locations)) {
                this.locations.forEach(location => {
                    // For non-admin users, only show their own location
                    if (this.currentLoggedInUser && this.currentLoggedInUser.role !== 'admin') {
                        if (location.id === this.currentLoggedInUser.location_id) {
                            const option = document.createElement('option');
                            option.value = location.id;
                            option.textContent = location.name || location.location_name;
                            locationFilter.appendChild(option);
                        }
                    } else {
                        // Admin can see all locations
                        const option = document.createElement('option');
                        option.value = location.id;
                        option.textContent = location.name || location.location_name;
                        locationFilter.appendChild(option);
                    }
                });
            }
        }
    }

    filterUsers() {
        // Ensure users is an array
        if (!Array.isArray(this.users)) {
            this.filteredUsers = [];
            return;
        }

        let filtered = [...this.users];

        // Search filter
        if (this.searchTerm) {
            filtered = filtered.filter(user => 
                user.name?.toLowerCase().includes(this.searchTerm) ||
                user.email?.toLowerCase().includes(this.searchTerm) ||
                user.username?.toLowerCase().includes(this.searchTerm) ||
                user.role?.toLowerCase().includes(this.searchTerm) ||
                this.getLocationName(user.location_id)?.toLowerCase().includes(this.searchTerm)
            );
        }

        // Role filter
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter && roleFilter.value) {
            filtered = filtered.filter(user => user.role === roleFilter.value);
        }

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter && statusFilter.value) {
            const isActive = statusFilter.value === 'true';
            filtered = filtered.filter(user => user.is_active === isActive);
        }

        this.filteredUsers = filtered;
    }

    renderUsers() {
        const tableBody = document.getElementById('usersTableBody');
        const usersTable = document.getElementById('usersTable');
        if (!tableBody || !usersTable) return;

        // Ensure filteredUsers is an array
        if (!Array.isArray(this.filteredUsers)) {
            this.filteredUsers = [];
        }

        if (this.filteredUsers.length === 0) {
            let message = 'No users found';
            let description = 'Try adjusting your search criteria or add a new user.';
            
            if (this.currentLoggedInUser) {
                if (this.currentLoggedInUser.role === 'admin') {
                    message = 'No users found';
                    description = 'Try adjusting your search criteria or add a new user.';
                } else {
                    message = 'No team members found';
                    description = `No users are currently assigned to ${this.currentLoggedInUser.location_name || 'your location'}.`;
                }
            }
            
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fas fa-users fa-3x mb-3"></i>
                            <h5>${message}</h5>
                            <p>${description}</p>
                        </div>
                    </td>
                </tr>
            `;
            this.renderPagination();
            return;
        }

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);

        tableBody.innerHTML = paginatedUsers.map(user => this.createUserRow(user)).join('');
        
        this.renderPagination();
    }

    createUserRow(user) {
        const avatar = this.getUserInitials(user.name || user.username || user.email);
        const roleClass = this.getRoleClass(user.role);
        const statusClass = user.is_active ? 'status-active' : 'status-inactive';
        const statusText = user.is_active ? 'Active' : 'Inactive';
        const createdDate = this.formatDate(user.created_at);
        const locationName = this.getLocationName(user.location_id);

        // Determine which action buttons to show based on current user's role
        const canEdit = this.currentLoggedInUser && (
            this.currentLoggedInUser.role === 'admin' || 
                            (this.currentLoggedInUser.role === 'location_manager' && user.location_id === this.currentLoggedInUser.location_id)
        );
        const canDelete = this.currentLoggedInUser && this.currentLoggedInUser.role === 'admin'; // Only admin can delete

        const actionButtons = `
            <div class="action-buttons">
                ${canEdit ? `<button class="btn btn-sm btn-edit" onclick="usersManager.editUser(${user.id})" title="Edit User">
                    <i class="fas fa-edit"></i>
                </button>` : ''}
                ${canDelete ? `<button class="btn btn-sm btn-delete" onclick="usersManager.deleteUser(${user.id})" title="Delete User">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
            </div>
        `;

        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="user-avatar me-3">${avatar}</div>
                        <div>
                            <div class="fw-bold">${user.name || 'N/A'}</div>
                            <small class="text-muted">${user.username || 'N/A'}</small>
                        </div>
                    </div>
                </td>
                <td>${user.email || 'N/A'}</td>
                <td>
                    <span class="role-badge ${roleClass}">${user.role || 'user'}</span>
                </td>
                <td>
                    <span class="location-badge">${locationName || 'N/A'}</span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>${createdDate}</td>
                <td>
                    ${actionButtons}
                </td>
            </tr>
        `;
    }

    renderPagination() {
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer) return;

        // Ensure filteredUsers is an array
        if (!Array.isArray(this.filteredUsers)) {
            this.filteredUsers = [];
        }

        const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
                    onclick="usersManager.goToPage(${this.currentPage - 1})" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                            onclick="usersManager.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="pagination-btn disabled">...</span>';
            }
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="usersManager.goToPage(${this.currentPage + 1})" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    goToPage(page) {
        // Ensure filteredUsers is an array
        if (!Array.isArray(this.filteredUsers)) {
            this.filteredUsers = [];
        }

        const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderUsers();
    }

    updateStats() {
        // Ensure users is an array
        if (!Array.isArray(this.users)) {
            this.users = [];
        }

        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(user => user.is_active).length;
        const locationsCount = this.locations ? this.locations.length : 0;
        
        // Calculate new users this month
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const newUsers = this.users.filter(user => {
            if (!user.created_at) return false;
            const createdDate = new Date(user.created_at);
            return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear;
        }).length;

        // Update stats in the HTML
        const totalUsersEl = document.getElementById('total-users');
        const activeUsersEl = document.getElementById('active-users');
        const locationsCountEl = document.getElementById('locations-count');

        if (totalUsersEl) {
            if (this.currentLoggedInUser && this.currentLoggedInUser.role !== 'admin') {
                totalUsersEl.textContent = totalUsers;
            } else {
                totalUsersEl.textContent = totalUsers;
            }
        }
        
        if (activeUsersEl) {
            if (this.currentLoggedInUser && this.currentLoggedInUser.role !== 'admin') {
                activeUsersEl.textContent = activeUsers;
            } else {
                activeUsersEl.textContent = activeUsers;
            }
        }
        
        if (locationsCountEl) {
            if (this.currentLoggedInUser && this.currentLoggedInUser.role === 'admin') {
                locationsCountEl.textContent = locationsCount;
            } else {
                // For non-admin users, show their location name instead of count
                const locationName = this.currentLoggedInUser && this.currentLoggedInUser.location_name ? 
                    this.currentLoggedInUser.location_name : 'Your Location';
                locationsCountEl.textContent = locationName;
            }
        }
    }

    openCreateUserModal() {
        // Check if user has permission to create users
        if (!this.currentLoggedInUser || (this.currentLoggedInUser.role !== 'admin' && this.currentLoggedInUser.role !== 'location_manager')) {
            this.showError('You do not have permission to create users. Only administrators and location managers can create new user accounts.');
            return;
        }
        
        this.isEditing = false;
        this.currentUser = null;
        this.resetForm();
        
        // Auto-select location for location users
        if (this.currentLoggedInUser.role === 'location_manager') {
            setTimeout(() => {
                const locationSelect = document.getElementById('userLocation');
                if (locationSelect && this.currentLoggedInUser.location_id) {
                    locationSelect.value = this.currentLoggedInUser.location_id;
                    locationSelect.disabled = true; // Prevent changing location
                }
            }, 100);
        }
        
        document.getElementById('userModalTitle').textContent = 'Add New User';
        document.getElementById('userPassword').required = true;
        document.getElementById('userConfirmPassword').required = true;
        
        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
    }

    async editUser(userId) {
        try {
            const user = this.users.find(u => u.id === userId);
            if (!user) {
                this.showError('User not found');
                return;
            }

            // Check if user has permission to edit
            if (!this.currentLoggedInUser || 
                (this.currentLoggedInUser.role !== 'admin' && 
                 (this.currentLoggedInUser.role !== 'location_manager' || user.location_id !== this.currentLoggedInUser.location_id))) {
                this.showError('You do not have permission to edit this user. Location managers can only edit users from their own location.');
                return;
            }

            // Navigate to add-user page with user data for editing
            const editUrl = `/add-user?edit=${userId}`
                + `&name=${encodeURIComponent(user.name || '')}`
                + `&email=${encodeURIComponent(user.email || '')}`
                + `&username=${encodeURIComponent(user.username || '')}`
                + `&role=${encodeURIComponent(user.role || 'user')}`
                + `&location_id=${user.location_id || ''}`
                + `&is_active=${user.is_active ? 'true' : 'false'}`
                + `&base_hourly_rate=${encodeURIComponent((user.base_hourly_rate ?? 0).toString())}`;
            console.log('Navigating to edit URL:', editUrl);
            window.location.href = editUrl;
            
        } catch (error) {
            console.error('Error editing user:', error);
            this.showError('Failed to load user data');
        }
    }



    populateForm(user) {
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userUsername').value = user.username || '';
        document.getElementById('userRole').value = user.role || 'user';
        document.getElementById('userLocation').value = user.location_id || '';
        document.getElementById('userStatus').value = user.is_active ? 'true' : 'false';
        document.getElementById('userPassword').value = '';
        document.getElementById('userConfirmPassword').value = '';
    }





    async saveUser() {
        try {
            console.log('Starting saveUser process...');
            
            if (!this.validateForm()) {
                console.log('Form validation failed');
                return;
            }

            const formData = this.getFormData();
            console.log('Form data collected:', formData);
            
            if (this.isEditing) {
                console.log('Updating existing user...');
                await this.updateUser(formData);
            } else {
                console.log('Creating new user...');
                await this.createUser(formData);
            }
            
        } catch (error) {
            console.error('Error saving user:', error);
            this.showError(`Failed to save user: ${error.message}`);
        }
    }

    async createUser(userData) {
        console.log('Sending create user request with data:', userData);
        
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        console.log('Create user response status:', response.status);
        
        const responseData = await response.json();
        console.log('Create user response data:', responseData);

        if (!response.ok) {
            throw new Error(responseData.error || responseData.message || `HTTP ${response.status}: Failed to create user`);
        }

        if (!responseData.success) {
            throw new Error(responseData.error || responseData.message || 'Server returned error');
        }

        // Reload users to get the updated list with the new user
        await this.loadUsers();
        
        this.closeModal('userModal');
        this.showSuccess('User created successfully!');
    }

    async updateUser(userData) {
        console.log('Sending update user request with data:', userData);
        
        const response = await fetch(`/api/users/${userData.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        console.log('Update user response status:', response.status);
        
        const responseData = await response.json();
        console.log('Update user response data:', responseData);

        if (!response.ok) {
            throw new Error(responseData.error || responseData.message || `HTTP ${response.status}: Failed to update user`);
        }

        if (!responseData.success) {
            throw new Error(responseData.error || responseData.message || 'Server returned error');
        }

        // Reload users to get the updated list
        await this.loadUsers();
        
        this.closeModal('userModal');
        this.showSuccess('User updated successfully!');
    }

    deleteUser(userId) {
        // Check if user has permission to delete
        if (!this.currentLoggedInUser || this.currentLoggedInUser.role !== 'admin') {
            this.showError('You do not have permission to delete users. Only administrators can delete user accounts.');
            return;
        }
        
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            this.showError('User not found');
            return;
        }

        // Update delete modal content
        const deleteUserMessage = document.getElementById('deleteUserMessage');
        if (deleteUserMessage) {
            deleteUserMessage.textContent = `Are you sure you want to delete "${user.name || user.username || user.email}"? This action cannot be undone.`;
        }
        
        this.currentUser = user;
        
        // Show the custom modal
        const modal = document.getElementById('deleteUserModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    async confirmDeleteUser() {
        try {
            console.log('🔄 Starting user deletion process for user ID:', this.currentUser.id);
            
            // Show loading state
            this.showLoading(true);
            
            const response = await fetch(`/api/users/${this.currentUser.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const responseData = await response.json();
            console.log('✅ Delete user response:', responseData);
            
            if (!response.ok) {
                throw new Error(responseData.error || responseData.message || 'Failed to delete user');
            }

            if (!responseData.success) {
                throw new Error(responseData.error || responseData.message || 'Server returned error');
            }

            console.log('✅ User deleted successfully from server');
            
            // Reload users to get the updated list
            await this.loadUsers();
            console.log('✅ User list refreshed');
            
            // Verify the user was actually removed
            const deletedUserStillExists = this.users.find(u => u.id === this.currentUser.id);
            if (deletedUserStillExists) {
                console.warn('⚠️ Warning: Deleted user still appears in the list');
            } else {
                console.log('✅ Confirmed: User successfully removed from the list');
            }
            
            // Close the custom modal
            this.closeDeleteModal();
            console.log('✅ Delete modal closed');
            
            // Show success message
            this.showSuccess('User deleted successfully!');
            console.log('✅ Success notification shown');
            
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            this.showError('Failed to delete user: ' + error.message);
        } finally {
            // Hide loading state
            this.showLoading(false);
        }
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteUserModal');
        if (modal) {
            modal.classList.remove('active');
            console.log('✅ Delete modal closed successfully');
        } else {
            console.warn('⚠️ Delete modal element not found');
        }
        
        // Clear the current user reference
        this.currentUser = null;
        console.log('✅ Current user reference cleared');
    }

    getFormData() {
        const form = document.getElementById('userForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Convert string values to appropriate types
        data.id = data.userId ? parseInt(data.userId) : null;
        data.location_id = data.location_id ? parseInt(data.location_id) : null;
        data.is_active = data.is_active === 'true';
        
        // Handle password field properly
        const password = document.getElementById('userPassword').value;
        const confirmPassword = document.getElementById('userConfirmPassword').value;
        
        // For new users, password is required
        if (!this.isEditing) {
            if (password && password === confirmPassword) {
                data.password = password;
            } else {
                // Password validation will be handled by validateForm()
                data.password = password; // Include password even if invalid for proper error handling
            }
        } else {
            // For editing, only include password if provided and matches confirmation
            if (password && password === confirmPassword) {
                data.password = password;
            } else if (!password) {
                // If editing and no password provided, remove password field
                delete data.password;
            } else {
                // Password validation will be handled by validateForm()
                data.password = password; // Include password even if invalid for proper error handling
            }
        }
        
        // Remove confirmPassword from data as it's not needed for API
        delete data.confirmPassword;
        
        return data;
    }

    validateForm() {
        const form = document.getElementById('userForm');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return false;
        }

        // Password validation
        const password = document.getElementById('userPassword').value;
        const confirmPassword = document.getElementById('userConfirmPassword').value;
        
        // For new users, password is required and must be at least 6 characters
        if (!this.isEditing) {
            if (!password) {
                this.showError('Password is required for new users');
                return false;
            }
            if (password.length < 6) {
                this.showError('Password must be at least 6 characters long');
                return false;
            }
        } else {
            // For editing, if password is provided, it must be at least 6 characters
            if (password && password.length < 6) {
                this.showError('Password must be at least 6 characters long');
                return false;
            }
        }
        
        // Password confirmation validation
        if (password && password !== confirmPassword) {
            this.showError('Passwords do not match');
            return false;
        }

        // Email validation
        const email = document.getElementById('userEmail').value;
        if (!this.isValidEmail(email)) {
            this.showError('Please enter a valid email address');
            return false;
        }

        // Username validation
        const username = document.getElementById('userUsername').value;
        if (username.length < 3) {
            this.showError('Username must be at least 3 characters long');
            return false;
        }
        
        // Username format validation (alphanumeric and underscore only)
        const usernamePattern = /^[a-zA-Z0-9_]+$/;
        if (!usernamePattern.test(username)) {
            this.showError('Username can only contain letters, numbers, and underscores');
            return false;
        }

        return true;
    }

    validatePasswordMatch() {
        const password = document.getElementById('userPassword').value;
        const confirmPassword = document.getElementById('userConfirmPassword').value;
        const confirmInput = document.getElementById('userConfirmPassword');
        
        if (confirmPassword && password !== confirmPassword) {
            confirmInput.setCustomValidity('Passwords do not match');
        } else {
            confirmInput.setCustomValidity('');
        }
    }

    resetForm() {
        const form = document.getElementById('userForm');
        form.reset();
        
        // Clear any custom validation messages
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => input.setCustomValidity(''));
        
        // Re-enable location select for admin users
        const locationSelect = document.getElementById('userLocation');
        if (locationSelect && this.currentLoggedInUser && this.currentLoggedInUser.role === 'admin') {
            locationSelect.disabled = false;
        }
    }

    closeModal(modalId) {
        const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
        if (modal) {
            modal.hide();
        }
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const usersTable = document.getElementById('usersTable');
        const tableBody = document.getElementById('usersTableBody');
        
        if (show) {
            if (loadingIndicator) loadingIndicator.style.display = 'flex';
            if (usersTable) usersTable.style.display = 'none';
        } else {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (usersTable) usersTable.style.display = 'table';
            
            if (tableBody) {
                if (!Array.isArray(this.filteredUsers) || this.filteredUsers.length === 0) {
                    let message = 'No users found';
                    let description = 'Try adjusting your search criteria or add a new user.';
                    
                    if (this.currentLoggedInUser) {
                        if (this.currentLoggedInUser.role === 'admin') {
                            message = 'No users found';
                            description = 'Try adjusting your search criteria or add a new user.';
                        } else {
                            message = 'No team members found';
                            description = `No users are currently assigned to ${this.currentLoggedInUser.location_name || 'your location'}.`;
                        }
                    }
                    
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center py-5">
                                <div class="text-muted">
                                    <i class="fas fa-users fa-3x mb-3"></i>
                                    <h5>${message}</h5>
                                    <p>${description}</p>
                                </div>
                            </td>
                        </tr>
                    `;
                }
            }
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Utility functions
    getUserInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }

    getRoleClass(role) {
        switch (role) {
            case 'admin': return 'role-admin';
            case 'manager': return 'role-manager';
            default: return 'role-user';
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getLocationName(locationId) {
        if (!locationId || !Array.isArray(this.locations)) return null;
        const location = this.locations.find(loc => loc.id === locationId);
        return location ? location.name : null;
    }
}

// Global functions for HTML onclick handlers
function openAddUserModal() {
    if (usersManager) {
        usersManager.openCreateUserModal();
    }
}

function openCreateUserModal() {
    if (usersManager) {
        usersManager.openCreateUserModal();
    }
}

function saveUser() {
    usersManager.saveUser();
}

function editUser(userId) {
    usersManager.editUser(userId);
}



function deleteUser(userId) {
    usersManager.deleteUser(userId);
}

function confirmDeleteUser() {
    usersManager.confirmDeleteUser();
}

function closeDeleteModal() {
    if (usersManager) {
        usersManager.closeDeleteModal();
    }
}





// Additional utility functions for action buttons
function refreshUserData() {
    if (usersManager) {
        usersManager.loadUsers();
    }
}

function viewActiveUsers() {
    if (usersManager) {
        // Set status filter to active and reload
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.value = 'true';
            usersManager.filterUsers();
            usersManager.currentPage = 1;
            usersManager.renderUsers();
        }
    }
}

function manageLocations() {
    // Redirect to locations page
    window.location.href = '/locations';
}

// UsersManager class is initialized in the HTML file

// Global functions for user menu and authentication
function toggleUserMenu() {
    const userMenu = document.getElementById('user-menu');
    if (userMenu) {
        userMenu.classList.toggle('show');
    }
}

function signOut() {
    // Clear local storage
    localStorage.removeItem('username');
    localStorage.removeItem('isLoggedIn');
    
    // Redirect to login page
    window.location.href = '/login';
}

// Mobile menu functionality
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
}

// Initialize mobile menu button
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        const sidebar = document.querySelector('.sidebar');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        
        if (sidebar && sidebar.classList.contains('mobile-open') && 
            !sidebar.contains(e.target) && 
            !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
        }
    });
}); 