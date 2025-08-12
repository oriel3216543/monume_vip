/**
 * Add Location JavaScript Handler
 * Handles all functionality for the Add-Location page
 * Connects to server.py endpoints for location creation
 */

class AddLocationHandler {
    constructor() {
        this.form = null;
        this.submitButton = null;
        this.messageContainer = null;
        this.isSubmitting = false;
        
        this.init();
    }

    init() {
        console.log('🚀 Initializing Add Location Handler...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        console.log('📋 Setting up Add Location form...');
        
        // Get form elements
        this.form = document.getElementById('location-form');
        this.submitButton = this.form?.querySelector('button[type="submit"]');
        this.messageContainer = document.getElementById('message-container');
        
        if (!this.form) {
            console.error('❌ Location form not found!');
            return;
        }

        // Check if we're in edit mode
        this.isEditMode = this.checkEditMode();
        
        if (this.isEditMode) {
            this.loadEditData();
        }

        // Setup form event listeners
        this.setupFormListeners();
        
        // Setup URL slug generation
        this.setupUrlSlugGeneration();
        
        // Setup field validation
        this.setupFieldValidation();
        
        // Focus on first input
        this.focusFirstInput();
        
        console.log('✅ Add Location Handler setup complete');
    }

    checkEditMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const isEdit = urlParams.get('edit') === 'true';
        const editData = localStorage.getItem('editLocationData');
        
        return isEdit && editData;
    }

