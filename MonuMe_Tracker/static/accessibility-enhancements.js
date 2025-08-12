// Accessibility Enhancements for MonuMe Tracker
// This script adds accessibility features to the appointment system

document.addEventListener('DOMContentLoaded', function() {
    console.log('Loading accessibility enhancements');
    
    // Add skip-to-content link
    addSkipLink();
    
    // Enhance keyboard navigation
    enhanceKeyboardNavigation();
    
    // Add ARIA attributes to improve screen reader experience
    addAriaAttributes();
    
    // Add high contrast support
    addContrastSupport();
    
    // Add focus styles
    addFocusStyles();
    
    // Add screen reader announcements for important actions
    setupScreenReaderAnnouncements();
});

// Function to add a skip-to-content link
function addSkipLink() {
    if (!document.querySelector('.skip-link')) {
        const skipLink = document.createElement('a');
        skipLink.className = 'skip-link';
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.setAttribute('aria-label', 'Skip to main content');
        
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // Add ID to the main content area if not present
        const mainContent = document.querySelector('.main-content');
        if (mainContent && !mainContent.id) {
            mainContent.id = 'main-content';
            mainContent.setAttribute('tabindex', '-1');
        }
    }
}

// Function to enhance keyboard navigation
function enhanceKeyboardNavigation() {
    // Make elements focusable and keyboard navigable
    const interactiveElements = [
        '.appointment-card',
        '.calendar-table td[data-date]',
        '.filter-btn',
        '.calendar-nav-btn'
    ];
    
    interactiveElements.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            // Only add if not already set
            if (!el.getAttribute('tabindex')) {
                el.setAttribute('tabindex', '0');
            }
            
            // Add keyboard event listeners for non-button elements
            if (!el.matches('button') && !el.matches('a')) {
                el.addEventListener('keydown', function(e) {
                    // Trigger click on Enter or Space
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        el.click();
                    }
                });
            }
        });
    });
    
    // Make modal navigation easier with keyboard
    document.querySelectorAll('.modal').forEach(modal => {
        // Trap focus within the modal when open
        modal.addEventListener('keydown', function(e) {
            if (e.key !== 'Tab') return;
            
            const focusableElements = modal.querySelectorAll(
                'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
            );
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            // Shift + Tab to go backward
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            // Tab to go forward
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        });
    });
    
    // Auto-focus first field in modals
    document.addEventListener('modalShown', function(e) {
        const modal = document.getElementById(e.detail.modalId);
        if (!modal) return;
        
        setTimeout(() => {
            const firstFocusable = modal.querySelector(
                'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
            );
            
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 100);
    });
}

// Function to add ARIA attributes
function addAriaAttributes() {
    // Add landmark roles
    const landmarks = [
        { selector: '.main-content', role: 'main' },
        { selector: '.appointments-section', role: 'region', label: 'Scheduled Appointments' },
        { selector: '.calendar-section', role: 'region', label: 'Appointment Calendar' },
        { selector: '.page-header', role: 'banner' },
        { selector: '.sidebar', role: 'navigation' },
        { selector: '#notification-container', role: 'alert' }
    ];
    
    landmarks.forEach(landmark => {
        const element = document.querySelector(landmark.selector);
        if (element) {
            if (landmark.role && !element.getAttribute('role')) {
                element.setAttribute('role', landmark.role);
            }
            if (landmark.label && !element.getAttribute('aria-label')) {
                element.setAttribute('aria-label', landmark.label);
            }
        }
    });
    
    // Add necessary ARIA attributes to interactive elements
    const interactiveItems = [
        { selector: '.filter-btn', attributes: { 'aria-pressed': false } },
        { selector: '.calendar-table th', attributes: { 'scope': 'col' } },
        { selector: '.status-badge', attributes: { 'role': 'status' } },
        { selector: '.appointment-card', attributes: { 'role': 'article' } },
        { selector: '.today-badge', attributes: { 'aria-label': 'Today\'s appointment' } }
    ];
    
    interactiveItems.forEach(item => {
        document.querySelectorAll(item.selector).forEach(el => {
            if (item.attributes) {
                Object.entries(item.attributes).forEach(([key, value]) => {
                    if (!el.getAttribute(key)) {
                        el.setAttribute(key, value);
                    }
                });
            }
        });
    });
    
    // Set active filter button state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.setAttribute('aria-pressed', 'false');
            });
            this.setAttribute('aria-pressed', 'true');
        });
    });
    
    // Set default active state
    const activeFilterBtn = document.querySelector('.filter-btn.active');
    if (activeFilterBtn) {
        activeFilterBtn.setAttribute('aria-pressed', 'true');
    }
    
    // Add labels to modals
    document.querySelectorAll('.modal').forEach(modal => {
        if (!modal.getAttribute('aria-modal')) {
            modal.setAttribute('aria-modal', 'true');
        }
        if (!modal.getAttribute('role')) {
            modal.setAttribute('role', 'dialog');
        }
        
        // Find heading to use as label
        const heading = modal.querySelector('h2');
        if (heading && !modal.getAttribute('aria-labelledby')) {
            if (!heading.id) {
                heading.id = `${modal.id}-title`;
            }
            modal.setAttribute('aria-labelledby', heading.id);
        }
    });
}

