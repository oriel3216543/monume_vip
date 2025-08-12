// Enhanced Appointment Management System
// MonuMe Performance Dashboard - Appointment Module

class AppointmentManager {
    constructor() {
        this.calendar = null;
        this.appointments = [];
        this.isLoading = false;
        this.currentView = 'calendar';
        this.editingAppointment = null; // Track which appointment is being edited
        
        // Initialize the application
        this.init();
    }

    async init() {
        try {
            console.log('Starting appointment manager initialization...');
            // Ensure authentication/session context is ready before proceeding
            if (window.__authPromise) {
                await window.__authPromise;
            }
            
            // Initialize UI components first
            console.log('Initializing elements...');
            this.initializeElements();
            
            console.log('Setting up event listeners...');
            this.setupEventListeners();
            
            // Initialize calendar immediately - no loading delay
            console.log('Initializing calendar...');
            this.initializeCalendar();
            
                    // Setup sidebar functionality
        console.log('Setting up sidebar...');
        this.setupSidebarFunctionality();
        
        // Setup real-time synchronization
        console.log('Setting up real-time sync...');
        this.setupRealTimeSync();
        
        // Load initial data
            console.log('Loading appointments...');
            await this.loadAppointments();
        
            console.log('Loading hosts...');
            await this.loadHosts();
            
            // Ensure both views are rendered initially
            console.log('Rendering initial views...');
            this.updateCalendarEvents();
            this.renderAppointmentsList();
            
            // Add smooth entrance animations
            console.log('Adding animations...');
            this.addEntranceAnimations();
            
            console.log('Appointment manager initialized successfully!');
            
        } catch (error) {
            console.error('Failed to initialize appointment manager:', error);
            
            // Provide more specific error message
            let errorMessage = 'Failed to initialize the application. ';
            if (error.message) {
                errorMessage += `Error: ${error.message}. `;
            }
            errorMessage += 'Please refresh the page and try again.';
            
            this.showError(errorMessage);
        }
    }

    // Initialize DOM elements
    initializeElements() {
        this.elements = {
            // Main containers
            loadingOverlay: document.getElementById('loading-overlay'),
            
            // Header elements
            addAppointmentBtn: document.getElementById('add-appointment-btn'),
            helpBtn: document.getElementById('help-btn'),
            
            // Alerts
            successAlert: document.getElementById('success-alert'),
            errorAlert: document.getElementById('error-alert'),
            successMessage: document.getElementById('success-message'),
            errorMessage: document.getElementById('error-message'),
            
            // Tab navigation
            tabButtons: document.querySelectorAll('.tab-btn'),
            
            // Views
            calendarView: document.getElementById('calendar-view'),
            listView: document.getElementById('list-view'),
            appointmentsGrid: document.getElementById('appointments-grid'),
            calendar: document.getElementById('calendar'),
            
            // Modal elements
            modal: document.getElementById('appointment-modal'),
            modalClose: document.getElementById('close-modal'),
            appointmentForm: document.getElementById('appointment-form'),
            cancelFormBtn: document.getElementById('cancel-form-btn'),
            
            // Form fields
            clientName: document.getElementById('client-name'),
            clientEmail: document.getElementById('client-email'),
            clientPhone: document.getElementById('client-phone'),
            appointmentDate: document.getElementById('appointment-date'),
            appointmentHour: document.getElementById('appointment-hour'),
            appointmentMinute: document.getElementById('appointment-minute'),
            appointmentAmpm: document.getElementById('appointment-ampm'),
            appointmentType: document.getElementById('appointment-type'),
            appointmentHost: document.getElementById('appointment-host'),
            appointmentNotes: document.getElementById('appointment-notes'),
            
            // Email template fields
            appointmentEmailTemplate: document.getElementById('appointment-email-template'),
            emailPreviewGroup: document.getElementById('email-preview-group'),
            previewEmailBtn: document.getElementById('preview-email-btn'),
            
            // Filter system
            filterBtn: document.getElementById('filter-btn'),
            filterModal: document.getElementById('filter-modal'),
            closeFilterModal: document.getElementById('close-filter-modal'),
            applyFiltersBtn: document.getElementById('apply-filters-btn'),
            clearFiltersBtn: document.getElementById('clear-filters-btn'),
            showPastAppointments: document.getElementById('show-past-appointments'),
            filterDateFrom: document.getElementById('filter-date-from'),
            filterDateTo: document.getElementById('filter-date-to'),
            filterType: document.getElementById('filter-type'),
            filterHost: document.getElementById('filter-host'),
            filterPhone: document.getElementById('filter-phone'),
            filterCustomerName: document.getElementById('filter-customer-name'),
            filterStatus: document.getElementById('filter-status')
        };

        // Initialize filter state
        // **CRITICAL FIX: Default state shows all appointments (like calendar view)**
        this.filters = {
            showPast: false, // Only matters when other filters are active
            dateFrom: '',
            dateTo: '',
            type: '',
            host: '',
            phone: '',
            customerName: '',
            status: ''
        };

        // Validate critical elements exist
        const criticalElements = ['calendar', 'calendarView', 'listView'];
        const missing = criticalElements.filter(id => !this.elements[id]);
        
        if (missing.length > 0) {
            throw new Error(`Critical elements missing: ${missing.join(', ')}`);
        }
        
        console.log('All critical elements found');
    }