    loadEditData() {
        try {
            const editData = JSON.parse(localStorage.getItem('editLocationData'));
            console.log('📝 Loading edit data:', editData);
            
            // Populate form fields
            if (editData.location_name) {
                document.getElementById('location_name').value = editData.location_name;
            }
            if (editData.mall_area) {
                document.getElementById('mall_area').value = editData.mall_area;
            }
            if (editData.location_username) {
                document.getElementById('location_username').value = editData.location_username;
            }
            // For password field in edit mode, show placeholder instead of actual password
            if (editData.has_password) {
                const passwordField = document.getElementById('location_password');
                passwordField.placeholder = 'Current password: •••••••• (leave blank to keep current)';
                passwordField.value = ''; // Clear the field for security
            }
            if (editData.address) {
                document.getElementById('address').value = editData.address;
            }
            if (editData.unique_url_slug) {
                document.getElementById('unique_url_slug').value = editData.unique_url_slug;
            }
            
            // Update page title and button text
            document.title = 'Edit Location - MonuMe Tracker';
            const submitButton = this.form.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.innerHTML = '<i class="fas fa-save"></i> Update Location';
            }
            
            // Update header
            const header = document.querySelector('.page-header h1');
            if (header) {
                header.textContent = 'Edit Location';
            }
            
            // Store location ID for update
            this.locationId = editData.id;
            
            console.log('✅ Edit data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading edit data:', error);
        }
    }

    setupFormListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission();
        });

        // Real-time validation on input
        const inputs = this.form.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.validateField(input));
            input.addEventListener('blur', () => this.validateField(input));
        });

        // Clear errors on input
        inputs.forEach(input => {
            input.addEventListener('input', () => this.clearFieldError(input.id));
        });
    }

    setupUrlSlugGeneration() {
        const locationNameInput = document.getElementById('location_name');
        const urlSlugInput = document.getElementById('unique_url_slug');
        
        if (locationNameInput && urlSlugInput) {
            locationNameInput.addEventListener('input', (e) => {
                const slug = this.generateUrlSlug(e.target.value);
                urlSlugInput.value = slug;
            });
        }
    }

    setupFieldValidation() {
        // In edit mode, password is optional (can keep current password)
        const requiredFields = this.isEditMode 
            ? ['location_name', 'mall_area', 'location_username']
            : ['location_name', 'mall_area', 'location_username', 'location_password'];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateField(field));
            }
        });
        
        // For password field in edit mode, make it optional
        if (this.isEditMode) {
            const passwordField = document.getElementById('location_password');
            if (passwordField) {
                passwordField.removeAttribute('required');
            }
        }
    }

    focusFirstInput() {
        setTimeout(() => {
            const firstInput = document.getElementById('location_name');
            if (firstInput) {
                firstInput.focus();
            }
        }, 500);
    }

    generateUrlSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    validateField(field) {
        const value = field.value.trim();
        const isValid = value.length > 0;
        
        if (!isValid && field.hasAttribute('required')) {
            this.highlightFieldError(field.id);
            return false;
        } else {
            this.clearFieldError(field.id);
            return true;
        }
    }

    validateForm() {
        // In edit mode, password is optional (can keep current password)
        const requiredFields = this.isEditMode 
            ? ['location_name', 'mall_area', 'location_username']
            : ['location_name', 'mall_area', 'location_username', 'location_password'];
        
        let isValid = true;
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    highlightFieldError(fieldName) {
        const field = document.getElementById(fieldName);
        if (field) {
            field.style.borderColor = '#ef4444';
            field.style.backgroundColor = '#fef2f2';
        }
    }

    clearFieldError(fieldName) {
        const field = document.getElementById(fieldName);
        if (field) {
            field.style.borderColor = '';
            field.style.backgroundColor = '';
        }
    }

    showMessage(message, type = 'success') {
        if (!this.messageContainer) return;
        
        this.messageContainer.innerHTML = `
            <div class="message ${type}">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                ${message}
            </div>
        `;
    }

    clearMessage() {
        if (this.messageContainer) {
            this.messageContainer.innerHTML = '';
        }
    }

    setLoadingState(isLoading) {
        if (!this.submitButton) return;
        
        if (isLoading) {
            const action = this.isEditMode ? 'Updating' : 'Creating';
            this.submitButton.innerHTML = `<i class="fas fa-spinner spinner"></i> ${action}...`;
            this.submitButton.disabled = true;
            this.isSubmitting = true;
        } else {
            const action = this.isEditMode ? 'Update Location' : 'Create Location';
            const icon = this.isEditMode ? 'fa-save' : 'fa-save';
            this.submitButton.innerHTML = `<i class="fas ${icon}"></i> ${action}`;
            this.submitButton.disabled = false;
            this.isSubmitting = false;
        }
    }

    setSuccessState() {
        if (!this.submitButton) return;
        
        const action = this.isEditMode ? 'Updated' : 'Created';
        this.submitButton.innerHTML = `<i class="fas fa-check"></i> ${action}!`;
        this.submitButton.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    }

    async handleFormSubmission() {
        if (this.isSubmitting) {
            console.log('⚠️ Form submission already in progress');
            return;
        }

        console.log('📤 Submitting location form...');
        
        // Validate form
        if (!this.validateForm()) {
            this.showMessage('Please fill in all required fields correctly.', 'error');
            return;
        }

        // Set loading state
        this.setLoadingState(true);
        this.clearMessage();

        try {
            // Prepare form data
            const formData = new FormData(this.form);
            
            // Add location ID if in edit mode
            if (this.isEditMode && this.locationId) {
                formData.append('location_id', this.locationId);
            }
            
            // Make API call to server
            const response = await this.submitToServer(formData);
            
            if (response.success) {
                this.handleSuccess(response);
            } else {
                this.handleError(response);
            }
            
        } catch (error) {
            console.error('❌ Form submission error:', error);
            this.handleNetworkError(error);
        } finally {
            this.setLoadingState(false);
        }
    }

    async submitToServer(formData) {
        console.log('🌐 Submitting to server...');
        
        // Determine endpoint based on edit mode
        const endpoint = this.isEditMode ? '/update_location' : '/add_location';
        console.log(`📡 Using endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData,
            credentials: 'same-origin'
        });

        console.log('📥 Server response status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Server response:', result);
            return { success: true, data: result };
        } else {
            const errorText = await response.text();
            console.error('❌ Server error response:', errorText);
            
            let errorMessage = 'Unknown error';
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorJson.message || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            
            return { 
                success: false, 
                error: errorMessage, 
                status: response.status 
            };
        }
    }

    handleSuccess(response) {
        const action = this.isEditMode ? 'updated' : 'created';
        console.log(`🎉 Location ${action} successfully:`, response.data);
        
        // Show success state
        this.setSuccessState();
        this.showMessage(`Location ${action} successfully! Redirecting...`, 'success');
        
        // Clear edit data from localStorage
        if (this.isEditMode) {
            localStorage.removeItem('editLocationData');
        }
        
        // Redirect after delay
        setTimeout(() => {
            window.location.href = '/locations';
        }, 2000);
    }

    handleError(response) {
        console.error('❌ Location creation failed:', response.error);
        
        // Handle specific error types
        if (response.status === 401) {
            this.showMessage('Authentication required. Please log in as an admin.', 'error');
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            return;
        }
        
        // Highlight specific field errors
        this.highlightFieldErrors(response.error);
        
        // Show error message
        this.showMessage('Error creating location: ' + response.error, 'error');
    }

    handleNetworkError(error) {
        console.error('🌐 Network error:', error);
        this.showMessage('Network error. Please check your connection and try again.', 'error');
    }

    highlightFieldErrors(errorMessage) {
        const errorMessageLower = errorMessage.toLowerCase();
        
        if (errorMessageLower.includes('location name')) {
            this.highlightFieldError('location_name');
        } else if (errorMessageLower.includes('mall') || errorMessageLower.includes('area')) {
            this.highlightFieldError('mall_area');
        } else if (errorMessageLower.includes('username')) {
            this.highlightFieldError('location_username');
        } else if (errorMessageLower.includes('password')) {
            this.highlightFieldError('location_password');
        }
    }
}

// Global functions for HTML onclick handlers
function goBack() {
    window.location.href = '/locations';
}

// Initialize the handler when the script loads
const addLocationHandler = new AddLocationHandler();

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AddLocationHandler;
} 