# MonuMe Tracker - AI Agent Instructions

## Architecture Overview

MonuMe Tracker is a **multi-tenant business management system** built with Flask + SQLite + vanilla JavaScript. Key architectural patterns:

- **Dual Authentication**: Both user-based (`admin`/`manager`/`employee`) and location-based login systems
- **Role-Based Access Control**: Admin sees all data, managers see location-specific data, employees see filtered views
- **Multi-Server Architecture**: Primary `server.py` (4000+ lines) + separate `appointment_server.py` for scheduling
- **Static-First Frontend**: All UI in `/static/` folder with modular JavaScript components

## Critical Development Workflows

### Server Management
```bash
# Development
python server.py                     # Dev server on port 5000
python deploy.py                     # Production with Waitress
start_production.bat                 # Windows production script

# Database reset/init
python init_db.py                    # Initialize SQLite schema
python reset_database.py             # Reset with sample data
```

### Multi-Tenant Authentication Pattern
```javascript
// Two login types handled in session:
session['login_type'] = 'user' | 'location'

// Frontend auth check pattern (locations-location.js):
async function checkBackendAuthentication() {
    const response = await fetch('/get_current_user');
    // Falls back to localStorage if backend session expired
}
```

### Database Connection Pattern
```python
# server.py - Always use this pattern:
def get_db_connection():
    conn = sqlite3.connect('monume.db', timeout=20)
    conn.row_factory = sqlite3.Row
    return conn

# Always close connections:
try:
    conn = get_db_connection()
    # ... database operations
finally:
    conn.close()
```

## Project-Specific Conventions

### JavaScript Module Organization
- **Page-specific**: `locations-location.js`, `users.js`, `analytics.js`
- **Component-specific**: `form-editor.js`, `modal-helper.js`, `notification_system.js`
- **Feature enhancement**: `enhanced-*.js` files for incremental improvements

### Form Submission Pattern
```javascript
// Standard pattern in all forms:
form.addEventListener('submit', async function(e) {
    e.preventDefault(); // ALWAYS prevent default
    console.log('🚀 Function called'); // Use emoji logging
    
    // Validation before server call
    if (!requiredField) {
        showNotification('Error message', 'error');
        return;
    }
    
    // Server interaction
    const response = await fetch('/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
});
```

### Error Handling & Logging
```python
# server.py - Consistent error pattern:
try:
    # Database operations
    return jsonify({"message": "Success"}), 200
except sqlite3.Error as db_error:
    logger.error(f"Database error: {db_error}")
    return jsonify({"error": f"Database error: {db_error}"}), 500
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    return jsonify({"error": f"Unexpected error: {e}"}), 500
```

### Modal System Architecture
Uses custom modal system with stacking support. Always check `MODAL_STACKING_README.md` before modifying modals.

## Integration Points & Data Flow

### Session-Database Bridge
```python
# Authorization decorators (server.py):
@admin_required    # Only admin users
@manager_required  # Manager or admin users

# Location filtering pattern:
if session.get('login_type') == 'location':
    location_id = session.get('location_id')
    # Filter all queries by location_id
```

### Frontend-Backend State Sync
```javascript
// Dual state management pattern:
// 1. Backend session via /get_current_user
// 2. localStorage fallback for offline resilience
function setCurrentUserFromBackend(userData) {
    // Update global variables
    currentUserRole = userData.role;
    isCurrentUserAdmin = userData.role === 'admin';
    
    // Sync to localStorage
    localStorage.setItem('role', currentUserRole);
}
```

### Form Builder System
- Forms stored as JSON in `forms` table with `questions` field
- Dynamic rendering in `form-editor.js` and `edit_form.js`
- Form responses collected separately in `form_responses` table

## Key Files to Understand

- **`server.py`**: Main application server, authentication, all API endpoints
- **`init_db.py`**: Database schema definition and sample data
- **`static/js/locations-location.js`**: Multi-tenant location management
- **`static/dashboard.html`**: Main admin interface with embedded JavaScript
- **`deploy.py`**: Production deployment with environment detection

## Testing & Debugging

### Database Inspection
```python
# Use check_db.py or check_db_schema.py for schema validation
python check_db.py  # Quick database status check
```

### Frontend Debugging
All JavaScript uses emoji-based console logging (`🚀`, `✅`, `❌`) for easy filtering. Check browser console for detailed form submission flows.

### Common Issues
- **Modal conflicts**: Check `modal-conflict-detector.js` output
- **Authentication loops**: Verify both backend session AND localStorage state
- **Form submission failures**: Always check `e.preventDefault()` is called first
- **Location filtering**: Ensure `location_id` is properly set in session

## Environment Configuration

Production deployment auto-detects based on domain (`monumevip.com`, `herokuapp.com`) or `PRODUCTION=true` env var. SSL certificates configurable via `SSL_CERT`/`SSL_KEY` environment variables.