// Function to add high contrast support
function addContrastSupport() {
    // Create a stylesheet for high contrast mode
    const styleElement = document.createElement('style');
    styleElement.id = 'high-contrast-styles';
    
    styleElement.textContent = `
        @media (forced-colors: active) {
            /* Ensure buttons maintain their look in high contrast mode */
            .btn-primary, .btn-secondary, .btn-outline, .btn-danger,
            .filter-btn, .add-date-btn, .calendar-nav-btn {
                forced-color-adjust: none;
            }
            
            /* Ensure status badges remain visible in high contrast mode */
            .status-badge, .today-badge, .countdown-badge {
                forced-color-adjust: none;
                border: 1px solid;
            }
            
            /* Improve focus indicators */
            *:focus-visible {
                outline: 3px solid;
                outline-offset: 2px;
            }
            
            /* Improve contrast of links */
            a {
                text-decoration: underline;
            }
        }
    `;
    
    document.head.appendChild(styleElement);
}

// Function to add enhanced focus styles
function addFocusStyles() {
    const styleElement = document.createElement('style');
    styleElement.id = 'focus-styles';
    
    styleElement.textContent = `
        /* Enhance keyboard focus styles */
        *:focus-visible {
            outline: 2px solid #6a11cb;
            outline-offset: 2px;
            box-shadow: 0 0 0 4px rgba(106, 17, 203, 0.3);
            position: relative;
            z-index: 10;
        }
        
        /* Button specific focus */
        button:focus-visible, 
        .btn-primary:focus-visible, 
        .btn-secondary:focus-visible, 
        .btn-outline:focus-visible {
            outline: 2px solid white;
            outline-offset: 2px;
            box-shadow: 0 0 0 4px rgba(106, 17, 203, 0.5);
        }
        
        /* Custom focus style for appointment cards */
        .appointment-card:focus-visible {
            transform: translateY(-5px);
            box-shadow: 0 8px 24px rgba(106, 17, 203, 0.3);
            border-left-width: 8px;
        }
        
        /* Custom focus style for calendar cells */
        .calendar-table td:focus-visible {
            transform: scale(1.1);
            z-index: 3;
            box-shadow: 0 0 0 4px rgba(106, 17, 203, 0.5);
        }
    `;
    
    document.head.appendChild(styleElement);
}