    // Setup event listeners
    setupEventListeners() {
        // Header buttons
        this.elements.addAppointmentBtn?.addEventListener('click', () => this.openModal());
        this.elements.helpBtn?.addEventListener('click', () => this.showHelp());
        
        // Modal controls
        this.elements.modalClose?.addEventListener('click', () => this.closeModal());
        this.elements.cancelFormBtn?.addEventListener('click', () => this.closeModal());
        
        // Form submission
        this.elements.appointmentForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Tab navigation
        this.elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });
        
        // Modal backdrop click
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.closeModal();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Form validation
        this.setupFormValidation();
        
        // **NEW: Time conflict checking event listeners**
        this.setupTimeConflictListeners();
        
        // Email template functionality
        this.setupEmailTemplateListeners();
        
        // Filter system
        this.setupFilterSystem();
    }

    // Setup filter system
    setupFilterSystem() {
        // Show filter button only in list view
        this.updateFilterButtonVisibility();
        
        // Filter button event
        this.elements.filterBtn?.addEventListener('click', () => this.openFilterModal());
        
        // Filter modal events
        this.elements.closeFilterModal?.addEventListener('click', () => this.closeFilterModal());
        this.elements.applyFiltersBtn?.addEventListener('click', () => this.applyFilters());
        this.elements.clearFiltersBtn?.addEventListener('click', () => this.clearFilters());
        
        // Close filter modal on backdrop click
        this.elements.filterModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.filterModal) {
                this.closeFilterModal();
            }
        });
        
        // Setup quick filter buttons
        this.setupQuickFilterButtons();
        
        // Populate filter dropdowns
        this.populateFilterDropdowns();
    }

    // Setup quick filter buttons functionality
    setupQuickFilterButtons() {
        const quickFilterButtons = document.querySelectorAll('.quick-filter-btn');
        
        quickFilterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all buttons
                quickFilterButtons.forEach(b => b.classList.remove('active'));
                
                // Add active class to clicked button
                btn.classList.add('active');
                
                // Get filter type
                const filterType = btn.dataset.filter;
                
                // Clear date range inputs when using quick filters
                this.elements.filterDateFrom.value = '';
                this.elements.filterDateTo.value = '';
                
                // Apply the quick filter
                this.applyQuickFilter(filterType);
            });
        });
    }

    // Apply quick filter based on type
    applyQuickFilter(filterType) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Reset other filters first
        this.clearOtherFilters();
        
        switch (filterType) {
            case 'upcoming':
                // Show only future appointments (default behavior)
                this.filters.showPast = false;
                this.elements.showPastAppointments.checked = false;
                break;
                
            case 'all':
                // Show all appointments (past + future)
                this.filters.showPast = true;
                this.elements.showPastAppointments.checked = true;
                break;
                
            case 'today':
                // Show only today's appointments
                this.filters.dateFrom = todayStr;
                this.filters.dateTo = todayStr;
                this.filters.showPast = true; // Need to show past to include today's past appointments
                this.elements.filterDateFrom.value = todayStr;
                this.elements.filterDateTo.value = todayStr;
                this.elements.showPastAppointments.checked = true;
                break;
                
            case 'week':
                // Show this week's appointments
                const startOfWeek = new Date(today);
                const dayOfWeek = today.getDay();
                startOfWeek.setDate(today.getDate() - dayOfWeek);
                
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                
                this.filters.dateFrom = startOfWeek.toISOString().split('T')[0];
                this.filters.dateTo = endOfWeek.toISOString().split('T')[0];
                this.filters.showPast = true; // Need to show past to include this week's past appointments
                this.elements.filterDateFrom.value = this.filters.dateFrom;
                this.elements.filterDateTo.value = this.filters.dateTo;
                this.elements.showPastAppointments.checked = true;
                break;
        }
        
        // Update other form fields
        this.updateFormFromFilters();
        
        // Apply the filters immediately
        this.renderAppointmentsList();
        
        // Update filter button state
        this.updateFilterButtonState();
        
        console.log('🔍 Applied quick filter:', filterType, this.filters);
    }

    // Clear other filters (keep only the ones we're setting)
    clearOtherFilters() {
        // Don't clear dateFrom/dateTo here as we might be setting them
        // Only clear the other filter types
        this.filters.type = '';
        this.filters.host = '';
        this.filters.phone = '';
        this.filters.customerName = '';
        this.filters.status = '';
    }

    // Update form fields to match current filters
    updateFormFromFilters() {
        if (this.elements.filterType) this.elements.filterType.value = this.filters.type || '';
        if (this.elements.filterHost) this.elements.filterHost.value = this.filters.host || '';
        if (this.elements.filterPhone) this.elements.filterPhone.value = this.filters.phone || '';
        if (this.elements.filterCustomerName) this.elements.filterCustomerName.value = this.filters.customerName || '';
        if (this.elements.filterStatus) this.elements.filterStatus.value = this.filters.status || '';
    }

    // Update filter button visibility based on current view
    updateFilterButtonVisibility() {
        if (this.elements.filterBtn) {
            if (this.currentView === 'list') {
                this.elements.filterBtn.style.display = 'flex';
            } else {
                this.elements.filterBtn.style.display = 'none';
            }
        }
    }

    // Open filter modal
    openFilterModal() {
        this.elements.filterModal?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Close filter modal
    closeFilterModal() {
        this.elements.filterModal?.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    // Apply filters
    applyFilters() {
        // Gather filter values
        this.filters = {
            showPast: this.elements.showPastAppointments?.checked || false,
            dateFrom: this.elements.filterDateFrom?.value || '',
            dateTo: this.elements.filterDateTo?.value || '',
            type: this.elements.filterType?.value || '',
            host: this.elements.filterHost?.value || '',
            phone: this.elements.filterPhone?.value?.trim() || '',
            customerName: this.elements.filterCustomerName?.value?.trim() || '',
            status: this.elements.filterStatus?.value || ''
        };

        console.log('Applied filters:', this.filters);
        
        // Update filter button appearance
        this.updateFilterButtonState();
        
        // Re-render the list with filters
        this.renderAppointmentsList();
        
        // Close modal
        this.closeFilterModal();
    }

    // Clear all filters
    clearFilters() {
        // Reset filter values
        this.filters = {
            showPast: false, // Default state - only matters when other filters are active
            dateFrom: '',
            dateTo: '',
            type: '',
            host: '',
            phone: '',
            customerName: '',
            status: ''
        };

        // Reset form fields
        if (this.elements.showPastAppointments) this.elements.showPastAppointments.checked = false;
        if (this.elements.filterDateFrom) this.elements.filterDateFrom.value = '';
        if (this.elements.filterDateTo) this.elements.filterDateTo.value = '';
        if (this.elements.filterType) this.elements.filterType.value = '';
        if (this.elements.filterHost) this.elements.filterHost.value = '';
        if (this.elements.filterPhone) this.elements.filterPhone.value = '';
        if (this.elements.filterCustomerName) this.elements.filterCustomerName.value = '';
        if (this.elements.filterStatus) this.elements.filterStatus.value = '';

        // Update filter button
        this.updateFilterButtonState();
        
        // Re-render list
        this.renderAppointmentsList();
        
        // Close modal
        this.closeFilterModal();
    }

    // Update filter button state
    updateFilterButtonState() {
        if (!this.elements.filterBtn) return;

        const activeFilters = this.getActiveFilterCount();
        
        if (activeFilters > 0) {
            this.elements.filterBtn.classList.add('active');
            
            // Add filter count badge
            let countBadge = this.elements.filterBtn.querySelector('.filter-count');
            if (!countBadge) {
                countBadge = document.createElement('span');
                countBadge.className = 'filter-count';
                this.elements.filterBtn.appendChild(countBadge);
            }
            countBadge.textContent = activeFilters;
        } else {
            this.elements.filterBtn.classList.remove('active');
            const countBadge = this.elements.filterBtn.querySelector('.filter-count');
            if (countBadge) {
                countBadge.remove();
            }
        }
    }

    // Get active filter count
    getActiveFilterCount() {
        let count = 0;
        // Count showPast as an active filter if checked
        if (this.filters.showPast) count++;
        if (this.filters.dateFrom || this.filters.dateTo) count++;
        if (this.filters.type) count++;
        if (this.filters.host) count++;
        if (this.filters.phone) count++;
        if (this.filters.customerName) count++;
        if (this.filters.status) count++;
        return count;
    }

    // Populate filter dropdowns
    populateFilterDropdowns() {
        // Populate host filter (same as appointment host dropdown)
        this.populateHostFilter();
    }

    // Populate host filter dropdown
    populateHostFilter() {
        if (!this.elements.filterHost) return;
        
        this.elements.filterHost.innerHTML = '<option value="">All Hosts</option>';
        
        const hosts = [
            { id: 'admin', name: 'Admin User' },
            { id: 'manager', name: 'Manager User' },
            { id: 'staff1', name: 'Staff Member 1' },
            { id: 'staff2', name: 'Staff Member 2' }
        ];
        
        hosts.forEach(host => {
            const option = document.createElement('option');
            option.value = host.id;
            option.textContent = host.name;
            this.elements.filterHost.appendChild(option);
        });
    }

    // Check if any filters are actively being used (excluding showPast)
    hasActiveFilters() {
        return !!(
            this.filters.dateFrom ||
            this.filters.dateTo ||
            this.filters.type ||
            this.filters.host ||
            this.filters.phone ||
            this.filters.customerName ||
            this.filters.status
        );
    }

    // Check if showPast filter is being used as a standalone filter
    isShowPastOnlyFilter() {
        return this.filters.showPast && !this.hasActiveFilters();
    }

    // Filter appointments based on current filters
    filterAppointments(appointments) {
        if (!appointments || !Array.isArray(appointments)) {
            return [];
        }
        
        return appointments.filter(appointment => {
            // Fix timezone issue by parsing date components manually
            const [year, month, day] = appointment.date.split('-').map(num => parseInt(num, 10));
            const appointmentDate = new Date(year, month - 1, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // **UPDATED: Smart past appointment filtering**
            const filtersActive = this.hasActiveFilters();
            const showPastExplicitlyChecked = this.filters.showPast === true;
            
            if (!filtersActive && !showPastExplicitlyChecked) {
                // Default behavior: show only future/today appointments when no filters
                if (appointmentDate < today) {
                    return false;
                }
            } else if (showPastExplicitlyChecked) {
                // When "Show Past Appointments" is checked, show ALL appointments (past + future)
                // No date filtering - show everything
            } else if (filtersActive && !showPastExplicitlyChecked) {
                // When other filters are active but showPast is not checked, hide past appointments
                if (appointmentDate < today) {
                    return false;
                }
            }

            // Filter by date range
            if (this.filters.dateFrom) {
                const [fromYear, fromMonth, fromDay] = this.filters.dateFrom.split('-').map(num => parseInt(num, 10));
                const fromDate = new Date(fromYear, fromMonth - 1, fromDay);
                if (appointmentDate < fromDate) return false;
            }
            if (this.filters.dateTo) {
                const [toYear, toMonth, toDay] = this.filters.dateTo.split('-').map(num => parseInt(num, 10));
                const toDate = new Date(toYear, toMonth - 1, toDay);
                if (appointmentDate > toDate) return false;
            }

            // Filter by type
            if (this.filters.type && appointment.type !== this.filters.type) {
                return false;
            }

            // Filter by host
            if (this.filters.host && appointment.hostId !== this.filters.host) {
                return false;
            }

            // Filter by phone
            if (this.filters.phone) {
                const phoneSearch = this.filters.phone.toLowerCase();
                const appointmentPhone = (appointment.clientPhone || '').toLowerCase();
                if (!appointmentPhone.includes(phoneSearch)) return false;
            }

            // Filter by customer name
            if (this.filters.customerName) {
                const nameSearch = this.filters.customerName.toLowerCase();
                const customerName = appointment.clientName.toLowerCase();
                if (!customerName.includes(nameSearch)) return false;
            }

            // Filter by status
            if (this.filters.status && appointment.status !== this.filters.status) {
                return false;
            }

            return true;
        });
    }

    // Setup form validation
    setupFormValidation() {
        const inputs = [
            this.elements.clientName,
            this.elements.clientEmail,
            this.elements.clientPhone,
            this.elements.appointmentDate,
            this.elements.appointmentHour,
            this.elements.appointmentMinute,
            this.elements.appointmentAmpm,
            this.elements.appointmentType
        ];

        inputs.forEach(input => {
            if (input) {
                input.addEventListener('input', () => this.validateField(input));
                input.addEventListener('blur', () => this.validateField(input));
            }
        });
    }

    // Validate individual field
    validateField(field) {
        const isValid = field.checkValidity();
        
        if (isValid) {
            field.classList.remove('error');
            field.classList.add('valid');
        } else {
            field.classList.remove('valid');
            field.classList.add('error');
        }
        
        return isValid;
    }

    // Handle keyboard shortcuts
    handleKeyboardShortcuts(e) {
        // Escape to close modal
        if (e.key === 'Escape' && this.elements.modal?.classList.contains('active')) {
            this.closeModal();
        }
        
        // Ctrl/Cmd + N for new appointment
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.openModal();
        }
        
        // Ctrl/Cmd + S to save form (when modal is open)
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && this.elements.modal?.classList.contains('active')) {
            e.preventDefault();
            this.elements.appointmentForm?.dispatchEvent(new Event('submit'));
        }
    }

    // Setup sidebar functionality
    setupSidebarFunctionality() {
        try {
            // Highlight current page in sidebar
            this.highlightCurrentPage();
            
            // Setup mobile sidebar toggle if exists
            this.setupMobileSidebar();
            
        } catch (error) {
            console.error('Error setting up sidebar:', error);
        }
    }

    // Setup real-time synchronization with dashboard
    setupRealTimeSync() {
        // Check for new appointments when window gets focus
        // This happens when user switches from dashboard back to appointments page
        window.addEventListener('focus', () => {
            console.log('🔍 Window focused - checking for new appointments...');
            this.reloadAppointmentsFromStorage();
        });

        // Also check every 30 seconds in case user has both pages open
        setInterval(() => {
            this.reloadAppointmentsFromStorage();
        }, 30000);

        // Check when page becomes visible (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('🔍 Page became visible - checking for new appointments...');
                this.reloadAppointmentsFromStorage();
            }
        });

        console.log('✅ Real-time sync setup complete');
    }

    // Force refresh all views (calendar and list) - ensures perfect synchronization
    forceRefreshAllViews() {
        try {
            console.log('🔄 FORCE REFRESHING ALL VIEWS');
            console.log('📊 Current appointments before refresh:', this.appointments.length);
            console.log('🔍 First appointment before refresh:', this.appointments[0] ? JSON.stringify(this.appointments[0], null, 2) : 'No appointments');
            
            // Update calendar view
            console.log('📅 Updating calendar...');
            this.updateCalendarEvents();
            
            // Update list view
            console.log('📋 Updating list view...');
            this.renderAppointmentsList();
            
            // Force re-populate filter dropdowns
            console.log('🔄 Updating filter dropdowns...');
            this.populateFilterDropdowns();
            
            // If calendar exists, also force a size update
            if (this.calendar) {
                setTimeout(() => {
                    this.calendar.updateSize();
                }, 100);
            }
            
            console.log('✅ All views refreshed successfully');
            
            // Verify views actually updated
            setTimeout(() => {
                console.log('🔍 POST-REFRESH VERIFICATION:');
                console.log('  - Calendar events count:', this.calendar ? this.calendar.getEvents().length : 'No calendar');
                console.log('  - List view items:', document.querySelectorAll('.appointment-card-list, .appointment-card').length);
                
                // Double-check the first appointment in the views
                const firstCalendarEvent = this.calendar ? this.calendar.getEvents()[0] : null;
                if (firstCalendarEvent) {
                    console.log('  - First calendar event:', {
                        id: firstCalendarEvent.id,
                        title: firstCalendarEvent.title,
                        start: firstCalendarEvent.start
                    });
                }
            }, 200);
        } catch (error) {
            console.error('Error force refreshing views:', error);
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
                
                // Check if this is the current page
                if (href === currentPage || 
                    (currentPage === 'appointment.html' && href === 'appointment.html')) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            }
        });
    }

    // Setup mobile sidebar toggle
    setupMobileSidebar() {
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                const icon = sidebarToggle.querySelector('i');
                
                if (sidebar.classList.contains('active')) {
                    icon.className = 'fas fa-times';
                } else {
                    icon.className = 'fas fa-bars';
                }
            });
        }
    }

    // Initialize FullCalendar
    initializeCalendar() {
        console.log('Initializing calendar...');
        
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) {
            console.error('Calendar element not found!');
            return;
        }

        console.log('Calendar element found, creating FullCalendar instance...');

        try {
            this.calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                },
                editable: true,
                selectable: true,
                selectMirror: true,
                dayMaxEvents: 2,
                weekends: true,
                
                // Enhanced event display settings
                eventDisplay: 'block',
                displayEventTime: true,
                displayEventEnd: false,
                eventMinHeight: 30,
                eventShortHeight: 20,
                
                // Week/Day view specific settings
                slotMinTime: '08:00:00',
                slotMaxTime: '19:00:00',
                slotDuration: '00:15:00',
                slotLabelInterval: '01:00',
                allDaySlot: false,
                
                // Event handlers
                select: (info) => this.handleCalendarSelect(info),
                eventClick: (info) => this.handleEventClick(info),
                eventDrop: (info) => this.handleEventDrop(info),
                eventResize: (info) => this.handleEventResize(info),
                
                // Styling
                themeSystem: 'standard',
                height: 'auto',
                
                // Custom event rendering
                eventContent: (arg) => this.renderEvent(arg),
                
                // Custom "more" link rendering
                moreLinkContent: (arg) => {
                    const count = arg.num;
                    return `+${count}`;
                },
                
                // Event appearance settings
                eventClassNames: function(arg) {
                    return ['appointment-event'];
                },
                
                // Better spacing for events
                eventMargin: 2,
                eventBorderWidth: 0
            });

            console.log('FullCalendar instance created, rendering...');
            this.calendar.render();
            console.log('Calendar rendered successfully!');
            
        } catch (error) {
            console.error('Error initializing calendar:', error);
        }
    }

    // Custom event rendering - Enhanced for beautiful week/day views
    renderEvent(arg) {
        const event = arg.event;
        const view = arg.view;
        const type = event.extendedProps.type || '';
        const clientName = event.extendedProps.clientName || '';
        const clientPhone = event.extendedProps.clientPhone || '';
        const status = event.extendedProps.status || 'scheduled';
        
        // Get appointment type icon and color
        const typeInfo = this.getAppointmentTypeInfo(type);
        const statusInfo = this.getStatusInfo(status);
        
        // Different rendering based on view type
        if (view.type === 'dayGridMonth') {
            // Month view: Compact display with time and type
            const startTime = event.start ? event.start.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            }) : '';
            
            return {
                html: `
                    <div class="fc-event-content appointment-event ${typeInfo.class} status-${status}">
                        <div class="event-header-month">
                            <i class="${typeInfo.icon}" style="color: ${typeInfo.color};"></i>
                            <span class="event-time-month">${startTime}</span>
                        </div>
                        <div class="event-title-month">${type} - ${clientName}</div>
                    </div>
                `
            };
        } else if (view.type === 'timeGridWeek') {
            // Week view: More detailed display
            return {
                html: `
                    <div class="fc-event-content appointment-event ${typeInfo.class} status-${status}">
                        <div class="event-header-week">
                            <i class="${typeInfo.icon}" style="color: ${typeInfo.color};"></i>
                            <span class="event-type-week">${type}</span>
                            <div class="status-indicator-week" style="background-color: ${statusInfo.color};" title="${statusInfo.label}"></div>
                        </div>
                        <div class="event-client-week">${clientName}</div>
                        <div class="event-phone-week">
                            <i class="fas fa-phone" style="color: #666; font-size: 10px;"></i>
                            ${clientPhone || 'No phone'}
                        </div>
                    </div>
                `
            };
        } else {
            // Day view: Most detailed display
            return {
                html: `
                    <div class="fc-event-content appointment-event ${typeInfo.class} status-${status}">
                        <div class="event-header-day">
                            <div class="event-type-day">
                                <i class="${typeInfo.icon}" style="color: ${typeInfo.color};"></i>
                                <span>${type}</span>
                            </div>
                            <div class="status-badge-day ${statusInfo.class}" style="background-color: ${statusInfo.color};">
                                <i class="${statusInfo.icon}"></i>
                                ${statusInfo.label}
                            </div>
                        </div>
                        <div class="event-client-day">
                            <i class="fas fa-user" style="color: #555; margin-right: 6px;"></i>
                            ${clientName}
                        </div>
                        <div class="event-contact-day">
                            <div class="contact-item">
                                <i class="fas fa-phone" style="color: #666;"></i>
                                ${clientPhone || 'No phone'}
                            </div>
                        </div>
                    </div>
                `
            };
        }
    }

    // Get appointment type information (icon, color, class)
    getAppointmentTypeInfo(type) {
        const types = {
            'MonuMe': {
                icon: 'fas fa-gem',
                color: '#ff9562',
                class: 'type-monume'
            },
            'FameMe': {
                icon: 'fas fa-star',
                color: '#10b981',
                class: 'type-fameme'
            },
            'CrystalMe': {
                icon: 'fas fa-diamond',
                color: '#3b82f6',
                class: 'type-crystalme'
            }
        };
        
        return types[type] || {
            icon: 'fas fa-calendar-check',
            color: '#6b7280',
            class: 'type-default'
        };
    }

    // Get status information (color, icon, label)
    getStatusInfo(status) {
        const statuses = {
            'scheduled': {
                color: '#3b82f6',
                icon: 'fas fa-clock',
                label: 'Scheduled',
                class: 'status-scheduled'
            },
            'confirmed': {
                color: '#10b981',
                icon: 'fas fa-check-circle',
                label: 'Confirmed',
                class: 'status-confirmed'
            },
            'completed': {
                color: '#8b5cf6',
                icon: 'fas fa-check-double',
                label: 'Completed',
                class: 'status-completed'
            },
            'cancelled': {
                color: '#ef4444',
                icon: 'fas fa-times-circle',
                label: 'Cancelled',
                class: 'status-cancelled'
            },
            'rescheduled': {
                color: '#f59e0b',
                icon: 'fas fa-calendar-alt',
                label: 'Rescheduled',
                class: 'status-rescheduled'
            }
        };
        
        return statuses[status] || statuses['scheduled'];
    }

    // Handle calendar date selection
    handleCalendarSelect(info) {
        this.openModal();
        
        // Pre-fill the date and time
        const selectedDate = info.start.toISOString().split('T')[0];
        this.elements.appointmentDate.value = selectedDate;
        
        // Set default time if it's today or future
        const now = new Date();
        if (info.start >= now) {
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            // Round up to next 15-minute interval
            let nextHour = currentHour;
            let nextMinute = 0;
            
            if (currentMinute <= 0) nextMinute = 15;
            else if (currentMinute <= 15) nextMinute = 30;
            else if (currentMinute <= 30) nextMinute = 45;
            else if (currentMinute <= 45) {
                nextMinute = 0;
                nextHour++;
            } else {
                nextMinute = 0;
                nextHour++;
            }
            
            // Make sure it's during business hours (8 AM - 6 PM)
            if (nextHour < 8) {
                nextHour = 9;
                nextMinute = 0;
            } else if (nextHour >= 18) {
                nextHour = 9;
                nextMinute = 0;
            }
            
            // Convert to 12-hour format and set dropdowns
            let displayHour = nextHour;
            let displayAmpm = 'AM';
            
            if (nextHour === 0) {
                displayHour = 12;
                displayAmpm = 'AM';
            } else if (nextHour === 12) {
                displayHour = 12;
                displayAmpm = 'PM';
            } else if (nextHour > 12) {
                displayHour = nextHour - 12;
                displayAmpm = 'PM';
            }
            
            this.elements.appointmentHour.value = displayHour.toString();
            this.elements.appointmentMinute.value = nextMinute.toString().padStart(2, '0');
            this.elements.appointmentAmpm.value = displayAmpm;
        }
    }

    // Handle event click - open edit modal
    handleEventClick(info) {
        const appointment = this.appointments.find(apt => apt.id === info.event.id);
        if (appointment) {
            this.editAppointment(appointment.id);
        }
    }

    // Handle event drop (drag and drop)
    async handleEventDrop(info) {
        const appointmentId = info.event.id;
        const newDate = info.event.start;
        
        try {
            await this.updateAppointmentDateTime(appointmentId, newDate);
            this.showSuccess('Appointment rescheduled successfully');
        } catch (error) {
            info.revert();
            this.showError('Failed to reschedule appointment');
        }
    }

    // Handle event resize
    async handleEventResize(info) {
        // Handle duration changes if needed
        console.log('Event resized:', info);
    }

    // Switch between calendar and list views
    switchView(view) {
        if (this.currentView === view) return;
        
        this.currentView = view;
        
        // Update tab buttons
        this.elements.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Reload appointments from localStorage before switching views (skip refresh to avoid loops)
        // This ensures we see any new appointments added from dashboard
        this.reloadAppointmentsFromStorage(true);
        
        // Animate view transition
        if (view === 'calendar') {
            this.elements.listView.style.display = 'none';
            this.elements.calendarView.style.display = 'block';
            
            // Refresh calendar after view change
            setTimeout(() => {
                if (this.calendar) {
                    this.calendar.updateSize();
                    // Make sure calendar events are up to date
                    this.updateCalendarEvents();
                }
            }, 100);
        } else {
            this.elements.calendarView.style.display = 'none';
            this.elements.listView.style.display = 'block';
            // Always refresh list view when switching to it
            this.renderAppointmentsList();
        }
        
        // Add smooth transition effect
        this.addViewTransitionEffect();
        
        // Update filter button visibility
        this.updateFilterButtonVisibility();
    }

    // Add view transition effect
    addViewTransitionEffect() {
        const activeView = this.currentView === 'calendar' ? 
            this.elements.calendarView : this.elements.listView;
        
        activeView.style.opacity = '0';
        activeView.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            activeView.style.transition = 'all 0.3s ease';
            activeView.style.opacity = '1';
            activeView.style.transform = 'translateY(0)';
        }, 50);
    }

    // Open appointment modal
    openModal(isNewAppointment = true) {
        if (isNewAppointment) {
            // Reset for new appointment
            this.editingAppointment = null;
            console.log('📝 Opening modal for NEW appointment');
            this.elements.appointmentForm.reset();
            
            // Reset modal title and button text for new appointment
            const modalTitle = document.querySelector('.modal-title');
            const modalSubtitle = document.querySelector('.modal-subtitle');
            const submitButton = document.querySelector('#appointment-form button[type="submit"]');
            
            if (modalTitle) modalTitle.textContent = 'Schedule New Appointment';
            if (modalSubtitle) modalSubtitle.textContent = 'Fill out the details below to create a new appointment';
            if (submitButton) submitButton.innerHTML = '<i class="fas fa-save"></i> Schedule Appointment';
        } else {
            console.log('📝 Opening modal for EDIT appointment (editing state already set)');
        }
        
        // Remove validation classes
        const inputs = this.elements.appointmentForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.classList.remove('error', 'valid');
        });
        
        // Show modal immediately
        this.elements.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus first input
        this.elements.clientName?.focus();
    }

    // Close appointment modal
    closeModal() {
        this.elements.modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // **CRITICAL: Reset editing state**
        this.editingAppointment = null;
        
        // Reset modal title and button text back to default
        const modalTitle = document.querySelector('.modal-title');
        const modalSubtitle = document.querySelector('.modal-subtitle');
        const submitButton = document.querySelector('#appointment-form button[type="submit"]');
        
        setTimeout(() => {
            if (modalTitle) modalTitle.textContent = 'Schedule New Appointment';
            if (modalSubtitle) modalSubtitle.textContent = 'Fill out the details below to create a new appointment';
            if (submitButton) submitButton.innerHTML = '<i class="fas fa-save"></i> Schedule Appointment';
        }, 50);
        
        // Reset form after animation
        setTimeout(() => {
            this.elements.appointmentForm?.reset();
        }, 300);
    }

    // Handle form submission
    async handleFormSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            this.showError('Please fill in all required fields correctly');
            return;
        }
        
        try {
            const appointmentData = this.gatherFormData();
            console.log('Form submission - editing mode:', !!this.editingAppointment);
            
            if (this.editingAppointment) {
                // Update existing appointment
                console.log('🔄 UPDATING EXISTING APPOINTMENT:', {
                    id: this.editingAppointment.id,
                    originalData: this.editingAppointment,
                    newData: appointmentData
                });
                
                const result = await this.updateAppointment(this.editingAppointment.id, appointmentData);
                
                console.log('💾 Update result:', result);
                
                if (result.success) {
                    this.closeModal();
                    
                    // **CRITICAL: Force refresh views after successful database update**
                    console.log('🔄 Database update successful, refreshing views...');
                    this.updateCalendarEvents();
                    this.renderAppointmentsList();
                    
                    // Ensure we're showing the list view to see changes
                    if (this.currentView === 'list') {
                        this.elements.listView.style.display = 'block';
                        this.elements.calendarView.style.display = 'none';
                    }
                    
                    // **NEW: Send email if template is selected**
                    if (appointmentData.emailTemplate && appointmentData.emailTemplate !== '') {
                        this.sendAppointmentEmailAfterSave(result.appointment, appointmentData.emailTemplate, 'update');
                    }
                    
                    this.showSuccess('✅ Appointment updated successfully in database!');
                    console.log('✅ Update completed successfully - database and views updated');
                } else {
                    console.error('❌ Database update failed:', result.message);
                    this.showError(result.message || 'Failed to update appointment in database');
                }
            } else {
                // Create new appointment
                console.log('Creating new appointment with data:', appointmentData);
                const result = await this.saveAppointment(appointmentData);
                
                if (result.success) {
                    this.closeModal();
                    
                    // **CRITICAL: Force refresh views after successful database save**
                    console.log('🔄 Database save successful, refreshing views...');
                    this.updateCalendarEvents();
                    this.renderAppointmentsList();
                    
                    // **NEW: Send email if template is selected**
                    if (appointmentData.emailTemplate && appointmentData.emailTemplate !== '') {
                        this.sendAppointmentEmailAfterSave(result.appointment, appointmentData.emailTemplate, 'create');
                    }
                    
                    this.showSuccess('✅ Appointment scheduled successfully in database!');
                    console.log('✅ Save completed successfully - database and views updated');
                } else {
                    console.error('❌ Database save failed:', result.message);
                    this.showError(result.message || 'Failed to save appointment to database');
                }
            }
        } catch (error) {
            console.error('Error saving appointment:', error);
            this.showError('An error occurred while saving the appointment');
        }
    }

    // Validate entire form
    validateForm() {
        const requiredFields = [
            this.elements.clientName,
            this.elements.clientEmail,
            this.elements.clientPhone,
            this.elements.appointmentDate,
            this.elements.appointmentHour,
            this.elements.appointmentMinute,
            this.elements.appointmentAmpm,
            this.elements.appointmentType
        ];
        
        let isValid = true;
        
        // Validate required fields
        requiredFields.forEach(field => {
            if (field && !this.validateField(field)) {
                isValid = false;
            }
        });
        
        // **NEW: Check for time conflicts**
        if (isValid) {
            const timeConflict = this.checkTimeConflict();
            if (timeConflict) {
                isValid = false;
            }
        }
        
        return isValid;
    }

    // **ENHANCED: Check for time conflicts with real-time validation**
    checkTimeConflict() {
        const appointmentDate = this.elements.appointmentDate?.value;
        const hour = this.elements.appointmentHour?.value;
        const minute = this.elements.appointmentMinute?.value;
        const ampm = this.elements.appointmentAmpm?.value;
        
        if (!appointmentDate || !hour || !minute || !ampm) {
            return false; // If any component is missing, skip conflict check
        }
        
        // Convert to 24-hour format
        let hour24 = parseInt(hour);
        if (ampm === 'PM' && hour24 !== 12) {
            hour24 += 12;
        } else if (ampm === 'AM' && hour24 === 12) {
            hour24 = 0;
        }
        const timeString = `${hour24.toString().padStart(2, '0')}:${minute}`;
        
        // Check if this time slot is already taken (excluding current appointment if editing)
        const existingAppointment = this.appointments.find(apt => {
            // Skip the current appointment if we're editing
            if (this.editingAppointment && apt.id === this.editingAppointment.id) {
                return false;
            }
            
            // Check for exact date and time match
            return apt.date === appointmentDate && apt.time === timeString;
        });
        
        if (existingAppointment) {
            // Enhanced error message with client details
            const conflictMessage = `⚠️ Time slot unavailable! 
                ${this.formatDate(appointmentDate)} at ${this.formatTime(timeString)} 
                is already booked by ${existingAppointment.clientName}.
                
                Please select a different time slot.`;
            
            this.showError(conflictMessage);
            
            // Highlight the time fields with enhanced visual feedback
            [this.elements.appointmentHour, this.elements.appointmentMinute, this.elements.appointmentAmpm].forEach(field => {
                if (field) {
                    field.style.borderColor = '#ef4444';
                    field.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
                    field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                    
                    // Add shake animation
                    field.style.animation = 'shake 0.5s ease-in-out';
                    
                    // Remove error styling after 4 seconds
                    setTimeout(() => {
                        field.style.borderColor = '';
                        field.style.backgroundColor = '';
                        field.style.boxShadow = '';
                        field.style.animation = '';
                    }, 4000);
                }
            });
            
            console.log('❌ Time conflict detected:', {
                requestedDate: appointmentDate,
                requestedTime: timeString,
                conflictingWith: existingAppointment.clientName,
                conflictingAppointmentId: existingAppointment.id
            });
            
            return true; // Conflict found
        }
        
        return false; // No conflict
    }

    // **NEW: Get all booked time slots for a specific date**
    getBookedTimeSlotsForDate(date) {
        if (!date) return [];
        
        return this.appointments
            .filter(apt => {
                // Skip the current appointment if we're editing
                if (this.editingAppointment && apt.id === this.editingAppointment.id) {
                    return false;
                }
                return apt.date === date;
            })
            .map(apt => apt.time)
            .sort();
    }

    // **NEW: Check if a specific time slot is available**
    isTimeSlotAvailable(date, time) {
        if (!date || !time) return true;
        
        const bookedTimes = this.getBookedTimeSlotsForDate(date);
        return !bookedTimes.includes(time);
    }

    // **NEW: Update time options based on availability**
    updateTimeOptionsAvailability() {
        const selectedDate = this.elements.appointmentDate?.value;
        if (!selectedDate) return;
        
        const bookedTimes = this.getBookedTimeSlotsForDate(selectedDate);
        console.log(`📅 Date: ${selectedDate}, Booked times:`, bookedTimes);
        
        if (bookedTimes.length > 0) {
            // Show availability info
            this.showAvailabilityInfo(selectedDate, bookedTimes);
        }
    }

    // **NEW: Show availability information**
    showAvailabilityInfo(date, bookedTimes) {
        const existingInfo = document.getElementById('time-availability-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        if (bookedTimes.length === 0) return;
        
        const timeContainer = this.elements.appointmentHour?.parentElement?.parentElement;
        if (!timeContainer) return;
        
        const infoDiv = document.createElement('div');
        infoDiv.id = 'time-availability-info';
        infoDiv.style.cssText = `
            margin-top: 8px;
            padding: 12px;
            background: rgba(255, 193, 7, 0.1);
            border: 1px solid rgba(255, 193, 7, 0.3);
            border-radius: 8px;
            font-size: 13px;
            color: #f59e0b;
        `;
        
        const formattedTimes = bookedTimes.map(time => this.formatTime(time)).join(', ');
        infoDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>Unavailable times for ${this.formatDate(date)}:</strong><br>
                    ${formattedTimes}
                </div>
            </div>
        `;
        
        timeContainer.appendChild(infoDiv);
    }

    // **NEW: Setup time conflict checking event listeners**
    setupTimeConflictListeners() {
        // Date change listener for time availability checking
        if (this.elements.appointmentDate) {
            this.elements.appointmentDate.addEventListener('change', () => {
                console.log('📅 Date changed, checking time availability...');
                this.updateTimeOptionsAvailability();
                
                // Clear any previous conflict styling
                this.clearTimeFieldErrors();
            });
        }
        
        // Time field change listeners for real-time conflict checking
        [this.elements.appointmentHour, this.elements.appointmentMinute, this.elements.appointmentAmpm].forEach(field => {
            if (field) {
                field.addEventListener('change', () => {
                    console.log('⏰ Time field changed, checking for conflicts...');
                    // Small delay to ensure all time fields are updated
                    setTimeout(() => {
                        const date = this.elements.appointmentDate?.value;
                        const hour = this.elements.appointmentHour?.value;
                        const minute = this.elements.appointmentMinute?.value;
                        const ampm = this.elements.appointmentAmpm?.value;
                        
                        // Clear any existing availability info when changing time
                        const existingInfo = document.getElementById('time-availability-info');
                        if (existingInfo && (hour && minute && ampm)) {
                            existingInfo.remove();
                        }
                        
                        // Check for immediate conflict feedback (non-blocking)
                        if (date && hour && minute && ampm) {
                            this.checkTimeConflictNonBlocking();
                        }
                    }, 100);
                });
            }
        });
    }

    // **NEW: Setup email template event listeners**
    setupEmailTemplateListeners() {
        // Email template selection change
        if (this.elements.appointmentEmailTemplate) {
            this.elements.appointmentEmailTemplate.addEventListener('change', (e) => {
                const selectedTemplate = e.target.value;
                if (selectedTemplate && selectedTemplate !== '') {
                    this.elements.emailPreviewGroup.style.display = 'block';
                    this.elements.emailPreviewGroup.classList.add('show');
                } else {
                    this.elements.emailPreviewGroup.style.display = 'none';
                    this.elements.emailPreviewGroup.classList.remove('show');
                }
            });
        }

        // Email preview button
        if (this.elements.previewEmailBtn) {
            this.elements.previewEmailBtn.addEventListener('click', () => {
                this.previewEmail();
            });
        }
    }

    // **NEW: Preview email functionality**
    previewEmail() {
        const selectedTemplate = this.elements.appointmentEmailTemplate?.value;
        if (!selectedTemplate || selectedTemplate === '') {
            this.showError('Please select an email template first');
            return;
        }

        // Get current form data for preview
        const formData = this.gatherFormData();
        
        // Validate required fields for email preview
        if (!formData.clientName || !formData.clientEmail || !formData.date || !formData.time) {
            this.showError('Please fill in all required fields (Name, Email, Date, Time) before previewing email');
            return;
        }

        // Create appointment data for template
        const appointmentData = {
            id: this.editingAppointment ? this.editingAppointment.id : 'preview',
            customerName: formData.clientName,
            clientEmail: formData.clientEmail,
            type: formData.type,
            title: formData.type,
            date: formData.date,
            time: this.formatTime(formData.time),
            description: formData.notes,
            confirmationLink: `https://www.monuevip.com/appointment/confirm/${this.editingAppointment ? this.editingAppointment.id : 'preview'}`
        };

        // Show email preview using the email-templates.js functionality
        if (typeof showEmailPreview === 'function') {
            showEmailPreview(appointmentData, selectedTemplate);
        } else {
            // Fallback: show basic preview modal
            this.showEmailPreviewModal(appointmentData, selectedTemplate);
        }
    }

    // **NEW: Fallback email preview modal**
    showEmailPreviewModal(appointmentData, templateType) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'email-preview-modal';
        modal.style.zIndex = '3000';

        const templateNames = {
            'confirmation': 'Appointment Confirmation',
            'reminder': 'Appointment Reminder',
            'rescheduled': 'Rescheduled Notification',
            'custom': 'Custom Template'
        };

        modal.innerHTML = `
            <div class="modal-container" style="max-width: 700px;">
                <div class="modal-header">
                    <div>
                        <h2 class="modal-title">Email Preview</h2>
                        <p class="modal-subtitle">${templateNames[templateType] || 'Email Template'}</p>
                    </div>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="email-preview-info">
                        <p><strong>To:</strong> ${appointmentData.clientEmail}</p>
                        <p><strong>Subject:</strong> ${this.getEmailSubject(templateType)}</p>
                        <p><strong>Template:</strong> ${templateNames[templateType]}</p>
                    </div>
                    <div class="email-preview-content">
                        <div class="form-actions">
                            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                                Cancel
                            </button>
                            <button class="btn btn-primary" onclick="window.appointmentManager.sendEmailFromPreview('${appointmentData.id}', '${templateType}')">
                                <i class="fas fa-paper-plane"></i>
                                Send Email
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('active');
        
        // Add click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // **NEW: Get email subject based on template type**
    getEmailSubject(templateType) {
        const subjects = {
            'confirmation': 'Appointment Confirmation - MonuMe Tracker',
            'reminder': 'Appointment Reminder - MonuMe Tracker',
            'rescheduled': 'Appointment Rescheduled - MonuMe Tracker',
            'custom': 'MonuMe Tracker - Custom Email'
        };
        return subjects[templateType] || 'MonuMe Tracker Email';
    }

    // **NEW: Send email from preview**
    async sendEmailFromPreview(appointmentId, templateType) {
        try {
            const result = await this.sendAppointmentEmail(appointmentId, templateType);
            if (result.success) {
                this.showSuccess('Email sent successfully!');
                // Close preview modal
                const modal = document.getElementById('email-preview-modal');
                if (modal) modal.remove();
            } else {
                this.showError('Failed to send email: ' + result.message);
            }
        } catch (error) {
            this.showError('Error sending email: ' + error.message);
        }
    }

    // **NEW: Send appointment email**
    async sendAppointmentEmail(appointmentId, templateType) {
        try {
            const appointment = this.appointments.find(apt => apt.id === appointmentId);
            if (!appointment) {
                throw new Error('Appointment not found');
            }

            const response = await fetch('/api/send-appointment-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    appointmentId: appointmentId,
                    templateType: templateType,
                    appointmentData: {
                        customerName: appointment.clientName,
                        clientEmail: appointment.clientEmail,
                        type: appointment.type,
                        title: appointment.type,
                        date: appointment.date,
                        time: appointment.time,
                        description: appointment.notes,
                        confirmationLink: `https://www.monuevip.com/appointment/confirm/${appointmentId}`
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();
                return { success: true, message: result.message };
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send email');
            }
        } catch (error) {
            console.error('Error sending appointment email:', error);
            return { success: false, message: error.message };
        }
    }

    // **NEW: Send email after successful appointment save/update**
    async sendAppointmentEmailAfterSave(appointment, templateType, action) {
        try {
            console.log(`📧 Sending ${templateType} email for ${action} action...`);
            
            const result = await this.sendAppointmentEmail(appointment.id, templateType);
            
            if (result.success) {
                console.log('✅ Email sent successfully');
                this.showNotificationPopup(`📧 ${this.getEmailSubject(templateType)} sent to ${appointment.clientEmail}`, 'success');
            } else {
                console.warn('⚠️ Email sending failed:', result.message);
                this.showNotificationPopup(`⚠️ Appointment saved but email failed: ${result.message}`, 'warning');
            }
        } catch (error) {
            console.error('❌ Error in email sending process:', error);
            this.showNotificationPopup(`⚠️ Appointment saved but email error: ${error.message}`, 'warning');
        }
    }

    // **NEW: Non-blocking time conflict checker (for real-time feedback)**
    checkTimeConflictNonBlocking() {
        const appointmentDate = this.elements.appointmentDate?.value;
        const hour = this.elements.appointmentHour?.value;
        const minute = this.elements.appointmentMinute?.value;
        const ampm = this.elements.appointmentAmpm?.value;
        
        if (!appointmentDate || !hour || !minute || !ampm) {
            return false;
        }
        
        // Convert to 24-hour format
        let hour24 = parseInt(hour);
        if (ampm === 'PM' && hour24 !== 12) {
            hour24 += 12;
        } else if (ampm === 'AM' && hour24 === 12) {
            hour24 = 0;
        }
        const timeString = `${hour24.toString().padStart(2, '0')}:${minute}`;
        
        // Check if this time slot is already taken
        const existingAppointment = this.appointments.find(apt => {
            if (this.editingAppointment && apt.id === this.editingAppointment.id) {
                return false;
            }
            return apt.date === appointmentDate && apt.time === timeString;
        });
        
        if (existingAppointment) {
            // Show subtle warning (non-intrusive)
            this.showTimeConflictWarning(existingAppointment, appointmentDate, timeString);
            return true;
        } else {
            // Clear any existing warnings
            this.clearTimeConflictWarning();
            this.clearTimeFieldErrors();
            return false;
        }
    }

    // **NEW: Show subtle time conflict warning**
    showTimeConflictWarning(existingAppointment, date, time) {
        // Clear any existing warnings first
        this.clearTimeConflictWarning();
        
        const timeContainer = this.elements.appointmentHour?.parentElement?.parentElement;
        if (!timeContainer) return;
        
        const warningDiv = document.createElement('div');
        warningDiv.id = 'time-conflict-warning';
        warningDiv.style.cssText = `
            margin-top: 8px;
            padding: 10px 12px;
            background: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 8px;
            font-size: 13px;
            color: #dc2626;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: slideDown 0.3s ease-out;
        `;
        
        warningDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>
            <div>
                <strong>Time slot unavailable!</strong><br>
                ${this.formatTime(time)} on ${this.formatDate(date)} is already booked by <strong>${existingAppointment.clientName}</strong>
            </div>
        `;
        
        timeContainer.appendChild(warningDiv);
        
        // Add subtle error styling to time fields
        [this.elements.appointmentHour, this.elements.appointmentMinute, this.elements.appointmentAmpm].forEach(field => {
            if (field) {
                field.style.borderColor = '#fca5a5';
                field.style.backgroundColor = 'rgba(239, 68, 68, 0.02)';
            }
        });
    }

    // **NEW: Clear time conflict warning**
    clearTimeConflictWarning() {
        const existingWarning = document.getElementById('time-conflict-warning');
        if (existingWarning) {
            existingWarning.remove();
        }
    }

    // **NEW: Clear time field error styling**
    clearTimeFieldErrors() {
        [this.elements.appointmentHour, this.elements.appointmentMinute, this.elements.appointmentAmpm].forEach(field => {
            if (field) {
                field.style.borderColor = '';
                field.style.backgroundColor = '';
                field.style.boxShadow = '';
                field.style.animation = '';
            }
        });
    }

    // Gather form data
    gatherFormData() {
        console.log('📝 Gathering form data...');
        
        // Check if all elements exist
        const elementCheck = {
            clientName: !!this.elements.clientName,
            clientEmail: !!this.elements.clientEmail,
            clientPhone: !!this.elements.clientPhone,
            appointmentDate: !!this.elements.appointmentDate,
            appointmentHour: !!this.elements.appointmentHour,
            appointmentMinute: !!this.elements.appointmentMinute,
            appointmentAmpm: !!this.elements.appointmentAmpm,
            appointmentType: !!this.elements.appointmentType,
            appointmentHost: !!this.elements.appointmentHost,
            appointmentNotes: !!this.elements.appointmentNotes
        };
        console.log('📋 Form elements check:', elementCheck);
        
        // Combine time components into 24-hour format
        const hour = this.elements.appointmentHour?.value || '';
        const minute = this.elements.appointmentMinute?.value || '';
        const ampm = this.elements.appointmentAmpm?.value || '';
        
        console.log('⏰ Time components:', { hour, minute, ampm });
        
        let timeString = '';
        if (hour && minute && ampm) {
            let hour24 = parseInt(hour);
            if (ampm === 'PM' && hour24 !== 12) {
                hour24 += 12;
            } else if (ampm === 'AM' && hour24 === 12) {
                hour24 = 0;
            }
            timeString = `${hour24.toString().padStart(2, '0')}:${minute}`;
        }
        
        console.log('⏰ Final time string:', timeString);

        const data = {
            clientName: this.elements.clientName?.value?.trim() || '',
            clientEmail: this.elements.clientEmail?.value?.trim() || '',
            clientPhone: this.elements.clientPhone?.value?.trim() || '',
            date: this.elements.appointmentDate?.value || '',
            time: timeString,
            type: this.elements.appointmentType?.value || '',
            hostId: this.elements.appointmentHost?.value || '',
            notes: this.elements.appointmentNotes?.value?.trim() || '',
            emailTemplate: this.elements.appointmentEmailTemplate?.value || ''
        };
        
        console.log('📦 Gathered form data:', data);
        console.log('🔍 Data validation:', {
            hasName: !!data.clientName,
            hasEmail: !!data.clientEmail,
            hasPhone: !!data.clientPhone,
            hasDate: !!data.date,
            hasTime: !!data.time,
            hasType: !!data.type
        });
        
        return data;
    }

    // Save appointment - ENHANCED to properly save to database
    async saveAppointment(data) {
        try {
            console.log('💾 Saving new appointment to database and localStorage...');
            
            // Generate unique ID
            const newAppointment = {
                id: `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                clientName: data.clientName,
                clientEmail: data.clientEmail,
                clientPhone: data.clientPhone || '',
                date: data.date,
                time: data.time,
                type: data.type,
                notes: data.notes || '',
                status: data.status || 'scheduled',
                url: `https://www.monuevip.com/appointment/${Date.now()}`,
                hostId: data.hostId || 'admin',
                createdAt: new Date().toISOString(),
                source: 'appointment-page'
            };
            
            console.log('💾 Saving appointment data:', newAppointment);
            
            // **ENHANCED: Save to database first, then localStorage**
            try {
                console.log('🌐 Attempting to save to database...');
                // Include optional location filter from URL for admins
                const urlParams = new URLSearchParams(window.location.search);
                const locationParam = urlParams.get('location');
                const postUrl = locationParam ? `/api/appointments?location=${encodeURIComponent(locationParam)}` : '/api/appointments';
                const response = await fetch(postUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: newAppointment.id,
                        name: newAppointment.clientName,
                        email: newAppointment.clientEmail,
                        phone: newAppointment.clientPhone,
                        date: newAppointment.date,
                        time: newAppointment.time,
                        service: newAppointment.type,
                        notes: newAppointment.notes,
                        status: newAppointment.status
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ DATABASE SAVE SUCCESSFUL:', result);

                    // Use server-assigned numeric ID when available
                    const serverAppointment = result.appointment || result.data || result;
                    if (serverAppointment && serverAppointment.id) {
                        newAppointment.id = serverAppointment.id;
                    }

                    // Add to appointments array
                    this.appointments.push(newAppointment);
                    
                    // Save to localStorage
                    this.saveAppointmentsToStorage();
                    
                    console.log('✅ COMPLETE SAVE SUCCESSFUL - appointment saved to both database and localStorage');
                    
                    return {
                        success: true,
                        appointment: newAppointment,
                        message: 'Appointment saved successfully to database!'
                    };
                } else {
                    throw new Error(`Database save failed: ${response.status} ${response.statusText}`);
                }
                
            } catch (dbError) {
                console.warn('⚠️ DATABASE SAVE FAILED, falling back to localStorage only:', dbError);
                
                // Fallback: Save to localStorage even if database fails
                this.appointments.push(newAppointment);
                this.saveAppointmentsToStorage();
                
                return {
                    success: true,
                    appointment: newAppointment,
                    message: 'Appointment saved locally (database unavailable)'
                };
            }
            
        } catch (error) {
            console.error('❌ SAVE FAILED - complete error:', error);
            
            return {
                success: false,
                message: `Failed to save appointment: ${error.message}. Please try again.`
            };
        }
    }

    // Update appointment - Database + localStorage
    async updateAppointment(appointmentId, data) {
        console.log('🔧 updateAppointment called with:', { appointmentId, data });
        
        try {
            console.log('💾 Updating appointment in database and localStorage...');
            
            const appointmentIndex = this.appointments.findIndex(apt => apt.id === appointmentId);
            if (appointmentIndex === -1) {
                throw new Error('Appointment not found');
            }
            
            // Prepare updated appointment data
            const updatedAppointment = {
                ...this.appointments[appointmentIndex],
                clientName: data.clientName,
                clientEmail: data.clientEmail,
                clientPhone: data.clientPhone || '',
                date: data.date,
                time: data.time,
                type: data.type,
                notes: data.notes || '',
                status: data.status || this.appointments[appointmentIndex].status || 'scheduled',
                updatedAt: new Date().toISOString(),
                source: 'appointment-page-edit'
            };
            
            console.log('💾 Updated appointment data:', updatedAppointment);
            
            // **ENHANCED: Update in database first, then localStorage**
            try {
                console.log('🌐 Attempting to update in database...');
                // Include optional location filter from URL for admins
                const urlParams = new URLSearchParams(window.location.search);
                const locationParam = urlParams.get('location');
                const putUrlBase = `/api/appointments/${appointmentId}`;
                const putUrl = locationParam ? `${putUrlBase}?location=${encodeURIComponent(locationParam)}` : putUrlBase;
                const response = await fetch(putUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: appointmentId,
                        name: updatedAppointment.clientName,
                        email: updatedAppointment.clientEmail,
                        phone: updatedAppointment.clientPhone,
                        date: updatedAppointment.date,
                        time: updatedAppointment.time,
                        service: updatedAppointment.type,
                        notes: updatedAppointment.notes,
                        status: updatedAppointment.status
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ DATABASE UPDATE SUCCESSFUL:', result);
                    
                    // Update the appointment in array
                    this.appointments[appointmentIndex] = updatedAppointment;
                    
                    // Save updated data to localStorage
                    this.saveAppointmentsToStorage();
                    
                    console.log('✅ COMPLETE UPDATE SUCCESSFUL - appointment updated in both database and localStorage');
                    
                    return {
                        success: true,
                        appointment: updatedAppointment,
                        message: 'Appointment updated successfully in database!'
                    };
                } else {
                    throw new Error(`Database update failed: ${response.status} ${response.statusText}`);
                }
                
            } catch (dbError) {
                console.warn('⚠️ DATABASE UPDATE FAILED, falling back to localStorage only:', dbError);
                
                // Fallback: Update localStorage even if database fails
                this.appointments[appointmentIndex] = updatedAppointment;
                this.saveAppointmentsToStorage();
                
                return {
                    success: true,
                    appointment: updatedAppointment,
                    message: 'Appointment updated locally (database unavailable)'
                };
            }
            
        } catch (error) {
            console.error('❌ UPDATE FAILED - complete error:', error);
            
            return {
                success: false,
                message: `Failed to update appointment: ${error.message}. Please try again.`
            };
        }
    }

    // Load appointments - **ENHANCED with database sync and dashboard sync**
    async loadAppointments() {
        try {
            console.log('🔄 Loading appointments from database and localStorage...');
            
            // **ENHANCED: Try to load from database first**
            try {
                console.log('🌐 Attempting to load from database...');
                // Include optional location filter from URL for admins
                const urlParams = new URLSearchParams(window.location.search);
                const locationParam = urlParams.get('location');
                const getUrl = locationParam ? `/api/appointments?location=${encodeURIComponent(locationParam)}` : '/api/appointments';
                const response = await fetch(getUrl);
                
                if (response.ok) {
                    const payload = await response.json();
                    // Support both array response and { success, appointments } shape
                    const dbAppointments = Array.isArray(payload) ? payload : (payload.appointments || []);
                    console.log('✅ DATABASE LOAD SUCCESSFUL:', dbAppointments.length, 'appointments');
                    
                    // Convert database format to our appointment format
                    this.appointments = dbAppointments.map(apt => ({
                        id: String(apt.id ?? apt.appointment_id ?? apt._id ?? `apt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
                        clientName: apt.name || apt.client_name || apt.clientName || 'Unknown',
                        clientEmail: apt.email || apt.client_email || apt.clientEmail || '',
                        clientPhone: apt.phone || apt.client_phone || apt.clientPhone || '',
                        date: apt.date || apt.appointment_date || '',
                        time: apt.time || apt.appointment_time || '09:00',
                        type: apt.service || apt.type || apt.appointment_type || 'MonuMe',
                        notes: apt.notes || apt.description || '',
                        status: apt.status || 'scheduled',
                        url: apt.url || `https://www.monuevip.com/appointment/${apt.id ?? apt.appointment_id ?? ''}`,
                        hostId: apt.host_id || apt.hostId || 'admin',
                        createdAt: apt.created_at || apt.createdAt || new Date().toISOString(),
                        source: 'database'
                    }));
                    
                    // Save to localStorage for sync with dashboard
                    this.saveAppointmentsToStorage();
                    
                    console.log('✅ Loaded and synced appointments from database');
                    
                } else {
                    throw new Error(`Database fetch failed: ${response.status}`);
                }
                
            } catch (dbError) {
                console.warn('⚠️ DATABASE LOAD FAILED, falling back to localStorage:', dbError);
                
                // **FALLBACK: Load from localStorage**
                const savedAppointments = localStorage.getItem('monumeAppointments');
                
                if (savedAppointments) {
                    const parsedAppointments = JSON.parse(savedAppointments);
                    this.appointments = parsedAppointments;
                    console.log('✅ Loaded appointments from localStorage:', this.appointments.length);
                    console.log('📋 Appointments data:', this.appointments);
                } else {
                    console.log('⚠️ No appointments in monumeAppointments, checking other sources...');
                    
                    // **MIGRATION: Check for appointments in other keys and migrate**
                    const migrationKeys = ['appointments', 'dashboardAppointments', 'weeklyAppointments'];
                    let foundAppointments = false;
                    
                    for (const key of migrationKeys) {
                        const oldData = localStorage.getItem(key);
                        if (oldData) {
                            const oldAppointments = JSON.parse(oldData);
                            if (oldAppointments.length > 0) {
                                console.log(`📦 Migrating ${oldAppointments.length} appointments from ${key}`);
                                this.appointments = oldAppointments;
                                this.saveAppointmentsToStorage(); // Save to correct key
                                foundAppointments = true;
                                break;
                            }
                        }
                    }
                    
                    if (!foundAppointments) {
                        // Start with empty appointments - no mock data
                        console.log('🔧 Starting with empty appointments (no database or localStorage data)');
                        this.appointments = [];
                        
                        // Save initial empty state to localStorage
                        this.saveAppointmentsToStorage();
                    }
                }
            }
            
            // **CRITICAL: Force refresh all views after loading**
            this.forceRefreshAllViews();
            
        } catch (error) {
            console.error('❌ Error loading appointments:', error);
            
            // Try localStorage as final fallback
            const savedAppointments = localStorage.getItem('monumeAppointments');
            if (savedAppointments) {
                this.appointments = JSON.parse(savedAppointments);
                console.log('🔄 Final fallback: Loaded from localStorage');
            } else {
                this.appointments = [];
                this.saveAppointmentsToStorage();
                console.log('🔄 Final fallback: Started with empty appointments');
            }
            
            this.forceRefreshAllViews();
        }
    }

    // Save appointments to localStorage
    saveAppointmentsToStorage() {
        try {
            localStorage.setItem('monumeAppointments', JSON.stringify(this.appointments));
            console.log('✅ Appointments saved to localStorage:', this.appointments.length);
            
            // **CRITICAL: Trigger storage event to notify dashboard and other tabs**
            this.notifyOtherTabsOfChanges();
        } catch (error) {
            console.error('Error saving appointments to localStorage:', error);
        }
    }

    // **CRITICAL: Notify other tabs/windows about appointment changes**
    notifyOtherTabsOfChanges() {
        // Dispatch custom storage event to ensure dashboard gets notified
        // even when both pages are from the same domain
        const storageEvent = new StorageEvent('storage', {
            key: 'monumeAppointments',
            newValue: JSON.stringify(this.appointments),
            url: window.location.href
        });
        
        window.dispatchEvent(storageEvent);
        console.log('📡 Notified other tabs of appointment changes');
        
        // Also set a temporary flag to trigger updates
        localStorage.setItem('appointmentUpdateTrigger', Date.now().toString());
        setTimeout(() => {
            localStorage.removeItem('appointmentUpdateTrigger');
        }, 1000);
    }

    // Reload appointments from localStorage (for real-time sync with dashboard)
    reloadAppointmentsFromStorage(skipRefresh = false) {
        try {
            const savedAppointments = localStorage.getItem('monumeAppointments');
            if (savedAppointments) {
                const parsedAppointments = JSON.parse(savedAppointments);
                // Only update if there are changes
                if (JSON.stringify(this.appointments) !== JSON.stringify(parsedAppointments)) {
                    console.log('🔄 Reloading appointments from localStorage - found changes');
                    this.appointments = parsedAppointments;
                    
                    // Update both views immediately (unless specifically skipped to avoid loops)
                    if (!skipRefresh) {
                        this.updateCalendarEvents();
                        this.renderAppointmentsList();
                    }
                    
                    console.log('✅ Views updated with latest appointments:', this.appointments.length);
                    return true; // Return true if changes were found
                }
            }
            return false; // Return false if no changes
        } catch (error) {
            console.error('Error reloading appointments from localStorage:', error);
            return false;
        }
    }

    // Clear all appointments from localStorage (for development/testing)
    clearAllAppointments() {
        if (confirm('Are you sure you want to clear all appointments? This cannot be undone.')) {
            localStorage.removeItem('monumeAppointments');
            this.appointments = [];
            this.forceRefreshAllViews();
            this.showSuccess('All appointments cleared');
            console.log('All appointments cleared from localStorage');
        }
    }

    // Generate mock appointments for demo - DISABLED FOR FRESH START
    generateMockAppointments() {
        // Return empty array - no demo appointments
        console.log('📋 Demo appointments disabled - starting with clean slate');
        return [];
    }

    // Update calendar events
    updateCalendarEvents() {
        if (!this.calendar) {
            console.log('Calendar not initialized yet');
            return;
        }
        
        console.log('📅 Calendar View Sync Check:');
        console.log('  - Total appointments for calendar:', this.appointments.length);
        this.calendar.removeAllEvents();
        
        const events = this.appointments.map(apt => {
            // Fix timezone issue by creating proper local date/time
            const [year, month, day] = apt.date.split('-').map(num => parseInt(num, 10));
            const [hours, minutes] = apt.time.split(':').map(num => parseInt(num, 10));
            
            // Create proper local date/time objects
            const startTime = new Date(year, month - 1, day, hours, minutes);
            const endTime = new Date(startTime.getTime() + (apt.duration || 60) * 60000); // Default 60 minutes
            
            return {
                id: apt.id,
                title: `${apt.type} - ${apt.clientName}`, // Fallback title
                start: startTime.toISOString(),
                end: endTime.toISOString(),
                extendedProps: {
                    clientName: apt.clientName,
                    clientEmail: apt.clientEmail,
                    clientPhone: apt.clientPhone || '',
                    type: apt.type,
                    status: apt.status || 'scheduled',
                    notes: apt.notes || '',
                    url: apt.url,
                    hostId: apt.hostId || '',
                    duration: apt.duration || 60
                },
                // Remove default colors to let our custom styling take over
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                textColor: 'inherit',
                classNames: ['appointment-event']
            };
        });
        
        console.log('Adding events to calendar:', events);
        this.calendar.addEventSource(events);
    }

    // Get event color based on type
    getEventColor(type) {
        const colors = {
            'monume': '#ff9562',
            'fameme': '#10b981',
            'crystalme': '#3b82f6',
            'default': '#6b7280'
        };
        
        return colors[type?.toLowerCase()] || colors.default;
    }

    // Render appointments list
    renderAppointmentsList() {
        if (!this.elements.appointmentsGrid) return;
        
        this.elements.appointmentsGrid.innerHTML = '';
        
        // Ensure appointments array exists
        if (!this.appointments || !Array.isArray(this.appointments)) {
            console.warn('Appointments array not initialized, using empty array');
            this.appointments = [];
        }

        // **CRITICAL: Apply filters - but by default shows ALL appointments (like calendar)**
        const filteredAppointments = this.filterAppointments(this.appointments);
        const filtersActive = this.hasActiveFilters();
        
        console.log('📋 List View Check:');
        console.log('  - Total appointments:', this.appointments.length);
        console.log('  - Other filters active:', filtersActive);
        console.log('  - Show past appointments:', this.filters.showPast);
        console.log('  - Show past only filter:', this.isShowPastOnlyFilter());
        console.log('  - After filtering:', filteredAppointments.length);
        
        const sortedAppointments = [...filteredAppointments].sort((a, b) => {
            // Fix timezone issue in sorting by parsing date components manually
            const [yearA, monthA, dayA] = a.date.split('-').map(num => parseInt(num, 10));
            const [hoursA, minutesA] = a.time.split(':').map(num => parseInt(num, 10));
            const dateTimeA = new Date(yearA, monthA - 1, dayA, hoursA, minutesA);
            
            const [yearB, monthB, dayB] = b.date.split('-').map(num => parseInt(num, 10));
            const [hoursB, minutesB] = b.time.split(':').map(num => parseInt(num, 10));
            const dateTimeB = new Date(yearB, monthB - 1, dayB, hoursB, minutesB);
            
            return dateTimeA - dateTimeB;
        });
        
        if (sortedAppointments.length === 0) {
            const hasActiveFilters = this.getActiveFilterCount() > 0;
            this.elements.appointmentsGrid.innerHTML = `
                <div class="no-appointments">
                    <i class="fas fa-${hasActiveFilters ? 'filter' : 'calendar-plus'}"></i>
                    <h3>${hasActiveFilters ? 'No appointments match your filters' : 'No appointments scheduled'}</h3>
                    <p>${hasActiveFilters ? 'Try adjusting your filter criteria to see more results.' : 'Create your first appointment to get started.'}</p>
                    ${hasActiveFilters ? 
                        `<button class="btn btn-secondary" onclick="window.appointmentManager.clearFilters()">
                            <i class="fas fa-times"></i>
                            Clear Filters
                        </button>` :
                        `<button class="btn btn-primary" onclick="window.appointmentManager.openModal()">
                            <i class="fas fa-plus"></i>
                            Schedule Appointment
                        </button>`
                    }
                </div>
            `;
            return;
        }
        
        // Create a simple list container
        const listContainer = document.createElement('div');
        listContainer.className = 'appointments-list';
        
        sortedAppointments.forEach((appointment, index) => {
            const listItem = this.createSimpleListItem(appointment, index);
            listContainer.appendChild(listItem);
        });
        
        this.elements.appointmentsGrid.appendChild(listContainer);
        
        // Add entrance animation
        this.addListAnimation();
    }

    // Create simple list item for list view
    createSimpleListItem(appointment, index) {
        const listItem = document.createElement('div');
        listItem.className = 'appointment-card-list';
        
        // Get client initials for avatar
        const initials = appointment.clientName
            .split(' ')
            .map(name => name[0])
            .join('')
            .toUpperCase();
        
        listItem.innerHTML = `
            <div class="appointment-info" onclick="window.appointmentManager.editAppointment('${appointment.id}')" style="cursor: pointer;" title="Click to edit appointment">
                <div class="appointment-avatar">
                    ${initials}
                </div>
                <div class="appointment-details-list">
                    <div class="appointment-client-name">${appointment.clientName}</div>
                    <div class="appointment-meta-list">
                        <div class="appointment-meta-item">
                            <i class="fas fa-calendar" style="color: var(--primary-color);"></i>
                            ${this.formatDate(appointment.date)}
                        </div>
                        <div class="appointment-meta-item">
                            <i class="fas fa-clock" style="color: var(--primary-color);"></i>
                            ${this.formatTime(appointment.time)}
                        </div>
                        <div class="appointment-meta-item">
                            <span class="appointment-type-badge type-${appointment.type.toLowerCase()}">
                                ${appointment.type}
                            </span>
                        </div>
                        <div class="appointment-meta-item">
                            <span class="status-badge status-${appointment.status}">
                                <i class="fas fa-circle"></i>
                                ${this.capitalizeFirst(appointment.status)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="appointment-actions-list">
                <button class="action-btn action-edit" onclick="window.appointmentManager.editAppointment('${appointment.id}')" title="Edit Appointment">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn action-copy" onclick="window.appointmentManager.copyAppointmentUrl('${appointment.url}')" title="Copy Link">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="action-btn action-email" onclick="window.appointmentManager.sendEmail('${appointment.id}')" title="Send Email">
                    <i class="fas fa-envelope"></i>
                </button>
                <button class="action-btn action-delete" onclick="window.appointmentManager.deleteAppointment('${appointment.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return listItem;
    }

    // Create appointment card
    createAppointmentCard(appointment) {
        const card = document.createElement('div');
        card.className = 'appointment-card';
        card.innerHTML = `
            <div class="appointment-header">
                <div class="appointment-title">
                    <span class="appointment-type-badge type-${appointment.type.toLowerCase()}">
                        <i class="fas fa-circle"></i>
                        ${appointment.type}
                    </span>
                    ${appointment.clientName}
                </div>
                <div class="appointment-meta">
                    <i class="fas fa-calendar"></i>
                    ${this.formatDate(appointment.date)}
                    <i class="fas fa-clock"></i>
                    ${this.formatTime(appointment.time)}
                </div>
            </div>
            
            <div class="appointment-details">
                <div class="detail-item">
                    <span class="detail-label">Client Email</span>
                    <span class="detail-value">${appointment.clientEmail}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Client Phone</span>
                    <span class="detail-value">${appointment.clientPhone || 'Not provided'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">
                        <span class="status-badge status-${appointment.status}">
                            <i class="fas fa-circle"></i>
                            ${this.capitalizeFirst(appointment.status)}
                        </span>
                    </span>
                </div>
                ${appointment.notes ? `
                <div class="detail-item">
                    <span class="detail-label">Notes</span>
                    <span class="detail-value">${appointment.notes}</span>
                </div>
                ` : ''}
                <div class="detail-item">
                    <span class="detail-label">Appointment URL</span>
                    <div class="appointment-url">${appointment.url}</div>
                </div>
            </div>
            
            <div class="appointment-actions">
                <button class="action-btn action-details" onclick="window.appointmentManager.showAppointmentDetails('${appointment.id}')">
                    <i class="fas fa-info-circle"></i>
                    Details
                </button>
                <button class="action-btn action-edit" onclick="window.appointmentManager.editAppointment('${appointment.id}')">
                    <i class="fas fa-edit"></i>
                    Edit
                </button>
                <button class="action-btn action-copy" onclick="window.appointmentManager.copyAppointmentUrl('${appointment.url}')">
                    <i class="fas fa-copy"></i>
                    Copy Link
                </button>
                <button class="action-btn action-email" onclick="window.appointmentManager.sendEmailWithProtection('${appointment.id}')">
                    <i class="fas fa-envelope"></i>
                    Send Email
                </button>
                <button class="action-btn action-delete" onclick="window.appointmentManager.deleteAppointment('${appointment.id}')">
                    <i class="fas fa-trash"></i>
                    Delete
                </button>
            </div>
        `;
        
        return card;
    }

    // Format date for display
    formatDate(dateString) {
        // Fix timezone issue by parsing date components manually
        const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
        // Create date object with local timezone (month is 0-indexed)
        const date = new Date(year, month - 1, day);
        
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    // Format time for display
    formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const time = new Date();
        time.setHours(parseInt(hours), parseInt(minutes));
        return time.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }

    // Capitalize first letter
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Add list animation
    addListAnimation() {
        const listItems = this.elements.appointmentsGrid.querySelectorAll('.appointment-card-list');
        listItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.4s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, index * 50);
        });
    }

    // Add stagger animation to cards (for detail view)
    addStaggerAnimation() {
        const cards = this.elements.appointmentsGrid.querySelectorAll('.appointment-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Load hosts/users
    async loadHosts() {
        try {
            console.log('🔄 Loading hosts from API...');
            // Request only allowed hosts; admins can filter by ?location=
            const params = new URLSearchParams(window.location.search);
            const loc = params.get('location');
            const usersUrl = loc ? `/api/users?location=${encodeURIComponent(loc)}&all=false` : '/api/users?all=false';
            const response = await fetch(usersUrl);
            let hosts = [];
            
            if (response.ok) {
                const data = await response.json();
                console.log('📡 API response:', data);
                
                // Handle different response formats
                if (Array.isArray(data)) {
                    hosts = data;
                } else if (data.users && Array.isArray(data.users)) {
                    hosts = data.users;
                } else {
                    console.warn('Unexpected API response format, using fallback hosts');
                    throw new Error('Invalid response format');
                }
            } else {
                throw new Error(`API response not ok: ${response.status}`);
            }
            
            console.log('✅ Hosts loaded successfully:', hosts);
            // If logged-in user is a location account, ensure only same-location
            try {
                if (window.currentUser && window.currentUser.role === 'location') {
                    const locId = window.currentUser.location_id;
                    hosts = hosts.filter(h => String(h.location_id) === String(locId));
                }
            } catch {}
            this.populateHostSelect(hosts);
        } catch (error) {
            console.error('❌ Error loading hosts, using fallback:', error);
            
            // Fallback hosts - matching authentication system
            const fallbackHosts = [
                { id: 'admin', name: 'Admin User', username: 'admin' },
                { id: 'manager', name: 'Manager User', username: 'manager' },
                { id: 'staff1', name: 'Staff Member 1', username: 'staff1' },
                { id: 'staff2', name: 'Staff Member 2', username: 'staff2' }
            ];
            
            this.populateHostSelect(fallbackHosts);
        }
    }

    // Populate host select dropdown
    populateHostSelect(hosts) {
        if (!this.elements.appointmentHost) {
            console.error('❌ appointmentHost element not found');
            return;
        }
        
        if (!Array.isArray(hosts)) {
            console.error('❌ hosts is not an array:', hosts);
            return;
        }
        
        console.log('📋 Populating host dropdown with', hosts.length, 'hosts');
        
        this.elements.appointmentHost.innerHTML = '<option value="">Select host</option>';
        
        hosts.forEach(host => {
            const option = document.createElement('option');
            option.value = host.id || host.username;
            option.textContent = host.name || host.username || host.email;
            this.elements.appointmentHost.appendChild(option);
        });
        
        console.log('✅ Host dropdown populated successfully');
    }

    // Copy appointment URL to clipboard
    async copyAppointmentUrl(url) {
        try {
            await navigator.clipboard.writeText(url);
            this.showCopyNotification();
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showCopyNotification();
        }
    }

    // Show copy notification popup
    showCopyNotification() {
        // Remove existing notification if any
        const existingNotification = document.getElementById('copy-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification popup
        const notification = document.createElement('div');
        notification.id = 'copy-notification';
        notification.innerHTML = `
            <div class="copy-notification-content">
                <i class="fas fa-check-circle"></i>
                <span>URL copied to clipboard!</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, var(--success-color), #059669);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
            z-index: 9999;
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
            transition: all 0.3s ease;
            font-weight: 500;
            font-size: 0.9rem;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        
        notification.querySelector('.copy-notification-content').style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.75rem;
        `;
        
        notification.querySelector('i').style.cssText = `
            font-size: 1.1rem;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0) scale(1)';
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px) scale(0.9)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 2000);
    }

    // Edit appointment with authentication
    async editAppointment(appointmentId) {
        const appointment = this.appointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            this.showError('Appointment not found');
            return;
        }
        
        // Show authentication modal for editing
        await this.showEditAuthModal(appointment);
    }

    // Delete appointment with authentication
    async deleteAppointment(appointmentId) {
        const appointment = this.appointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            this.showError('Appointment not found');
            return;
        }
        
        // Show authentication modal
        await this.showDeleteAuthModal(appointment);
    }

    // Show delete authentication modal
    async showDeleteAuthModal(appointment) {
        // Create modal HTML
        const modalHTML = `
            <div class="delete-auth-modal" id="delete-auth-modal">
                <div class="delete-auth-container">
                    <div class="delete-auth-header">
                        <h3>Delete Appointment</h3>
                        <button class="delete-auth-close" id="delete-auth-close">&times;</button>
                    </div>
                    <div class="delete-auth-body">
                        <div class="appointment-info-display">
                            <h4>Appointment Details:</h4>
                            <p><strong>Client:</strong> ${appointment.clientName}</p>
                            <p><strong>Email:</strong> ${appointment.clientEmail}</p>
                            <p><strong>Phone:</strong> ${appointment.clientPhone || 'Not provided'}</p>
                            <p><strong>Type:</strong> ${appointment.type}</p>
                            <p><strong>Date:</strong> ${this.formatDate(appointment.date)}</p>
                            <p><strong>Time:</strong> ${this.formatTime(appointment.time)}</p>
                            <p><strong>Host:</strong> ${appointment.hostId || 'Not assigned'}</p>
                        </div>
                        <div class="auth-form">
                            <div class="form-group">
                                <label for="delete-username">Username:</label>
                                <input type="text" id="delete-username" class="auth-input" placeholder="Enter your username" required>
                            </div>
                            <div class="form-group">
                                <label for="delete-password">Password:</label>
                                <input type="password" id="delete-password" class="auth-input" placeholder="Enter your password" required>
                            </div>
                            <div class="auth-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>Only the appointment host, managers, or admins can delete this appointment.</span>
                            </div>
                        </div>
                        <div class="delete-auth-actions">
                            <button class="btn btn-secondary" id="delete-cancel">Cancel</button>
                            <button class="btn btn-danger" id="delete-confirm">
                                <i class="fas fa-trash"></i>
                                Delete Appointment
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('delete-auth-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Wait a bit for DOM to update
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Get modal elements
        const modal = document.getElementById('delete-auth-modal');
        const closeBtn = document.getElementById('delete-auth-close');
        const cancelBtn = document.getElementById('delete-cancel');
        const confirmBtn = document.getElementById('delete-confirm');
        const usernameInput = document.getElementById('delete-username');
        const passwordInput = document.getElementById('delete-password');

        // Debug logging
        console.log('Modal elements found:', {
            modal: !!modal,
            closeBtn: !!closeBtn,
            cancelBtn: !!cancelBtn,
            confirmBtn: !!confirmBtn,
            usernameInput: !!usernameInput,
            passwordInput: !!passwordInput
        });

        if (!modal || !confirmBtn) {
            console.error('Modal elements not found');
            return;
        }

        // Show modal
        setTimeout(() => modal.classList.add('active'), 10);

        // Event listeners
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        confirmBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !password) {
                this.showError('Please enter both username and password');
                return;
            }

            // Disable button to prevent double clicks
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

            try {
                // Authenticate and check permissions
                const canDelete = await this.authenticateAndCheckDeletePermission(username, password, appointment);
                
                if (canDelete.success) {
                    confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Deleting...';
                    closeModal();
                    await this.performDeleteAppointment(appointment.id);
                } else {
                    this.showAuthErrorModal(canDelete.message);
                    // Reset button
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Appointment';
                }
            } catch (error) {
                console.error('Delete error:', error);
                this.showAuthErrorModal('An error occurred during authentication');
                // Reset button
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Appointment';
            }
        });

        // Enter key to confirm
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        });

        // Focus on username input
        usernameInput.focus();

        // Additional fallback event listener using onclick
        confirmBtn.onclick = async (e) => {
            console.log('Delete button clicked via onclick');
            e.preventDefault();
            e.stopPropagation();
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !password) {
                this.showError('Please enter both username and password');
                return;
            }

            // Disable button to prevent double clicks
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

            try {
                // Authenticate and check permissions
                const canDelete = await this.authenticateAndCheckDeletePermission(username, password, appointment);
                
                if (canDelete.success) {
                    confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Deleting...';
                    closeModal();
                    await this.performDeleteAppointment(appointment.id);
                } else {
                    this.showAuthErrorModal(canDelete.message);
                    // Reset button
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Appointment';
                }
            } catch (error) {
                console.error('Delete error:', error);
                this.showAuthErrorModal('An error occurred during authentication');
                // Reset button
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Delete Appointment';
            }
        };
    }

    // Authenticate user and check delete permissions
    async authenticateAndCheckDeletePermission(username, password, appointment) {
        console.log('Authenticating user:', username, 'for appointment:', appointment.id);
        try {
            // Mock users database (in real app, this would be a secure API call)
            const users = [
                { username: 'admin', password: 'admin123', role: 'admin', name: 'Admin User' },
                { username: 'manager', password: 'manager123', role: 'manager', name: 'Manager User' },
                { username: 'staff1', password: 'staff123', role: 'employee', name: 'Staff Member 1' },
                { username: 'staff2', password: 'staff123', role: 'employee', name: 'Staff Member 2' }
            ];

            // Find user
            const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
            
            if (!user) {
                return { success: false, message: 'Invalid username or password' };
            }

            // Check password
            if (user.password !== password) {
                return { success: false, message: 'Invalid username or password' };
            }

            // Check permissions
            const canDelete = this.checkDeletePermission(user, appointment);
            
            if (!canDelete.allowed) {
                return { success: false, message: canDelete.reason };
            }

            return { success: true, user: user };

        } catch (error) {
            console.error('Authentication error:', error);
            return { success: false, message: 'Authentication failed. Please try again.' };
        }
    }

    // Check if user has permission to delete appointment
    checkDeletePermission(user, appointment) {
        // Admins can delete any appointment
        if (user.role === 'admin') {
            return { allowed: true, reason: 'Admin access' };
        }

        // Managers can delete any appointment
        if (user.role === 'manager') {
            return { allowed: true, reason: 'Manager access' };
        }

        // Regular users can only delete their own appointments
        if (user.role === 'employee') {
            if (appointment.hostId === user.username || appointment.hostId === user.name) {
                return { allowed: true, reason: 'Own appointment' };
            } else {
                return { 
                    allowed: false, 
                    reason: 'You can only delete your own appointments. This appointment belongs to another user.' 
                };
            }
        }

        return { allowed: false, reason: 'Insufficient permissions' };
    }

    // Show edit authentication modal
    async showEditAuthModal(appointment) {
        // Create modal HTML
        const modalHTML = `
            <div class="edit-auth-modal" id="edit-auth-modal">
                <style>
                /* Edit auth modal readability */
                #edit-auth-modal { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); z-index: 10000; opacity: 0; transition: opacity .2s ease; }
                #edit-auth-modal.active { opacity: 1; }
                #edit-auth-modal .edit-auth-container { background: #ffffff; color: #111827; width: 92%; max-width: 680px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,.25); overflow: hidden; }
                #edit-auth-modal .edit-auth-header { display:flex; justify-content: space-between; align-items:center; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; background: #fffdfb; }
                #edit-auth-modal .edit-auth-header h3 { margin:0; color:#111827; font-weight:800; }
                #edit-auth-modal .edit-auth-close { background:none; border:none; font-size:22px; color:#6b7280; cursor:pointer; padding:6px 8px; border-radius:8px; }
                #edit-auth-modal .edit-auth-close:hover { background:#f3f4f6; color:#111827; }
                #edit-auth-modal .edit-auth-body { padding: 18px 20px; }
                #edit-auth-modal .appointment-info-display { background:#f8fafc; border:1px solid #e5e7eb; padding:14px 16px; border-radius:12px; }
                #edit-auth-modal .appointment-info-display h4 { margin:0 0 8px; color:#1f2937; font-weight:700; }
                #edit-auth-modal .appointment-info-display p { margin:4px 0; color:#374151; }
                #edit-auth-modal .auth-form .form-group { margin-bottom: 12px; }
                #edit-auth-modal label { display:block; margin-bottom:6px; color:#374151; font-weight:600; }
                #edit-auth-modal .auth-input { width:100%; padding:10px 12px; border:1px solid rgba(0,0,0,0.12); border-radius:10px; color:#111827; background:#ffffff; }
                #edit-auth-modal .auth-input:focus { outline:none; border-color:#ff9562; box-shadow: 0 0 0 3px rgba(255,149,98,0.18); }
                #edit-auth-modal .auth-warning { display:flex; gap:8px; align-items:center; padding:10px 12px; margin-top:4px; background:#fff7ed; border:1px solid #ffedd5; color:#9a3412; border-radius:10px; }
                #edit-auth-modal .edit-auth-actions { display:flex; gap:10px; justify-content:flex-end; padding: 12px 20px 20px; }
                </style>
                <div class="edit-auth-container">
                    <div class="edit-auth-header">
                        <h3>Edit Appointment</h3>
                        <button class="edit-auth-close" id="edit-auth-close">&times;</button>
                    </div>
                    <div class="edit-auth-body">
                        <div class="appointment-info-display">
                            <h4>Appointment Details:</h4>
                            <p><strong>Client:</strong> ${appointment.clientName}</p>
                            <p><strong>Email:</strong> ${appointment.clientEmail}</p>
                            <p><strong>Phone:</strong> ${appointment.clientPhone || 'Not provided'}</p>
                            <p><strong>Type:</strong> ${appointment.type}</p>
                            <p><strong>Date:</strong> ${this.formatDate(appointment.date)}</p>
                            <p><strong>Time:</strong> ${this.formatTime(appointment.time)}</p>
                            <p><strong>Host:</strong> ${appointment.hostId || 'Not assigned'}</p>
                        </div>
                        <div class="auth-form">
                            <div class="form-group">
                                <label for="edit-username">Username:</label>
                                <input type="text" id="edit-username" class="auth-input" placeholder="Enter your username" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-password">Password:</label>
                                <input type="password" id="edit-password" class="auth-input" placeholder="Enter your password" required>
                            </div>
                            <div class="auth-warning">
                                <i class="fas fa-info-circle"></i>
                                <span>Only the appointment host, managers, or admins can edit this appointment.</span>
                            </div>
                        </div>
                        <div class="edit-auth-actions">
                            <button class="btn btn-secondary" id="edit-cancel">Cancel</button>
                            <button class="btn btn-primary" id="edit-confirm">
                                <i class="fas fa-edit"></i>
                                Proceed to Edit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('edit-auth-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Wait a bit for DOM to update
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Get modal elements
        const modal = document.getElementById('edit-auth-modal');
        const closeBtn = document.getElementById('edit-auth-close');
        const cancelBtn = document.getElementById('edit-cancel');
        const confirmBtn = document.getElementById('edit-confirm');
        const usernameInput = document.getElementById('edit-username');
        const passwordInput = document.getElementById('edit-password');

        if (!modal || !confirmBtn) {
            console.error('Edit modal elements not found');
            return;
        }

        // Show modal
        setTimeout(() => modal.classList.add('active'), 10);

        // Event listeners
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        
        confirmBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !password) {
                this.showAuthErrorModal('Please enter both username and password');
                return;
            }

            // Disable button to prevent double clicks
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

            try {
                // Authenticate and check permissions
                const canEdit = await this.authenticateAndCheckEditPermission(username, password, appointment);
                
                if (canEdit.success) {
                    confirmBtn.innerHTML = '<i class="fas fa-edit"></i> Opening Editor...';
                    closeModal();
                    // Proceed to actual edit
                    this.proceedToEdit(appointment);
                } else {
                    this.showAuthErrorModal(canEdit.message);
                    // Reset button
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fas fa-edit"></i> Proceed to Edit';
                }
            } catch (error) {
                console.error('Edit authentication error:', error);
                this.showAuthErrorModal('An error occurred during authentication');
                // Reset button
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fas fa-edit"></i> Proceed to Edit';
            }
        });

        // Enter key to confirm
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
        });

        // Focus on username input
        usernameInput.focus();
    }

    // Authenticate user and check edit permissions
    async authenticateAndCheckEditPermission(username, password, appointment) {
        console.log('Authenticating user for edit:', username, 'for appointment:', appointment.id);
        try {
            // Mock users database (same as delete)
            const users = [
                { username: 'admin', password: 'admin123', role: 'admin', name: 'Admin User' },
                { username: 'manager', password: 'manager123', role: 'manager', name: 'Manager User' },
                { username: 'staff1', password: 'staff123', role: 'employee', name: 'Staff Member 1' },
                { username: 'staff2', password: 'staff123', role: 'employee', name: 'Staff Member 2' }
            ];

            // Find user
            const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
            
            if (!user) {
                return { success: false, message: 'Invalid username or password' };
            }

            // Check password
            if (user.password !== password) {
                return { success: false, message: 'Invalid username or password' };
            }

            // Check permissions (same logic as delete)
            const canEdit = this.checkEditPermission(user, appointment);
            
            if (!canEdit.allowed) {
                return { success: false, message: canEdit.reason };
            }

            return { success: true, user: user };

        } catch (error) {
            console.error('Edit authentication error:', error);
            return { success: false, message: 'Authentication failed. Please try again.' };
        }
    }

    // Check if user has permission to edit appointment
    checkEditPermission(user, appointment) {
        // Admins can edit any appointment
        if (user.role === 'admin') {
            return { allowed: true, reason: 'Admin access' };
        }

        // Managers can edit any appointment
        if (user.role === 'manager') {
            return { allowed: true, reason: 'Manager access' };
        }

        // Regular users can only edit their own appointments
        if (user.role === 'employee') {
            if (appointment.hostId === user.username || appointment.hostId === user.name) {
                return { allowed: true, reason: 'Own appointment' };
            } else {
                return { 
                    allowed: false, 
                    reason: 'You can only edit your own appointments. This appointment belongs to another user.' 
                };
            }
        }

        return { allowed: false, reason: 'Insufficient permissions' };
    }

    // Proceed to actual edit after authentication
    proceedToEdit(appointment) {
        // Set editing mode
        this.editingAppointment = appointment;
        console.log('🔧 Entering edit mode for appointment:', appointment.id, appointment);
        
        // Parse the time from 24-hour format to separate components
        let hour = '', minute = '', ampm = '';
        if (appointment.time) {
            const [timeHour, timeMinute] = appointment.time.split(':');
            const hour24 = parseInt(timeHour);
            minute = timeMinute;
            
            if (hour24 === 0) {
                hour = '12';
                ampm = 'AM';
            } else if (hour24 === 12) {
                hour = '12';
                ampm = 'PM';
            } else if (hour24 > 12) {
                hour = (hour24 - 12).toString();
                ampm = 'PM';
            } else {
                hour = hour24.toString();
                ampm = 'AM';
            }
        }
        
        // Populate form with appointment data
        console.log('📝 Populating form with appointment data:', {
            clientName: appointment.clientName,
            clientEmail: appointment.clientEmail,
            clientPhone: appointment.clientPhone,
            date: appointment.date,
            time: appointment.time,
            type: appointment.type,
            hostId: appointment.hostId,
            notes: appointment.notes
        });
        
        this.elements.clientName.value = appointment.clientName;
        this.elements.clientEmail.value = appointment.clientEmail;
        this.elements.clientPhone.value = appointment.clientPhone || '';
        this.elements.appointmentDate.value = appointment.date;
        this.elements.appointmentHour.value = hour;
        this.elements.appointmentMinute.value = minute;
        this.elements.appointmentAmpm.value = ampm;
        this.elements.appointmentType.value = appointment.type;
        this.elements.appointmentHost.value = appointment.hostId || '';
        this.elements.appointmentNotes.value = appointment.notes || '';
        
        console.log('✅ Form populated. Current form values:', {
            clientName: this.elements.clientName.value,
            clientEmail: this.elements.clientEmail.value,
            clientPhone: this.elements.clientPhone.value,
            date: this.elements.appointmentDate.value,
            hour: this.elements.appointmentHour.value,
            minute: this.elements.appointmentMinute.value,
            ampm: this.elements.appointmentAmpm.value,
            type: this.elements.appointmentType.value,
            hostId: this.elements.appointmentHost.value,
            notes: this.elements.appointmentNotes.value
        });
        
        // Update modal title and button text for editing
        const modalTitle = document.querySelector('.modal-title');
        const modalSubtitle = document.querySelector('.modal-subtitle');
        const submitButton = document.querySelector('#appointment-form button[type="submit"]');
        
        if (modalTitle) modalTitle.textContent = 'Edit Appointment';
        if (modalSubtitle) modalSubtitle.textContent = `Update appointment details for ${appointment.clientName}`;
        if (submitButton) submitButton.innerHTML = '<i class="fas fa-save"></i> Update Appointment';
        
        // Open modal for editing
        this.openModal(false);
    }

    // Show authentication error modal
    showAuthErrorModal(message) {
        // Determine error type and customize message
        let errorTitle, errorIcon, errorClass;
        
        if (message.includes('Invalid username or password')) {
            errorTitle = 'Authentication Failed';
            errorIcon = 'fas fa-lock';
            errorClass = 'auth-error';
        } else if (message.includes('You can only delete your own')) {
            errorTitle = 'Access Denied';
            errorIcon = 'fas fa-shield-alt';
            errorClass = 'permission-error';
        } else {
            errorTitle = 'Error';
            errorIcon = 'fas fa-exclamation-triangle';
            errorClass = 'general-error';
        }

        const errorModalHTML = `
            <div class="auth-error-modal" id="auth-error-modal">
                <div class="auth-error-container ${errorClass}">
                    <div class="auth-error-header">
                        <div class="auth-error-icon">
                            <i class="${errorIcon}"></i>
                        </div>
                        <h3>${errorTitle}</h3>
                    </div>
                    <div class="auth-error-body">
                        <p>${message}</p>
                    </div>
                    <div class="auth-error-actions">
                        <button class="btn btn-primary" id="auth-error-ok">OK</button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing error modal if any
        const existingErrorModal = document.getElementById('auth-error-modal');
        if (existingErrorModal) {
            existingErrorModal.remove();
        }

        // Add error modal to body
        document.body.insertAdjacentHTML('beforeend', errorModalHTML);

        // Get modal elements
        const errorModal = document.getElementById('auth-error-modal');
        const okBtn = document.getElementById('auth-error-ok');

        // Show modal with animation
        setTimeout(() => errorModal.classList.add('active'), 10);

        // Close modal function
        const closeErrorModal = () => {
            errorModal.classList.remove('active');
            setTimeout(() => errorModal.remove(), 300);
        };

        // Event listeners
        okBtn.addEventListener('click', closeErrorModal);
        
        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeErrorModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Close on backdrop click
        errorModal.addEventListener('click', (e) => {
            if (e.target === errorModal) {
                closeErrorModal();
            }
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
            if (document.getElementById('auth-error-modal')) {
                closeErrorModal();
            }
        }, 5000);
    }

    // Perform the actual deletion - Database + localStorage
    async performDeleteAppointment(appointmentId) {
        try {
            console.log('🗑️ Deleting appointment from database and localStorage:', appointmentId);
            
            // Find the appointment first
            const appointmentToDelete = this.appointments.find(apt => apt.id === appointmentId);
            if (!appointmentToDelete) {
                throw new Error('Appointment not found');
            }
            
            // **ENHANCED: Delete from database first, then localStorage**
            try {
                console.log('🌐 Attempting to delete from database...');
                const response = await fetch(`/api/appointments/${appointmentId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (response.ok) {
                    console.log('✅ DATABASE DELETE SUCCESSFUL');
                    
                    // Remove from local array
                    this.appointments = this.appointments.filter(apt => apt.id !== appointmentId);
                    
                    // Save to localStorage
                    this.saveAppointmentsToStorage();
                    
                    // Update views
                    this.updateCalendarEvents();
                    this.renderAppointmentsList();
                    
                    console.log('✅ COMPLETE DELETE SUCCESSFUL - removed from database, localStorage and views updated');
                    this.showSuccess(`✅ Appointment for ${appointmentToDelete.clientName} deleted successfully from database!`);
                    
                } else {
                    throw new Error(`Database delete failed: ${response.status} ${response.statusText}`);
                }
                
            } catch (dbError) {
                console.warn('⚠️ DATABASE DELETE FAILED, falling back to localStorage only:', dbError);
                
                // Fallback: Delete from localStorage even if database fails
                this.appointments = this.appointments.filter(apt => apt.id !== appointmentId);
                this.saveAppointmentsToStorage();
                this.updateCalendarEvents();
                this.renderAppointmentsList();
                
                this.showSuccess(`✅ Appointment for ${appointmentToDelete.clientName} deleted locally (database unavailable)`);
            }
            
        } catch (error) {
            console.error('❌ DELETE FAILED:', error);
            this.showError(`Failed to delete appointment: ${error.message}`);
        }
    }

    // Show appointment details with history and email logs
    async showAppointmentDetails(appointmentId) {
        try {
        const appointment = this.appointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            this.showError('Appointment not found');
            return;
        }
        
            // Get appointment history and email history from backend
            const [historyResponse, emailHistoryResponse] = await Promise.all([
                fetch(`/api/appointments/${appointmentId}/history`).catch(() => ({ ok: false })),
                fetch(`/api/appointments/${appointmentId}/email-history`).catch(() => ({ ok: false }))
            ]);

            let appointmentHistory = [];
            let emailHistory = [];

            if (historyResponse.ok) {
                const historyData = await historyResponse.json();
                appointmentHistory = historyData.history || [];
            }

            if (emailHistoryResponse.ok) {
                const emailData = await emailHistoryResponse.json();
                emailHistory = emailData.history || [];
            }

            this.displayAppointmentDetailsModal(appointment, appointmentHistory, emailHistory);

        } catch (error) {
            console.error('Error loading appointment details:', error);
            this.showError('Failed to load appointment details');
        }
    }

    // Display appointment details modal
    displayAppointmentDetailsModal(appointment, appointmentHistory, emailHistory) {
        const modalHTML = `
            <div class="appointment-details-modal" id="appointment-details-modal">
                <div class="appointment-details-container">
                    <div class="appointment-details-header">
                        <h3><i class="fas fa-info-circle"></i> Appointment Details</h3>
                        <button class="appointment-details-close" id="appointment-details-close">&times;</button>
                    </div>
                    <div class="appointment-details-body">
                        <!-- Appointment Information -->
                        <div class="details-section">
                            <h4><i class="fas fa-user"></i> Appointment Information</h4>
                            <div class="details-grid">
                                <div class="detail-card">
                                    <div class="detail-card-label">Client Name</div>
                                    <div class="detail-card-value">${appointment.clientName}</div>
                                </div>
                                <div class="detail-card">
                                    <div class="detail-card-label">Email</div>
                                    <div class="detail-card-value">${appointment.clientEmail}</div>
                                </div>
                                <div class="detail-card">
                                    <div class="detail-card-label">Phone</div>
                                    <div class="detail-card-value">${appointment.clientPhone || 'Not provided'}</div>
                                </div>
                                <div class="detail-card">
                                    <div class="detail-card-label">Service Type</div>
                                    <div class="detail-card-value">${appointment.type}</div>
                                </div>
                                <div class="detail-card">
                                    <div class="detail-card-label">Date</div>
                                    <div class="detail-card-value">${this.formatDate(appointment.date)}</div>
                                </div>
                                <div class="detail-card">
                                    <div class="detail-card-label">Time</div>
                                    <div class="detail-card-value">${this.formatTime(appointment.time)}</div>
                                </div>
                                <div class="detail-card">
                                    <div class="detail-card-label">Status</div>
                                    <div class="detail-card-value">
                                        <span class="status-badge status-${appointment.status}">
                                            ${this.capitalizeFirst(appointment.status)}
                                        </span>
                                    </div>
                                </div>
                                <div class="detail-card">
                                    <div class="detail-card-label">Host</div>
                                    <div class="detail-card-value">${appointment.hostId || 'Not assigned'}</div>
                                </div>
                            </div>
                            ${appointment.notes ? `
                            <div class="detail-card" style="grid-column: 1 / -1;">
                                <div class="detail-card-label">Notes</div>
                                <div class="detail-card-value">${appointment.notes}</div>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Appointment History -->
                        <div class="details-section">
                            <h4><i class="fas fa-history"></i> Change History</h4>
                            ${appointmentHistory.length > 0 ? `
                            <table class="history-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Action</th>
                                        <th>Changed By</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${appointmentHistory.map(entry => `
                                    <tr>
                                        <td>${new Date(entry.timestamp).toLocaleString()}</td>
                                        <td>${entry.action}</td>
                                        <td>${entry.changed_by || 'System'}</td>
                                        <td>${entry.details || 'N/A'}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ` : `
                            <div class="empty-history">
                                <i class="fas fa-inbox"></i>
                                <p>No changes recorded for this appointment</p>
                            </div>
                            `}
                        </div>

                        <!-- Email History -->
                        <div class="details-section">
                            <h4><i class="fas fa-envelope-open"></i> Email History</h4>
                            ${emailHistory.length > 0 ? `
                            <table class="history-table">
                                <thead>
                                    <tr>
                                        <th>Date Sent</th>
                                        <th>Template Type</th>
                                        <th>Status</th>
                                        <th>Sent By</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${emailHistory.map(entry => `
                                    <tr>
                                        <td>${new Date(entry.timestamp).toLocaleString()}</td>
                                        <td>${this.capitalizeFirst(entry.template_type)}</td>
                                        <td>
                                            <span class="history-status ${entry.status}">
                                                <i class="fas ${entry.status === 'success' ? 'fa-check' : entry.status === 'failed' ? 'fa-times' : 'fa-clock'}"></i>
                                                ${this.capitalizeFirst(entry.status)}
                                            </span>
                                        </td>
                                        <td>${entry.sent_by || 'System'}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ` : `
                            <div class="empty-history">
                                <i class="fas fa-envelope"></i>
                                <p>No emails sent for this appointment</p>
                            </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('appointment-details-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        const modal = document.getElementById('appointment-details-modal');
        const closeBtn = document.getElementById('appointment-details-close');

        setTimeout(() => modal.classList.add('active'), 10);

        // Event listeners
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    // Send email with 24-hour protection
    async sendEmailWithProtection(appointmentId) {
        try {
            const appointment = this.appointments.find(apt => apt.id === appointmentId);
            if (!appointment) {
                this.showError('Appointment not found');
                return;
            }

            // Check if an email was sent in the last 24 hours
            const lastEmailTime = await this.getLastEmailTime(appointmentId);
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

            if (lastEmailTime && new Date(lastEmailTime) > twentyFourHoursAgo) {
                // Show protection modal requiring admin/manager password
                this.showEmailProtectionModal(appointmentId, appointment, lastEmailTime);
            } else {
                // No recent email, proceed normally
                this.sendEmail(appointmentId);
            }

        } catch (error) {
            console.error('Error checking email protection:', error);
            this.showError('Failed to check email sending permissions');
        }
    }

    // Get last email time for appointment
    async getLastEmailTime(appointmentId) {
        try {
            const response = await fetch(`/api/appointments/${appointmentId}/last-email-time`);
            if (response.ok) {
                const data = await response.json();
                return data.lastEmailTime;
            }
            return null;
        } catch (error) {
            console.error('Error getting last email time:', error);
            return null;
        }
    }

    // Show email protection modal
    showEmailProtectionModal(appointmentId, appointment, lastEmailTime) {
        const timeSinceLastEmail = Math.floor((new Date() - new Date(lastEmailTime)) / (1000 * 60 * 60));
        const timeRemaining = Math.max(0, 24 - timeSinceLastEmail);

        const modalHTML = `
            <div class="email-protection-modal" id="email-protection-modal">
                <div class="email-protection-container">
                    <div class="email-protection-header">
                        <div class="email-protection-icon">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <h3>Email Protection Active</h3>
                    </div>
                    <div class="email-protection-body">
                        <div class="protection-warning">
                            <h4><i class="fas fa-clock"></i> 24-Hour Email Limit</h4>
                            <p>An email was already sent for this appointment <strong>${timeSinceLastEmail} hours ago</strong>.</p>
                            <p>You can send another email in <strong>${timeRemaining} hours</strong>.</p>
                        </div>

                        <div class="appointment-info">
                            <h5>Appointment: ${appointment.clientName}</h5>
                            <p>Last email sent: ${new Date(lastEmailTime).toLocaleString()}</p>
                        </div>

                        <div class="admin-override-section">
                            <h5><i class="fas fa-user-shield"></i> Manager/Admin Override</h5>
                            <p>Managers and Admins can bypass this protection by entering their credentials:</p>

                            <div class="admin-auth-form">
                                <div class="form-group">
                                    <label for="protection-username">Username:</label>
                                    <input type="text" id="protection-username" placeholder="Enter manager/admin username" required>
                                </div>
                                <div class="form-group">
                                    <label for="protection-password">Password:</label>
                                    <input type="password" id="protection-password" placeholder="Enter password" required>
                                </div>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button class="btn btn-secondary" id="protection-cancel">Cancel</button>
                            <button class="btn btn-primary" id="protection-override">
                                <i class="fas fa-envelope"></i>
                                Send Email (Override)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('email-protection-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Show modal
        const modal = document.getElementById('email-protection-modal');
        const cancelBtn = document.getElementById('protection-cancel');
        const overrideBtn = document.getElementById('protection-override');
        const usernameInput = document.getElementById('protection-username');
        const passwordInput = document.getElementById('protection-password');

        setTimeout(() => modal.classList.add('active'), 10);

        // Event listeners
        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        cancelBtn.addEventListener('click', closeModal);

        overrideBtn.addEventListener('click', async () => {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                this.showError('Please enter both username and password');
                return;
            }

            overrideBtn.disabled = true;
            overrideBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';

            try {
                // Verify admin/manager credentials
                const isAuthorized = await this.verifyAdminCredentials(username, password);
                
                if (isAuthorized.success) {
                    closeModal();
                    // Record the override in the email log
                    await this.recordEmailOverride(appointmentId, username);
                    // Proceed with email sending
                    this.sendEmail(appointmentId);
                } else {
                    this.showError(isAuthorized.message || 'Invalid credentials or insufficient permissions');
                    overrideBtn.disabled = false;
                    overrideBtn.innerHTML = '<i class="fas fa-envelope"></i> Send Email (Override)';
                }
            } catch (error) {
                console.error('Override error:', error);
                this.showError('Authentication failed');
                overrideBtn.disabled = false;
                overrideBtn.innerHTML = '<i class="fas fa-envelope"></i> Send Email (Override)';
            }
        });

        // Enter key to submit
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                overrideBtn.click();
            }
        });

        // Focus username input
        usernameInput.focus();

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Verify admin/manager credentials
    async verifyAdminCredentials(username, password) {
        try {
            const response = await fetch('/api/verify-admin-credentials', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const result = await response.json();
                return result;
            } else {
                const error = await response.json();
                return { success: false, message: error.message || 'Authentication failed' };
            }
        } catch (error) {
            console.error('Error verifying credentials:', error);
            return { success: false, message: 'Network error during authentication' };
        }
    }

    // Record email override in the system
    async recordEmailOverride(appointmentId, username) {
        try {
            await fetch(`/api/appointments/${appointmentId}/record-email-override`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    overriddenBy: username,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Error recording email override:', error);
        }
    }

    // Send email for appointment (now with real email sending)
    async sendEmail(appointmentId) {
        try {
            console.log('Sending real email for appointment:', appointmentId);
            
            const appointment = this.appointments.find(apt => apt.id === appointmentId);
            if (!appointment) {
                this.showError('Appointment not found');
                return;
            }
            
            this.showLoading();
            
            // Use the existing sendAppointmentEmail method with confirmation template by default
            const result = await this.sendAppointmentEmail(appointmentId, 'confirmation');
            
            if (result.success) {
                this.showSuccess(`📧 Email sent successfully to ${appointment.clientEmail}`);
                console.log(`📧 Real email sent for appointment ${appointmentId} to ${appointment.clientEmail}`);
            } else {
                this.showError(`Failed to send email: ${result.message}`);
            }
            
        } catch (error) {
            console.error('Error sending email:', error);
            this.showError('Failed to send email');
        } finally {
            this.hideLoading();
        }
    }

    // Show help modal - Enhanced with proper modal
    showHelp() {
        // Remove existing help modal if any
        const existingModal = document.getElementById('help-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create help modal
        const helpModal = document.createElement('div');
        helpModal.id = 'help-modal';
        helpModal.innerHTML = `
            <div class="help-modal-overlay">
                <div class="help-modal-content">
                    <div class="help-modal-header">
                        <h2><i class="fas fa-question-circle"></i> Appointment System Guide</h2>
                        <button class="help-close-btn" onclick="document.getElementById('help-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="help-modal-body">
                        <div class="help-section">
                            <h3><i class="fas fa-plus-circle text-primary"></i> Creating Appointments</h3>
                            <ul>
                                <li><strong>Calendar:</strong> Click on any date to create a new appointment</li>
                                <li><strong>New Appointment Button:</strong> Click the "New Appointment" button anytime</li>
                                <li><strong>Quick Shortcut:</strong> Press <kbd>Ctrl+N</kbd> (or <kbd>Cmd+N</kbd> on Mac)</li>
                                <li><strong>Time Conflicts:</strong> System will prevent double-booking the same time slot</li>
                            </ul>
                        </div>
                        
                        <div class="help-section">
                            <h3><i class="fas fa-edit text-success"></i> Managing Appointments</h3>
                            <ul>
                                <li><strong>Edit:</strong> Click on any appointment or use the edit button</li>
                                <li><strong>Drag & Drop:</strong> Drag appointments to different dates/times (Calendar view)</li>
                                <li><strong>Delete:</strong> Use the delete button (requires admin authentication)</li>
                                <li><strong>Status Updates:</strong> Change status between Scheduled, Confirmed, Rescheduled, Completed</li>
                            </ul>
                        </div>
                        
                        <div class="help-section">
                            <h3><i class="fas fa-calendar-alt text-info"></i> Views & Navigation</h3>
                            <ul>
                                <li><strong>Calendar View:</strong> Visual calendar with drag-and-drop functionality</li>
                                <li><strong>List View:</strong> Chronological list with quick actions</li>
                                <li><strong>Filters:</strong> Filter by date range, status, appointment type, or host</li>
                                <li><strong>Search:</strong> Quick search by client name or details</li>
                            </ul>
                        </div>
                        
                        <div class="help-section">
                            <h3><i class="fas fa-keyboard text-warning"></i> Keyboard Shortcuts</h3>
                            <ul>
                                <li><kbd>Ctrl+N</kbd> / <kbd>Cmd+N</kbd> - Create new appointment</li>
                                <li><kbd>Escape</kbd> - Close any open modal or dialog</li>
                                <li><kbd>Ctrl+S</kbd> / <kbd>Cmd+S</kbd> - Save appointment form (when modal is open)</li>
                                <li><kbd>Tab</kbd> - Navigate between form fields</li>
                            </ul>
                        </div>
                        
                        <div class="help-section">
                            <h3><i class="fas fa-shield-alt text-danger"></i> Security & Permissions</h3>
                            <ul>
                                <li><strong>Admin:</strong> Full access to all appointments</li>
                                <li><strong>Manager:</strong> Can edit/delete appointments they created</li>
                                <li><strong>Staff:</strong> View-only access with limited editing</li>
                                <li><strong>Authentication:</strong> Required for sensitive operations</li>
                            </ul>
                        </div>
                        
                        <div class="help-section">
                            <h3><i class="fas fa-lightbulb text-success"></i> Pro Tips</h3>
                            <ul>
                                <li>Use filters to quickly find specific appointments</li>
                                <li>Color coding helps identify different appointment types</li>
                                <li>Status badges show appointment progress at a glance</li>
                                <li>Copy appointment URLs to share with clients</li>
                                <li>Use notes field for important client information</li>
                            </ul>
                        </div>
                    </div>
                    <div class="help-modal-footer">
                        <button class="btn btn-primary" onclick="document.getElementById('help-modal').remove()">
                            <i class="fas fa-check"></i> Got it!
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add styles for the help modal
        helpModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // Add CSS for modal components
        const style = document.createElement('style');
        style.textContent = `
            .help-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(5px);
            }
            .help-modal-content {
                position: relative;
                background: white;
                border-radius: 16px;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                margin: 2rem;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }
            .help-modal-header {
                padding: 2rem 2rem 1rem;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .help-modal-header h2 {
                margin: 0;
                color: #1f2937;
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            .help-close-btn {
                background: none;
                border: none;
                font-size: 1.25rem;
                color: #6b7280;
                cursor: pointer;
                padding: 0.5rem;
                border-radius: 8px;
                transition: all 0.2s ease;
            }
            .help-close-btn:hover {
                background: #f3f4f6;
                color: #1f2937;
            }
            .help-modal-body {
                padding: 2rem;
            }
            .help-section {
                margin-bottom: 2rem;
            }
            .help-section h3 {
                color: #1f2937;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1.1rem;
            }
            .help-section ul {
                margin: 0;
                padding-left: 1.5rem;
            }
            .help-section li {
                margin-bottom: 0.75rem;
                line-height: 1.6;
                color: #4b5563;
            }
            .help-section li strong {
                color: #1f2937;
            }
            .help-section kbd {
                background: #f3f4f6;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                padding: 0.2em 0.4em;
                font-size: 0.85em;
                color: #1f2937;
                font-family: monospace;
            }
            .help-modal-footer {
                padding: 1rem 2rem 2rem;
                text-align: center;
            }
            .text-primary { color: #3b82f6; }
            .text-success { color: #10b981; }
            .text-info { color: #06b6d4; }
            .text-warning { color: #f59e0b; }
            .text-danger { color: #ef4444; }
        `;
        document.head.appendChild(style);

        document.body.appendChild(helpModal);

        // Animate in
        setTimeout(() => {
            helpModal.style.opacity = '1';
            helpModal.querySelector('.help-modal-content').style.transform = 'scale(1)';
        }, 10);

        // Close on overlay click
        helpModal.querySelector('.help-modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                helpModal.remove();
            }
        });

        // Close on escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                helpModal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        console.log('📖 Help modal opened');
    }

    // Add entrance animations
    addEntranceAnimations() {
        const elements = document.querySelectorAll('.slide-up');
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                el.style.transition = 'all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }

    // Show loading overlay
    showLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('active');
            this.isLoading = true;
        }
    }

    // Hide loading overlay
    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.remove('active');
            this.isLoading = false;
        }
    }

    // Show success message with enhanced popup
    showSuccess(message) {
        // Try to use the existing alert system first
        if (this.elements?.successMessage && this.elements?.successAlert) {
            this.elements.successMessage.textContent = message;
            this.elements.successAlert.classList.add('show');
            
            setTimeout(() => {
                this.elements.successAlert.classList.remove('show');
            }, 4000);
        }
        
        // Always show the enhanced popup notification as well
        this.showNotificationPopup(message, 'success');
    }

    // Show error message with enhanced popup
    showError(message) {
        // Try to use the existing alert system first
        if (this.elements?.errorMessage && this.elements?.errorAlert) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorAlert.classList.add('show');
            
            setTimeout(() => {
                this.elements.errorAlert.classList.remove('show');
            }, 5000);
        }
        
        // Always show the enhanced popup notification as well
        this.showNotificationPopup(message, 'error');
    }

    // Enhanced notification popup system
    showNotificationPopup(message, type = 'info') {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.monume-notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = 'monume-notification';
        
        // Set colors and icons based on type
        let bgColor, icon, borderColor;
        switch (type) {
            case 'success':
                bgColor = 'linear-gradient(135deg, #10b981, #059669)';
                borderColor = '#10b981';
                icon = 'fas fa-check-circle';
                break;
            case 'error':
                bgColor = 'linear-gradient(135deg, #ef4444, #dc2626)';
                borderColor = '#ef4444';
                icon = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                bgColor = 'linear-gradient(135deg, #f59e0b, #d97706)';
                borderColor = '#f59e0b';
                icon = 'fas fa-exclamation-triangle';
                break;
            default:
                bgColor = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
                borderColor = '#3b82f6';
                icon = 'fas fa-info-circle';
        }

        notification.style.cssText = `
            position: fixed;
            top: 30px;
            right: 30px;
            background: ${bgColor};
            color: white;
            padding: 1.25rem 1.75rem;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px ${borderColor};
            z-index: 10000;
            font-weight: 600;
            font-size: 1rem;
            max-width: 450px;
            min-width: 320px;
            word-wrap: break-word;
            transform: translateX(120%);
            transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: 'Inter', sans-serif;
        `;

        notification.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.2);
                flex-shrink: 0;
            ">
                <i class="${icon}" style="font-size: 14px;"></i>
            </div>
            <div style="flex: 1;">
                ${message}
            </div>
            <button style="
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 4px;
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0.7;
                transition: all 0.2s ease;
                flex-shrink: 0;
            " onmouseover="this.style.opacity='1'; this.style.background='rgba(255,255,255,0.1)'" 
               onmouseout="this.style.opacity='0.7'; this.style.background='none'"
               onclick="this.parentElement.style.transform='translateX(120%)'; setTimeout(() => this.parentElement.remove(), 400)">
                <i class="fas fa-times" style="font-size: 12px;"></i>
            </button>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Auto-remove after delay (longer for errors)
        const autoRemoveDelay = type === 'error' ? 7000 : 5000;
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.transform = 'translateX(120%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 400);
            }
        }, autoRemoveDelay);

        // Add click to dismiss
        notification.addEventListener('click', (e) => {
            if (e.target === notification || e.target.closest('.monume-notification') === notification) {
                notification.style.transform = 'translateX(120%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 400);
            }
        });

        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }

    // **DIAGNOSTIC FUNCTION: Help debug edit issues**
    debugEditIssues() {
        console.log('🔍 === EDIT FUNCTIONALITY DIAGNOSTICS ===');
        
        // Check current state
        console.log('📊 Current state:', {
            editingAppointment: this.editingAppointment,
            totalAppointments: this.appointments.length,
            appointmentIds: this.appointments.map(apt => apt.id)
        });
        
        // Check form elements
        console.log('📋 Form elements status:', {
            clientName: !!this.elements.clientName,
            clientEmail: !!this.elements.clientEmail,
            clientPhone: !!this.elements.clientPhone,
            appointmentDate: !!this.elements.appointmentDate,
            appointmentHour: !!this.elements.appointmentHour,
            appointmentMinute: !!this.elements.appointmentMinute,
            appointmentAmpm: !!this.elements.appointmentAmpm,
            appointmentType: !!this.elements.appointmentType,
            appointmentHost: !!this.elements.appointmentHost,
            appointmentNotes: !!this.elements.appointmentNotes
        });
        
        // Show localStorage data
        const savedData = localStorage.getItem('monumeAppointments');
        console.log('💾 localStorage data:', savedData ? JSON.parse(savedData) : 'No data');
        
        // Test credentials
        console.log('🔐 Test credentials:');
        console.log('  admin / admin123 (admin role)');
        console.log('  manager / manager123 (manager role)');
        console.log('  staff1 / staff123 (employee role)');
        
        // Test edit function with first appointment
        if (this.appointments.length > 0) {
            const firstAppointment = this.appointments[0];
            console.log('🧪 To test edit, run: window.appointmentManager.editAppointment("' + firstAppointment.id + '")');
            console.log('🧪 First appointment details:', firstAppointment);
            
            // Add quick test function
            console.log('🚀 QUICK TEST: Run this command to test edit immediately:');
            console.log('   testQuickEdit()');
            
            window.testQuickEdit = () => {
                console.log('🧪 Starting quick edit test...');
                window.appointmentManager.editAppointment(firstAppointment.id);
            };
        } else {
            console.log('❌ No appointments available to test edit');
        }
    }

    // **DEBUG FUNCTION: Test calendar vs list view behavior**
    testViewSync() {
        console.log('🧪 === TESTING CALENDAR VS LIST VIEW BEHAVIOR ===');
        
        // Get current appointments and categorize them
        const totalAppointments = this.appointments.length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const futureAppointments = this.appointments.filter(apt => new Date(apt.date) >= today);
        const pastAppointments = this.appointments.filter(apt => new Date(apt.date) < today);
        
        console.log(`📊 Total appointments in memory: ${totalAppointments}`);
        console.log(`🔮 Future/Today appointments: ${futureAppointments.length}`);
        console.log(`⏰ Past appointments: ${pastAppointments.length}`);
        
        // Test list view filtering
        const filtersActive = this.hasActiveFilters();
        const listAppointments = this.filterAppointments(this.appointments);
        console.log(`📋 List view shows: ${listAppointments.length} appointments`);
        console.log(`🔍 Filters active: ${filtersActive}`);
        console.log(`📜 Show past setting: ${this.filters.showPast}`);
        
        // Calendar always shows all appointments
        console.log(`📅 Calendar shows: ${totalAppointments} appointments (always shows all)`);
        
        // Check behavior is correct
        if (!filtersActive && !this.filters.showPast) {
            if (listAppointments.length === futureAppointments.length) {
                console.log('✅ CORRECT: List view showing only future appointments by default');
            } else {
                console.error('❌ ISSUE: List view not showing correct future appointments');
                console.log('Expected future appointments:', futureAppointments.length);
                console.log('List showing:', listAppointments.length);
            }
        } else if (this.filters.showPast && !filtersActive) {
            if (listAppointments.length === totalAppointments) {
                console.log('✅ CORRECT: "Show All" is displaying all appointments (past + future)');
            } else {
                console.error('❌ ISSUE: "Show All" not showing all appointments');
                console.log('Expected total appointments:', totalAppointments);
                console.log('List showing:', listAppointments.length);
            }
        } else {
            if (this.filters.showPast) {
                console.log('ℹ️ Complex filters active with showPast=true - showing filtered results including past');
            } else {
                console.log('ℹ️ Complex filters active with showPast=false - showing filtered future appointments');
            }
        }
        
        // Determine expected behavior
        let expectedBehavior;
        let behaviorCorrect;
        
        if (!filtersActive && !this.filters.showPast) {
            expectedBehavior = 'Show future appointments only';
            behaviorCorrect = listAppointments.length === futureAppointments.length;
        } else if (this.filters.showPast && !filtersActive) {
            expectedBehavior = 'Show all appointments (past + future)';
            behaviorCorrect = listAppointments.length === totalAppointments;
        } else {
            expectedBehavior = 'Show filtered results';
            behaviorCorrect = 'N/A (complex filters active)';
        }
        
        return {
            totalAppointments,
            futureAppointments: futureAppointments.length,
            pastAppointments: pastAppointments.length,
            listAppointments: listAppointments.length,
            calendarAppointments: totalAppointments,
            otherFiltersActive: filtersActive,
            showPastFilter: this.filters.showPast,
            expectedBehavior,
            behaviorCorrect
        };
    }
}

// Export for global access - will be set by HTML script
window.appointmentManager = null;

// Make debug function available globally for console testing
window.testCalendarListSync = function() {
    if (window.appointmentManager) {
        return window.appointmentManager.testViewSync();
    } else {
        console.error('Appointment manager not initialized');
        return null;
    }
};

// Alternative name for the debug function
window.testAppointmentViews = window.testCalendarListSync;

// **DEMO APPOINTMENTS DISABLED - Fresh start with no demo data** 