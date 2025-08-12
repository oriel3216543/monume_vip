# MonuMe Tracker - Quick Start Guide

## ✅ System Enhancement Complete!

Your MonuMe Tracker system now includes:

### 🔧 **Clean URLs (No .html extensions)**
- `/users` instead of `/users.html`
- `/locations` instead of `/locations.html`
- `/dashboard` instead of `/dashboard.html`

### 🌐 **Unique Location URLs**
- Each location gets its own unique URL: `/location/{location-name}`
- Example: Creating "Downtown Spa" generates `/location/downtown-spa`

### 🚀 **Complete API Integration**
- All CRUD operations working for users and locations
- Enhanced error handling and validation
- **Location-based access control** (locations see only their data)

## 🔐 **Authentication Model**

### **Who Can Log In:**
- **🏢 Locations**: Each location has its own username and password
- **👑 Admin**: System administrator with full access
- **❌ Regular Users**: Cannot log in directly (managed by admin/locations)

### **Access Control:**
- **🏢 Locations**: Can only see and manage their own data across all pages
- **👑 Admin**: Can see and manage all data from all locations
- **📊 Data Isolation**: Each location's data is completely isolated from others

## 🏃‍♂️ **Quick Start Instructions**

### 1. Start the Server
```bash
cd MonuMe_Tracker
python server.py
```

### 2. Login Options
- **Admin Login**: http://localhost:5000/login
  - Username: `admin`
  - Password: `ori3` (or your admin password)
  - **Result**: Access to all locations and system-wide data

- **Location Login**: http://localhost:5000/login
  - Username: `{location_username}` (e.g., downtown_spa)
  - Password: `{location_password}` (set during location creation)
  - **Result**: Access only to that location's data

### 3. Admin: Create Locations
1. **Login as Admin** → Go to http://localhost:5000/locations
2. Click "Create New Location"
3. Fill in the form:
   - **Location Name**: Downtown Spa
   - **Mall/Area**: Downtown Mall
   - **Location Username**: downtown_spa *(this is the login username)*
   - **Location Password**: secure123 *(this is the login password)*
4. Click "Create Location"
5. **Result**: 
   - Location created with unique URL `/location/downtown-spa`
   - Location can now log in with `downtown_spa` / `secure123`

### 4. Admin: Manage Users for Locations
1. Go to http://localhost:5000/users
2. Click "Add New User"
3. Create users and assign them to specific locations
4. **Note**: These users are managed by admin/locations, they cannot log in directly

### 5. Location: Access Own Data
1. **Login as Location** using location credentials
2. **Access Pages**:
   - **Dashboard**: http://localhost:5000/dashboard *(shows only this location's data)*
   - **Users**: http://localhost:5000/users *(shows only users assigned to this location)*
   - **Appointments**: http://localhost:5000/appointments *(shows only this location's appointments)*
   - **All Pages**: Automatically filtered to show only this location's data

## 🎯 **Key Features Implemented**

### ✅ **Location-Based Authentication**
- Each location has unique login credentials (username/password)
- Locations can only access their own data across all system pages
- Complete data isolation between locations

### ✅ **Admin Full Access**
- Admin can see and manage all locations
- Admin can view all data across all locations
- Admin can create/edit/delete locations and users

### ✅ **Data Isolation**
- **Location View**: All HTML pages show only that location's data
- **Admin View**: All HTML pages show data from all locations
- **Automatic Filtering**: System automatically applies location-based filters

### ✅ **Complete API Endpoints**

#### Authentication
- **Location Login**: Uses location_username and location_password
- **Admin Login**: Uses admin credentials
- **No Regular User Login**: Users are managed entities, not login accounts

#### Locations API (Admin Only)
- `GET /api/locations` - List all locations (admin only)
- `POST /add_location` - Create location with login credentials
- `PUT /update_location` - Update location details/credentials
- `DELETE /remove_location` - Delete location (admin only)