// Function to setup screen reader announcements
function setupScreenReaderAnnouncements() {
    // Create an announcement area for screen readers
    if (!document.getElementById('sr-announcer')) {
        const announcer = document.createElement('div');
        announcer.id = 'sr-announcer';
        announcer.className = 'sr-only';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(announcer);
        
        // Add the necessary style
        const style = document.createElement('style');
        style.textContent = `
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Define the announce function
    window.announce = function(message) {
        const announcer = document.getElementById('sr-announcer');
        if (announcer) {
            announcer.textContent = message;
            
            // Clear after a delay to ensure screen readers don't repeat
            setTimeout(() => {
                announcer.textContent = '';
            }, 3000);
        }
    };
    
    // Add announcements to key actions
    const originalShowNotification = window.showNotification;
    if (originalShowNotification) {
        window.showNotification = function(message, type) {
            // Call the original function
            originalShowNotification(message, type);
            
            // Announce to screen readers
            window.announce(message);
        };
    }
    
    // Announce filter changes
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filterText = this.textContent.trim();
            window.announce(`Filtered appointments to show ${filterText}`);
        });
    });
    
    // Announce calendar navigation
    document.getElementById('prev-month')?.addEventListener('click', function() {
        setTimeout(() => {
            const monthLabel = document.getElementById('calendar-month-label')?.textContent;
            if (monthLabel) {
                window.announce(`Navigated to ${monthLabel}`);
            }
        }, 100);
    });
    
    document.getElementById('next-month')?.addEventListener('click', function() {
        setTimeout(() => {
            const monthLabel = document.getElementById('calendar-month-label')?.textContent;
            if (monthLabel) {
                window.announce(`Navigated to ${monthLabel}`);
            }
        }, 100);
    });
    
    // Announce modal openings
    document.addEventListener('modalShown', function(e) {
        const modal = document.getElementById(e.detail.modalId);
        if (!modal) return;
        
        const title = modal.querySelector('h2')?.textContent || 'Dialog';
        window.announce(`${title} dialog opened`);
    });
}

// Add function to check for color contrast issues
function checkColorContrast() {
    const contrastChecker = {
        // Calculate relative luminance
        getLuminance: function(rgb) {
            const sRGB = rgb.map(val => {
                val = val / 255;
                return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
            });
            return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
        },
        
        // Calculate contrast ratio
        getContrastRatio: function(rgb1, rgb2) {
            const lum1 = this.getLuminance(rgb1);
            const lum2 = this.getLuminance(rgb2);
            const brightest = Math.max(lum1, lum2);
            const darkest = Math.min(lum1, lum2);
            return (brightest + 0.05) / (darkest + 0.05);
        },
        
        // Check if contrast is sufficient (4.5:1 for normal text, 3:1 for large text)
        isContrastSufficient: function(rgb1, rgb2, isLargeText = false) {
            const ratio = this.getContrastRatio(rgb1, rgb2);
            return isLargeText ? ratio >= 3 : ratio >= 4.5;
        },
        
        // Convert hex to RGB array
        hexToRgb: function(hex) {
            hex = hex.replace('#', '');
            return [
                parseInt(hex.substring(0, 2), 16),
                parseInt(hex.substring(2, 4), 16),
                parseInt(hex.substring(4, 6), 16)
            ];
        }
    };
    
    // Define color pairs to check
    const colorPairs = [
        { name: 'Primary Button', fg: '#ffffff', bg: '#6a11cb' },
        { name: 'Secondary Button', fg: '#ffffff', bg: '#2575fc' },
        { name: 'Status Badge - Scheduled', fg: '#ffffff', bg: '#2196F3' },
        { name: 'Status Badge - Confirmed', fg: '#ffffff', bg: '#4CAF50' },
        { name: 'Status Badge - Canceled', fg: '#ffffff', bg: '#F44336' }
    ];
    
    // Check each pair
    const results = colorPairs.map(pair => {
        const fgRgb = contrastChecker.hexToRgb(pair.fg);
        const bgRgb = contrastChecker.hexToRgb(pair.bg);
        const ratio = contrastChecker.getContrastRatio(fgRgb, bgRgb);
        const passes = contrastChecker.isContrastSufficient(fgRgb, bgRgb);
        
        return {
            name: pair.name,
            ratio: ratio.toFixed(2),
            passes
        };
    });
    
    // Log results
    console.group('Color Contrast Checks');
    results.forEach(result => {
        if (result.passes) {
            console.log(`✅ ${result.name}: ${result.ratio}:1`);
        } else {
            console.warn(`⚠️ ${result.name}: ${result.ratio}:1 - Fails WCAG AA`);
        }
    });
    console.groupEnd();
    
    return results;
}

// Export functions
window.a11y = {
    announce: window.announce,
    checkColorContrast: checkColorContrast
};
