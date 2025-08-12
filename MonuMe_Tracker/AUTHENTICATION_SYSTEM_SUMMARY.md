# MonuMe Tracker Authentication System

## Overview

The MonuMe Tracker now has a comprehensive authentication system that supports both admin users and location-specific users. The system uses Flask sessions for backend authentication and localStorage for frontend consistency.

## Authentication Types

### 1. Admin Authentication
- **Username**: `admin`
- **Password**: `monume2024`
- **Role**: `admin`
- **Access**: Full system access, can manage all locations and users

### 2. Location Authentication
- **Type**: Location-specific credentials
- **Role**: `location`
- **Access**: Limited to specific location operations

## How Authentication Works

### Backend (Flask Sessions)
1. User submits login credentials via `/login` endpoint
2. Server validates credentials against database
3. If valid, server creates Flask session with user data
4. Session includes: user_id, username, role, location_id, login_type
5. Session is used for all subsequent requests

### Frontend (localStorage)
1. After successful login, frontend stores authentication data in localStorage
2. localStorage is used for UI state management and consistency
3. Frontend checks authentication status on page load
4. If not authenticated, redirects to login page

## Key Endpoints

### Authentication Endpoints
- `POST /login` - User login (admin or location)
- `POST /logout` - User logout
- `GET /get_current_user` - Get current authenticated user

### Admin-Only Endpoints
- `POST /add_location` - Add new location
- `POST /remove_location` - Delete location
- `POST /update_location` - Update location
- `GET /get_locations` - Get all locations

### Location-Specific Endpoints
- `GET /api/location/users` - Get users for current location
- `POST /api/location/users` - Create user for current location
- `PUT /api/location/users/<id>` - Update user for current location
- `DELETE /api/location/users/<id>` - Delete user for current location

## Authentication Decorators

### @admin_required
- Checks if user has admin role
- Returns 403 error if not admin
- Used for admin-only endpoints

### @manager_required
- Checks if user has admin or manager role
- Returns 403 error if not authorized
- Used for manager-level endpoints

## Frontend Authentication Flow

### 1. Login Process
```javascript
// Admin login
fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'admin',
        password: 'monume2024',
        login_type: 'user'
    })
})

// Location login
fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'location_username',
        password: 'location_password',
        login_type: 'location'
    })
})
```

### 2. Authentication Check
```javascript
// Check backend authentication
async function checkBackendAuthentication() {
    const response = await fetch('/get_current_user');
    if (response.ok) {
        const userData = await response.json();
        setCurrentUserFromBackend(userData);
        return true;
    } else {
        window.location.href = '/';
        return false;
    }
}
```

### 3. localStorage Storage
```javascript
// Store authentication data
localStorage.setItem('username', userData.username);
localStorage.setItem('role', userData.role);
localStorage.setItem('location_id', userData.location_id);
localStorage.setItem('isAdmin', userData.role === 'admin');
localStorage.setItem('isLoggedIn', 'true');
localStorage.setItem('login_type', userData.login_type);
```

## Security Features

### 1. Session Management
- Flask sessions with secure secret key
- Session timeout and cleanup
- CSRF protection

### 2. Role-Based Access Control
- Admin users can access all features
- Location users are restricted to their location
- Manager users have limited admin access

### 3. Authentication Validation
- All protected endpoints check authentication
- Unauthorized access returns 403 error
- Automatic redirect to login for unauthenticated users

## Usage Instructions

### For Administrators
1. Go to `/` (login page)
2. Select "Admin Login" tab
3. Enter username: `admin`, password: `monume2024`
4. Click "Access Admin Dashboard"
5. You'll be redirected to `/dashboard.html`

### For Location Users
1. Go to `/` (login page)
2. Select "Location Login" tab
3. Enter location-specific credentials
4. Click "Access Location Dashboard"
5. You'll be redirected to `/location-dashboard.html`

## Troubleshooting

### Common Issues

#### 1. "Admin access required" Error
- **Cause**: User is not logged in as admin
- **Solution**: Log in with admin credentials (admin/monume2024)

#### 2. "Not authenticated" Error
- **Cause**: Session expired or invalid
- **Solution**: Log out and log back in

#### 3. "Location authentication required" Error
- **Cause**: Trying to access location-specific endpoint without location login
- **Solution**: Log in with location credentials

#### 4. Database Connection Issues
- **Cause**: Database file corrupted or missing
- **Solution**: Run `python init_db.py` to recreate database

### Fix Commands

```bash
# Fix admin authentication
python fix_admin_authentication.py

# Test authentication system
python test_authentication_system.py

# Recreate database
python init_db.py
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    name TEXT,
    role TEXT DEFAULT 'employee',
    location_id INTEGER,
    created_by_location_id INTEGER,
    FOREIGN KEY (location_id) REFERENCES locations (id)
);
```

### Locations Table
```sql
CREATE TABLE locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_name TEXT NOT NULL,
    mall TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'active',
    description TEXT,
    location_username TEXT UNIQUE,
    location_password TEXT,
    is_active INTEGER DEFAULT 1
);
```

## Testing

The authentication system includes comprehensive tests:

1. **Admin Login Test**: Verifies admin can log in
2. **Admin Actions Test**: Verifies admin can perform admin-only actions
3. **Location Login Test**: Verifies location users can log in
4. **Location Actions Test**: Verifies location users can perform location-specific actions
5. **Authorization Test**: Verifies unauthorized access is blocked
6. **Logout Test**: Verifies logout functionality

Run tests with:
```bash
python test_authentication_system.py
```

## Summary

The authentication system is now fully functional and provides:

✅ **Secure admin authentication** with role-based access control  
✅ **Location-specific authentication** for multi-tenant support  
✅ **Session-based backend authentication** with Flask sessions  
✅ **localStorage-based frontend consistency**  
✅ **Comprehensive authorization decorators**  
✅ **Automatic redirect for unauthenticated users**  
✅ **Proper error handling and user feedback**  

The system ensures that admin users can manage all locations and users, while location users are restricted to their specific location's operations. 