#### Users API (Admin + Locations)
- `GET /api/users` - List users (filtered by location for location logins)
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/{id}` - Update user (admin only)
- `DELETE /api/users/{id}` - Delete user (admin only)

### ✅ **Enhanced Frontend Features**
- **Location-Filtered Views**: All pages automatically show relevant data
- **Role-Based UI**: Different interface elements based on login type
- **Data Isolation**: Complete separation of location data

## 🔒 **Security Features**

### ✅ **Authentication & Authorization**
- **Location-Based Authentication**: Each location has unique credentials
- **Admin-Only Operations**: User management, location creation/deletion
- **Data Access Control**: Locations cannot see other locations' data

### ✅ **Access Control Rules**
- **Locations Can**:
  - View their own dashboard, users, appointments, tracking data
  - Access their unique location URL `/location/{name}`
  - Manage their own location's data (view only, editing depends on permissions)

- **Locations Cannot**:
  - See other locations' data
  - Create/delete users (admin function)
  - Access admin-only features
  - View system-wide statistics

- **Admin Can**:
  - See all data from all locations
  - Create/edit/delete locations
  - Manage users across all locations
  - Access all system features

## 📋 **Testing Checklist**

### ✅ **Authentication Testing**
- [ ] Admin login works with admin credentials
- [ ] Location login works with location credentials
- [ ] Regular users cannot log in directly
- [ ] Location sees only their data after login
- [ ] Admin sees all data after login

### ✅ **Data Isolation Testing**
- [ ] Location A cannot see Location B's data
- [ ] Dashboard shows only relevant location data
- [ ] User lists are filtered by location
- [ ] Appointments are filtered by location
- [ ] Admin sees data from all locations

### ✅ **Location Management (Admin Only)**
- [ ] Create new location with login credentials
- [ ] Verify unique URL is generated
- [ ] Edit location credentials
- [ ] Delete location (admin password required)
- [ ] Test location login after creation

### ✅ **User Management**
- [ ] Admin can create users for any location
- [ ] Users are assigned to specific locations
- [ ] Location login shows only assigned users
- [ ] Admin shows users from all locations

## 🐛 **Troubleshooting**

### **Location Cannot Log In**
1. Check location username/password are correct
2. Verify location is active in database
3. Ensure using location credentials, not user credentials
4. Check server logs for authentication errors

### **Wrong Data Showing**
- **If location sees other location's data**: Check session/authentication
- **If admin doesn't see all data**: Verify admin role assignment
- **If data appears missing**: Check location assignment of data

### **Access Denied Errors**
- **Location trying admin functions**: Normal behavior, locations have limited access
- **Admin access denied**: Check admin authentication status
- **Cannot access location URL**: Verify location exists and user has permission

## 📞 **Support**

### **Debug Information**
- **Server logs**: `logs/server.log`
- **Check authentication**: Browser console → `localStorage.getItem('role')`
- **Verify location assignment**: Check database location_id fields

### **Authentication Flow**
1. **Login Attempt** → Server checks credentials against locations or admin
2. **Session Creation** → Role and location_id stored in session
3. **Data Filtering** → All API calls filtered by user's location/role
4. **Page Access** → UI shows only permitted data

## 🎉 **Success!**

Your MonuMe Tracker system now features:
- ✅ **Location-Based Authentication**: Each location has unique login
- ✅ **Complete Data Isolation**: Locations see only their data
- ✅ **Admin Full Control**: Admin manages everything
- ✅ **Secure Multi-Tenant System**: Perfect for multi-location businesses
- ✅ **Professional URLs**: Clean, unique URLs for each location

**Ready for multi-location deployment!**

### **Login Summary**
- **🏢 Location Logins**: `location_username` / `location_password` → See only own data
- **👑 Admin Login**: `admin` / `ori3` → See all data, manage everything
- **📊 Data Access**: Automatically filtered based on login type 