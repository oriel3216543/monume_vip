/**
 * MonuMe Tracking System - Main JavaScript Controller
 * Handles all tracking station functionality, data management, and UI interactions
 */

// ===== GLOBAL VARIABLES =====
let currentSaveButton = null;
let stationData = null;
let currentUserDropdown = null;
let previousUserValue = null;

// ===== TRACKING SYSTEM CLASS =====
class TrackingSystem {
    constructor() {
        this.trackingData = [];
        this.users = [];
        this.init();
    }

    // Initialize the tracking system
    async init() {
        console.log("🚀 Initializing MonuMe Tracking System...");
        
        this.initializeStorageIfNeeded();
        await this.loadTrackingStations();
        this.createParticles();
        this.debugSavedData();
        this.setupEventListeners();
        
        console.log("✅ Tracking System initialized successfully");
    }

    // Setup global event listeners
    setupEventListeners() {
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('simple-data-modal');
            if (event.target === modal) {
                this.closeSimpleModal();
            }
        });

        // Auto-save on any input change
        document.addEventListener('input', (event) => {
            if (event.target.closest('.tracking-station')) {
                this.saveTrackingStations();
            }
        });
    }

    // ===== TRACKING STATION MANAGEMENT =====
    
    async addTrackingStation() {
        const container = document.getElementById("tracking-stations");
        const station = document.createElement("div");
        station.classList.add("tracking-station");
        
        station.innerHTML = this.getStationHTML();
        container.prepend(station);
        
        // Load fresh user data for the new station
        await this.loadUserDropdown(station.querySelector(".user-dropdown"));
        this.saveTrackingStations();
        this.setupStationEventListeners(station);
        
        console.log("✅ New tracking station added with location-filtered users");
    }

    getStationHTML() {
        return `
            <div class="station-header">
                <div class="station-title">
                    <i class="fas fa-chart-line"></i>
                    Performance Station
                </div>
                <div class="station-subtitle">Track sales metrics</div>
            </div>
            
            <div class="sales-rep-container">
                <label class="sales-rep-label">Sales Representative</label>
                <select class="user-dropdown">
                    <option value="">Select Sales Rep</option>
                </select>
            </div>
            
            <div class="question-container">
                <div class="question-row">
                    <label>Opal Demos</label>
                    <div class="counter-controls">
                        <button class="counter-btn" onclick="tracking.changeValue(this, -1)">−</button>
                        <input type="number" min="0" value="0" class="data-input" data-input="opal_demos">
                        <button class="counter-btn" onclick="tracking.changeValue(this, 1)">+</button>
                    </div>
                </div>
                <div class="question-row">
                    <label>Opal Sales</label>
                    <div class="counter-controls">
                        <button class="counter-btn" onclick="tracking.changeValue(this, -1)">−</button>
                        <input type="number" min="0" value="0" class="data-input" data-input="opal_sales">
                        <button class="counter-btn" onclick="tracking.changeValue(this, 1)">+</button>
                    </div>
                </div>
                <div class="question-row">
                    <label>Scan Demos</label>
                    <div class="counter-controls">
                        <button class="counter-btn" onclick="tracking.changeValue(this, -1)">−</button>
                        <input type="number" min="0" value="0" class="data-input" data-input="scan_demos">
                        <button class="counter-btn" onclick="tracking.changeValue(this, 1)">+</button>
                    </div>
                </div>
                <div class="question-row">
                    <label>Scan Sold</label>
                    <div class="counter-controls">
                        <button class="counter-btn" onclick="tracking.changeValue(this, -1)">−</button>
                        <input type="number" min="0" value="0" class="data-input" data-input="scan_sold">
                        <button class="counter-btn" onclick="tracking.changeValue(this, 1)">+</button>
                    </div>
                </div>
            </div>
            
            <div class="station-footer">
                <button class="save-btn" onclick="tracking.openSimpleModal(this)">
                    <i class="fas fa-save"></i> Save & Finish
                </button>
                <button class="remove-btn" onclick="tracking.removeStation(this)">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
    }

    setupStationEventListeners(station) {
        const userDropdown = station.querySelector(".user-dropdown");
        userDropdown.addEventListener("change", () => {
            if (userDropdown.value) {
                currentUserDropdown = userDropdown;
                previousUserValue = "";
                this.showUserConfirmation(userDropdown.options[userDropdown.selectedIndex].text);
            }
        });
    }

    removeStation(button) {
        // Store the station element to remove
        this.stationToRemove = button.closest(".tracking-station");
        // Show confirmation modal
        if (typeof showRemoveConfirmation === 'function') {
            showRemoveConfirmation('station');
        } else {
            // Fallback if function not available
            if (confirm('Are you sure you want to remove this tracking station?')) {
                this.stationToRemove.remove();
                this.saveTrackingStations();
            }
        }
    }

    // New method to actually remove the station after confirmation
    removeTrackingStation() {
        if (this.stationToRemove) {
            this.stationToRemove.remove();
            this.saveTrackingStations();
            this.stationToRemove = null;
        }
    }

    // New method to automatically remove station without confirmation (for save operations)
    removeStationAutomatically(station) {
        if (station) {
            console.log('🗑️ Automatically removing tracking station after save');
            station.remove();
            this.saveTrackingStations();
        }
    }

    changeValue(button, amount) {
        const counterControls = button.closest('.counter-controls');
        const input = counterControls.querySelector('input');
        let value = parseInt(input.value) + amount;
        if (value < 0) value = 0;
        input.value = value;
        this.saveTrackingStations();
    }

    showSuccessMessage(message) {
        const notification = document.getElementById('success-notification');
        const messageElement = document.getElementById('success-message');
        
        if (notification && messageElement) {
            messageElement.textContent = message || 'Data saved successfully!';
            notification.style.display = 'block';
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
    }



    // ===== USER MANAGEMENT =====

    async loadUserDropdown(dropdown) {
        try {
            dropdown.innerHTML = '<option value="">Loading sales reps...</option>';
            dropdown.disabled = true;
            
            let users = await this.loadUsers();
            
            // Clear loading state and add default option
            dropdown.innerHTML = '<option value="">Select Sales Rep</option>';
            
            if (users.length === 0) {
                const currentLocationName = localStorage.getItem("currentTrackingLocationName");
                const role = localStorage.getItem("role");
                const isAdmin = role === "admin";
                
                if (isAdmin && currentLocationName) {
                    dropdown.innerHTML = `<option value="">No sales reps available for ${currentLocationName}</option>`;
                } else if (isAdmin && !currentLocationName) {
                    dropdown.innerHTML = '<option value="">No sales reps available (select a location first)</option>';
                } else {
                    dropdown.innerHTML = '<option value="">No sales reps available for this location</option>';
                }
                dropdown.disabled = false;
                console.warn('⚠️ No users found for current location context');
                return;
            }
            
            // Add users to dropdown
            users.forEach(user => {
                const option = document.createElement("option");
                option.value = user.id;
                option.textContent = user.name || user.username;
                dropdown.appendChild(option);
            });
            
            dropdown.disabled = false;
            console.log(`✅ Successfully loaded ${users.length} users for tracking dropdown`);
            
        } catch (error) {
            console.error("❌ Error loading users:", error);
            dropdown.innerHTML = '<option value="">Error loading sales reps</option>';
            dropdown.disabled = false;
        }
    }

    async loadUsers() {
        let users = [];
        
        // Get current location context from URL and localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const urlLocationParam = urlParams.get('location');
        const currentLocationParam = urlLocationParam || localStorage.getItem("currentTrackingLocationParam");
        const currentLocationId = localStorage.getItem("currentTrackingLocationId");
        const currentLocationName = localStorage.getItem("currentTrackingLocationName");
        const role = localStorage.getItem("role");
        const isAdmin = role === "admin";
        
        // Always fetch from server to ensure we get the correct location-based filtering
        try {
            // Build URL with location parameters
            let url = "/get_users_for_tracking";
            const params = new URLSearchParams();
            
            // Use the location parameter from URL if available
            if (currentLocationParam) {
                params.append('location', currentLocationParam);
            } else if (currentLocationId) {
                params.append('location_id', currentLocationId);
            }
            if (currentLocationName) {
                params.append('location_name', currentLocationName);
            }
            
            if (params.toString()) {
                url += '?' + params.toString();
            }
            
            console.log(`🌐 Fetching users from: ${url}`);
            
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.users) {
                    users = data.users;
                    console.log(`✅ Loaded ${users.length} users from server (admin: ${data.is_admin}, location_id: ${data.user_location_id})`);
                    
                    // Cache to localStorage for future use
                    localStorage.setItem('monumeUsers', JSON.stringify(users));
                    
                    // Log user details for debugging
                    users.forEach(user => {
                        console.log(`👤 User: ${user.name || user.username} (ID: ${user.id}, Location: ${user.location_id})`);
                    });
                } else {
                    console.warn('❌ Server returned error or no users:', data);
                }
            } else {
                console.error(`❌ Server error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('❌ Error loading users from server:', error);
            
            // Fallback to localStorage if server fails
            try {
                const localUsers = JSON.parse(localStorage.getItem('monumeUsers') || '[]');
                if (localUsers.length > 0) {
                    // Filter users by location for tracking stations
                    if (isAdmin && currentLocationId) {
                        // Admin viewing specific location - show only that location's users
                        users = localUsers.filter(user => user.location_id == currentLocationId);
                        console.log(`📱 Fallback: Admin loaded ${users.length} users for location ${currentLocationId} from localStorage`);
                    } else if (isAdmin && !currentLocationId) {
                        // Admin viewing all locations - show all users
                        users = localUsers;
                        console.log(`📱 Fallback: Admin loaded ${users.length} users from all locations from localStorage`);
                    } else {
                        // Location user - show only their location's users
                        users = localUsers.filter(user => user.location_id == currentLocationId);
                        console.log(`📱 Fallback: Location user loaded ${users.length} users for location ${currentLocationId} from localStorage`);
                    }
                }
            } catch (localError) {
                console.error('❌ Error loading users from localStorage fallback:', localError);
            }
        }
        
        return users;
    }

    // ===== MODAL MANAGEMENT =====

    openSimpleModal(button) {
        const modal = document.getElementById('simple-data-modal');
        if (!modal) return;

        modal.style.display = 'block';
        modal.style.opacity = '0';
        
        // Clear form
        document.getElementById('net-sales').value = '0';
        document.getElementById('hours-worked').value = '0';
        
        // Store the button reference
        currentSaveButton = button;
        
        // Animate in
        setTimeout(() => {
            modal.style.transition = 'all 0.3s ease-out';
            modal.style.opacity = '1';
            document.getElementById('net-sales').focus();
        }, 10);
        
        document.body.style.overflow = 'hidden';
    }

    closeSimpleModal() {
        const modal = document.getElementById('simple-data-modal');
        if (!modal) return;

        modal.style.transition = 'all 0.3s ease-in';
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
        
        currentSaveButton = null;
    }

    // ===== DATA SAVING =====

    async saveSimpleData() {
        if (!currentSaveButton) {
            console.error('No save button reference found');
            this.closeSimpleModal();
            return;
        }

        const station = currentSaveButton.closest(".tracking-station");
        if (!station) {
            console.error('Station not found');
            this.closeSimpleModal();
            return;
        }

        const userDropdown = station.querySelector(".user-dropdown");
        const userId = userDropdown ? userDropdown.value : "";
        
        if (!userId) {
            alert("Please select a Sales Rep first!");
            return;
        }

        // Collect data with correct date
        const stationData = this.collectStationData(station, userId);
        console.log('💾 Saving tracking station data (base):', stationData);

        // Prepare to continue to demo details modal (no save yet)
        const userName = userDropdown.options[userDropdown.selectedIndex].textContent;

        // Temporarily store base station data to merge later with demo arrays
        this._pendingSave = { base: stationData, userName, stationEl: station };

        // Close first modal and open demo details modal
        this.closeSimpleModal();
        this.openDemosModal(stationData);
    }

    collectStationData(station, userId) {
        const netSales = parseFloat(document.getElementById('net-sales').value) || 0;
        const hoursWorked = parseFloat(document.getElementById('hours-worked').value) || 0;

        // Get current date in YYYY-MM-DD format
        const now = new Date();
        const dateString = now.toISOString().split('T')[0];

        return {
            user_id: parseInt(userId),
            opal_demos: parseInt(station.querySelector("input[data-input='opal_demos']").value) || 0,
            opal_sales: parseInt(station.querySelector("input[data-input='opal_sales']").value) || 0,
            scan_demos: parseInt(station.querySelector("input[data-input='scan_demos']").value) || 0,
            scan_sold: parseInt(station.querySelector("input[data-input='scan_sold']").value) || 0,
            net_sales: netSales,
            hours_worked: hoursWorked,
            date: dateString,
            saved_at: now.toISOString()
        };
    }

    async saveToServer(stationData, userName) {
        const response = await fetch("/save_tracking_data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({...stationData, username: userName})
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to save data");
        }
        
        console.log('✅ Data saved to server successfully');
        return result;
    }

    saveTrackingDataLocally(stationData, userName) {
        try {
            let trackingData = JSON.parse(localStorage.getItem('trackingData')) || [];
            
            // Get location context
            const currentLocationId = localStorage.getItem("currentTrackingLocationId");
            const currentLocationName = localStorage.getItem("currentTrackingLocationName");
            const role = localStorage.getItem("role");
            
            // Create detailed timestamp
            const now = new Date();
            const timestamp = now.toISOString();
            const timeString = now.toTimeString().split(' ')[0];
            
            const trackingRecord = {
                id: Date.now() + Math.random(),
                userId: stationData.user_id,
                username: userName,
                locationId: currentLocationId,
                locationName: currentLocationName,
                savedByRole: role,
                date: stationData.date,
                time: timeString,
                timestamp: timestamp,
                saved_at: stationData.saved_at,
                opal_demos: stationData.opal_demos,
                opal_sales: stationData.opal_sales,
                scan_demos: stationData.scan_demos,
                scan_sold: stationData.scan_sold,
                net_sales: stationData.net_sales,
                hours_worked: stationData.hours_worked,
                // new arrays if present
                opal_demo_numbers: stationData.opal_demo_numbers || [],
                scan_demo_numbers: stationData.scan_demo_numbers || []
            };
            
            trackingData.push(trackingRecord);
            localStorage.setItem('trackingData', JSON.stringify(trackingData));
            
            console.log('📊 Tracking data saved to localStorage:', trackingRecord);
            console.log('💾 Total tracking records:', trackingData.length);
            
        } catch (error) {
            console.error('Error saving tracking data to localStorage:', error);
        }
    }

    // ===== DEMO DETAILS MODAL =====

    openDemosModal(stationData) {
        const modal = document.getElementById('demo-details-modal');
        if (!modal) return;
        
        // Clear existing inputs
        const opalContainer = document.getElementById('opal-demo-inputs');
        const scanContainer = document.getElementById('scan-demo-inputs');
        if (opalContainer) opalContainer.innerHTML = '';
        if (scanContainer) scanContainer.innerHTML = '';

        // Prefill placeholders based on counts
        const opalCount = stationData.opal_demos || 0;
        const scanCount = stationData.scan_demos || 0;
        for (let i = 0; i < opalCount; i++) {
            this.addDemoInput('opal-demo-inputs', '');
        }
        for (let i = 0; i < scanCount; i++) {
            this.addDemoInput('scan-demo-inputs', '');
        }

        modal.style.display = 'block';
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.transition = 'all 0.3s ease-out';
            modal.style.opacity = '1';
            const adder = document.getElementById('opal-demo-adder');
            if (adder) adder.focus();
        }, 10);
        document.body.style.overflow = 'hidden';
    }

    closeDemosModal() {
        const modal = document.getElementById('demo-details-modal');
        if (!modal) return;
        modal.style.transition = 'all 0.3s ease-in';
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 300);
    }

    addDemoInput(containerId, value) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.alignItems = 'center';
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Enter number';
        input.value = value || '';
        input.style.flex = '1';
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Move to next row if exists, else create new row and move to it
                const rows = Array.from(container.children);
                const index = rows.indexOf(row);
                if (index >= 0 && index < rows.length - 1) {
                    const nextInput = rows[index + 1].querySelector('input');
                    if (nextInput) nextInput.focus();
                } else {
                    const newRow = this.addDemoInput(containerId, '');
                    const newInput = newRow && newRow.querySelector ? newRow.querySelector('input') : null;
                    if (newInput) newInput.focus();
                }
            }
        });
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '×';
        removeBtn.style.width = '32px';
        removeBtn.style.height = '32px';
        removeBtn.className = 'counter-btn';
        removeBtn.addEventListener('click', () => row.remove());
        row.appendChild(input);
        row.appendChild(removeBtn);
        container.appendChild(row);
        // Auto-focus when created with a value (from adder inputs)
        if (value) {
            setTimeout(() => input.focus(), 0);
        }
        return row;
    }

    finalizeDemosAndSave() {
        if (!this._pendingSave) {
            this.closeDemosModal();
            return;
        }
        const { base, userName, stationEl } = this._pendingSave;
        // Collect arrays
        const collect = (containerId) => {
            const container = document.getElementById(containerId);
            if (!container) return [];
            const values = [];
            container.querySelectorAll('input[type="text"]').forEach(inp => {
                const v = (inp.value || '').trim();
                if (v) values.push(v);
            });
            return values;
        };
        const opalNums = collect('opal-demo-inputs');
        const scanNums = collect('scan-demo-inputs');

                const merged = {
             ...base,
             opal_demo_numbers: opalNums,
             scan_demo_numbers: scanNums,
             opal_demos: Array.isArray(opalNums) ? opalNums.length : (base.opal_demos || 0),
             scan_demos: Array.isArray(scanNums) ? scanNums.length : (base.scan_demos || 0)
         };

        // Save enriched data to TRinfo (await with fallback)
        (async () => {
            try {
                const res = await fetch('/save_trinfo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ ...merged, username: userName })
                });
                if (!res.ok) throw new Error('save_trinfo failed');
            } catch (e) {
                try {
                    await fetch('/save_tracking_data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ ...merged, username: userName })
                    });
                } catch (ignore) {}
            }

            // Also upsert demos to unified Demos table for commission calculations
            try {
                const totalDemos = (Array.isArray(merged.opal_demo_numbers) ? merged.opal_demo_numbers.length : (merged.opal_demos || 0))
                                 + (Array.isArray(merged.scan_demo_numbers) ? merged.scan_demo_numbers.length : (merged.scan_demos || 0));
                await fetch('/api/demos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ user_id: merged.user_id, date: merged.date, demos: totalDemos, source: 'manual' })
                });
            } catch (ignore) {}
        })();

        // Local storage
        this.saveTrackingDataLocally(merged, userName);

        // Remove station, close modal, notify
        this.removeStationAutomatically(stationEl);
        this.closeDemosModal();
        this.showSuccessMessage(`Tracking data saved successfully for ${userName} on ${merged.date}!`);

        // Cleanup
        this._pendingSave = null;
    }

    // ===== STATION PERSISTENCE =====

    saveTrackingStations() {
        const stations = [];
        document.querySelectorAll(".tracking-station").forEach(station => {
            const userDropdown = station.querySelector(".user-dropdown");
            const userId = userDropdown ? userDropdown.value : "";
            const username = userDropdown && userDropdown.selectedIndex >= 0 ? 
                          userDropdown.options[userDropdown.selectedIndex].textContent : "";

            stations.push({
                userId,
                username,
                date: new Date().toISOString().split('T')[0],
                opalDemos: parseInt(station.querySelector("input[data-input='opal_demos']").value) || 0,
                opalSales: parseInt(station.querySelector("input[data-input='opal_sales']").value) || 0,
                scanDemos: parseInt(station.querySelector("input[data-input='scan_demos']").value) || 0,
                scanSold: parseInt(station.querySelector("input[data-input='scan_sold']").value) || 0
            });
        });

        // Deduplicate and save
        const uniqueStations = this.deduplicateStations(stations);
        localStorage.setItem("trackingStations", JSON.stringify(uniqueStations));
    }

    deduplicateStations(stations) {
        const uniqueStations = [];
        const seenKeys = new Set();
        
        stations.forEach(station => {
            const key = `${station.userId}-${station.date}-${station.opalDemos}-${station.opalSales}-${station.scanDemos}-${station.scanSold}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueStations.push(station);
            }
        });
        
        return uniqueStations;
    }

    async loadTrackingStations() {
        const stations = JSON.parse(localStorage.getItem("trackingStations")) || [];
        const container = document.getElementById("tracking-stations");
        container.innerHTML = "";

        console.log(`🔄 Loading ${stations.length} saved tracking stations...`);

        for (const stationData of stations) {
            const station = document.createElement("div");
            station.classList.add("tracking-station");
            station.innerHTML = this.getLoadedStationHTML(stationData);
            container.prepend(station);
            
            // Load fresh user data for each station
            await this.loadUserDropdown(station.querySelector(".user-dropdown"));
            station.querySelector(".user-dropdown").value = stationData.userId;
            this.setupStationEventListeners(station);
        }
        
        console.log(`✅ Loaded ${stations.length} tracking stations with location-filtered users`);
    }

    getLoadedStationHTML(stationData) {
        return `
            <div class="station-header">
                <div class="station-title">
                    <i class="fas fa-chart-line"></i>
                    Performance Station
                </div>
                <div class="station-subtitle">Track sales metrics</div>
            </div>
            
            <div class="sales-rep-container">
                <label class="sales-rep-label">Sales Representative</label>
                <select class="user-dropdown">
                    <option value="">Select Sales Rep</option>
                </select>
            </div>
            
            <div class="question-container">
                <div class="question-row">
                    <label>Opal Demos</label>
                    <div class="counter-controls">
                        <button class="counter-btn" onclick="tracking.changeValue(this, -1)">−</button>
                        <input type="number" min="0" value="${stationData.opalDemos}" class="data-input" data-input="opal_demos">
                        <button class="counter-btn" onclick="tracking.changeValue(this, 1)">+</button>
                    </div>
                </div>
                <div class="question-row">
                    <label>Opal Sales</label>
                    <div class="counter-controls">
                        <button class="counter-btn" onclick="tracking.changeValue(this, -1)">−</button>
                        <input type="number" min="0" value="${stationData.opalSales}" class="data-input" data-input="opal_sales">
                        <button class="counter-btn" onclick="tracking.changeValue(this, 1)">+</button>
                    </div>
                </div>
                <div class="question-row">
                    <label>Scan Demos</label>
                    <div class="counter-controls">
                        <button class="counter-btn" onclick="tracking.changeValue(this, -1)">−</button>
                        <input type="number" min="0" value="${stationData.scanDemos}" class="data-input" data-input="scan_demos">
                        <button class="counter-btn" onclick="tracking.changeValue(this, 1)">+</button>
                    </div>
                </div>
                <div class="question-row">
                    <label>Scan Sold</label>
                    <div class="counter-controls">
                        <button class="counter-btn" onclick="tracking.changeValue(this, -1)">−</button>
                        <input type="number" min="0" value="${stationData.scanSold}" class="data-input" data-input="scan_sold">
                        <button class="counter-btn" onclick="tracking.changeValue(this, 1)">+</button>
                    </div>
                </div>
            </div>
            
            <div class="station-footer">
                <button class="save-btn" onclick="tracking.openSimpleModal(this)">
                    <i class="fas fa-save"></i> Save & Finish
                </button>
                <button class="remove-btn" onclick="tracking.removeStation(this)">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
    }

    // ===== USER CONFIRMATION =====

    showUserConfirmation(username) {
        if (!username || username.trim() === '') {
            username = "Sales Rep";
        }
        
        const confirmationMessage = document.getElementById("confirmation-message");
        confirmationMessage.textContent = `Hello ${username}, Good Luck Today! 😊

Did you finish all Morning/Midday/Closing Procedures and test the camera?

If Yes, your shift will start. If No, please complete the procedures before starting.`;
        
        document.getElementById("user-confirmation-modal").style.display = "flex";
    }

    confirmUserSelection() {
        document.getElementById("user-confirmation-modal").style.display = "none";
        this.saveTrackingStations();
    }

    cancelUserSelection() {
        if (currentUserDropdown) {
            currentUserDropdown.value = previousUserValue || "";
        }
        document.getElementById("user-confirmation-modal").style.display = "none";
    }

    // ===== UTILITY FUNCTIONS =====

    initializeStorageIfNeeded() {
        const requiredKeys = ["trackingStations", "trackingData", "users"];
        requiredKeys.forEach(key => {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
                console.log(`🔧 Initialized empty array for ${key}`);
            }
        });
    }

    debugSavedData() {
        console.log("==== TRACKING DEBUG ====");
        const keys = ["trackingStations", "trackingData", "users"];
        
        keys.forEach(key => {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    console.log(`${key}: ${parsed.length} entries`);
                    if (parsed.length > 0) {
                        console.log("Sample:", parsed[0]);
                    }
                } else {
                    console.log(`${key}: Empty`);
                }
            } catch (error) {
                console.error(`Error accessing ${key}:`, error);
            }
        });
        console.log("==== END DEBUG ====");
    }

    createParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;
        
        const numberOfParticles = 25;
        
        for (let i = 0; i < numberOfParticles; i++) {
            this.createSingleParticle(particlesContainer);
        }
    }

    createSingleParticle(container) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 15 + 5;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.opacity = Math.random() * 0.6 + 0.1;
        
        const duration = Math.random() * 15 + 15;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        
        container.appendChild(particle);
        
        // Recreate particle when it expires
        setTimeout(() => {
            particle.remove();
            this.createSingleParticle(container);
        }, duration * 1000);
    }
}

// ===== GLOBAL FUNCTIONS FOR HTML COMPATIBILITY =====

// Initialize tracking system
const tracking = new TrackingSystem();

// Global functions for onclick handlers
window.addTrackingStation = () => tracking.addTrackingStation();
window.confirmUserSelection = () => tracking.confirmUserSelection();
window.cancelUserSelection = () => tracking.cancelUserSelection();
window.saveSimpleData = () => tracking.saveSimpleData();
window.closeSimpleModal = () => tracking.closeSimpleModal();
window.addDemoInput = (id, v) => tracking.addDemoInput(id, v);
window.closeDemosModal = () => tracking.closeDemosModal();
window.saveDemosData = () => tracking.finalizeDemosAndSave();

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrackingSystem;
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    console.log("🎯 MonuMe Tracking System Ready!");
}); 