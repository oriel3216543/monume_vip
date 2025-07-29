# Force Out User Test Guide

## 🧪 **Testing the Force Out Functionality**

The Force Out User modal dropdown should now properly load admin and manager users dynamically from the users database.

### **Quick Test Commands**

Open the dashboard at: **http://localhost:8000/dashboard.html**

Open browser console (F12) and run these commands:

```javascript
// 1. Check users data
debugUsers()

// 2. Test force-out functionality 
testForceOut()
```

### **Manual Testing Steps**

1. **Login as any user** (admin, manager, etc.)

2. **Add some active users:**
   - Click "Start Session" 
   - Select a user and enter their password
   - Repeat to add multiple active users

3. **Test Force-Out:**
   - Click "View Active Users"
   - Click the red "Force Out" button next to any active user
   - **Verify the dropdown is populated** with admin/manager options

4. **Expected Dropdown Options:**
   - System Administrator (admin) - Password: `ori3`
   - Location Manager (manager) - Password: `manager`
   - Emma Davis (manager) - Password: `manager123`

### **What Was Fixed**

✅ **Dynamic Dropdown Population:** The `populateAdminSelect()` function now:
- Reads actual users from localStorage 
- Filters for admin and manager roles
- Dynamically creates dropdown options
- Creates default admin users if none exist

✅ **Removed Duplicates:** 
- Consolidated multiple debug functions
- Removed complex retry logic
- Simplified user initialization

✅ **No Auto-Activation:**
- Removed automatic admin user activation
- Users must manually start sessions

### **Available Admin Credentials**

| Username | Role | Password | Location |
|----------|------|----------|----------|
| admin | admin | ori3 | all |
| manager | manager | manager | Location1 |
| manager2 | manager | manager123 | Location2 |

### **Console Commands for Testing**

```javascript
// Debug user data
debugUsers()

// Test force-out with active user
testForceOut()

// Check current users
JSON.parse(localStorage.getItem('users'))

// Check active users  
JSON.parse(localStorage.getItem('activeUsers'))
```

### **Expected Behavior**

1. Force-out modal opens with populated dropdown
2. All admin/manager users appear as options
3. Password verification works correctly
4. User is removed from active list on success
5. Success message displays

### **Troubleshooting**

If dropdown is empty:
1. Run `debugUsers()` to check if admin users exist
2. Check browser console for any errors
3. Verify you're testing with an admin/manager account

The system now guarantees admin users exist and the dropdown will populate correctly! 🎉 