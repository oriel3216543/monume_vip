# MonuMe Tracker - Domain Deployment Guide for www.monumevip.com

## 🚀 Production Deployment Checklist

### 1. Server Configuration ✅

The server is properly configured for production with:
- **Domain**: www.monumevip.com
- **Port**: 5000 (internal), 443/80 (external via nginx)
- **SSL**: HTTPS enabled via nginx
- **Security Headers**: Properly configured
- **CORS**: Domain-specific access control

### 2. Environment Variables

Set these environment variables for production:

```bash
export DOMAIN=www.monumevip.com
export PRODUCTION=true
export PORT=5000
export SECRET_KEY=your_secure_secret_key_here
```

### 3. Nginx Configuration ✅

The nginx configuration (`nginx_monumevip.conf`) is properly set up:
- HTTP to HTTPS redirect
- SSL certificate configuration
- Proxy to Flask app on port 5000
- Security headers
- Static file caching
- CORS handling for email endpoints

### 4. Database Setup ✅

The database is properly configured with:
- User management with role-based access
- Location-based data filtering
- Admin and manager permissions
- User authentication system

### 5. Location-Based Access Control ✅

All management features now support location-based access:

#### Users Management (`users.js`)
- **Admins**: See all users across all locations
- **Managers**: See only users from their location
- **Employees**: No access to user management

#### Email Management (`emails-location.js`)
- **Admins**: Manage all email settings
- **Managers**: Manage email settings for their location
- **Employees**: View-only access

#### Location Management (`locations-location.js`)
- **Admins**: Full access to all locations
- **Managers**: View-only access to their location
- **Employees**: No access

### 6. Production Startup

Use the production startup script:

```bash
# Windows
start_production.bat

# Linux/Mac
python server.py
```

### 7. SSL Certificate Setup

Ensure SSL certificates are properly configured:

```bash
# Install Let's Encrypt certificates
sudo certbot --nginx -d monumevip.com -d www.monumevip.com

# Verify certificate renewal
sudo certbot renew --dry-run
```

### 8. Firewall Configuration

Ensure ports are open:
```bash
# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow internal Flask port (if needed)
sudo ufw allow 5000
```

### 9. Testing Checklist

#### ✅ User Authentication
- [ ] Login works with proper role assignment
- [ ] Session management works correctly
- [ ] Logout clears sessions properly

#### ✅ Location-Based Access
- [ ] Admins can see all users and locations
- [ ] Managers see only their location's data
- [ ] Employees have appropriate restrictions

#### ✅ User Management
- [ ] Add new users works
- [ ] Edit user details works
- [ ] Delete users works
- [ ] Role assignment works
- [ ] Location assignment works

#### ✅ Email System
- [ ] Email configuration works
- [ ] Test emails can be sent
- [ ] Email templates work
- [ ] Gift card emails work

#### ✅ Appointment System
- [ ] Create appointments works
- [ ] Edit appointments works
- [ ] Delete appointments works
- [ ] Status updates work
- [ ] Email notifications work

### 10. Monitoring and Logs

Monitor the application:
```bash
# Check server logs
tail -f server_logs.txt

# Check nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
```

### 11. Backup Strategy

Set up regular backups:
```bash
# Database backup
cp monume.db monume.db.backup.$(date +%Y%m%d_%H%M%S)

# Configuration backup
tar -czf config_backup_$(date +%Y%m%d).tar.gz *.conf *.ini
```

### 12. Performance Optimization

The application includes:
- Static file caching via nginx
- Database connection pooling
- Optimized queries with location filtering
- Efficient session management

### 13. Security Features

- ✅ HTTPS enforcement
- ✅ Security headers (CSP, XSS protection, etc.)
- ✅ Session security
- ✅ Role-based access control
- ✅ Location-based data isolation
- ✅ Input validation and sanitization

### 14. Troubleshooting

#### Common Issues:

1. **Port 5000 already in use**
   ```bash
   sudo lsof -i :5000
   sudo kill -9 <PID>
   ```

2. **SSL certificate issues**
   ```bash
   sudo certbot --nginx -d monumevip.com -d www.monumevip.com
   sudo systemctl reload nginx
   ```

3. **Database connection issues**
   ```bash
   python init_db.py
   ```

4. **Permission issues**
   ```bash
   sudo chown -R www-data:www-data /path/to/monume
   sudo chmod -R 755 /path/to/monume
   ```

### 15. Deployment Commands

```bash
# Start production server
cd MonuMe_Tracker
python server.py

# Or use the batch file (Windows)
start_production.bat

# Check if server is running
curl -I https://www.monumevip.com

# Test API endpoints
curl https://www.monumevip.com/health
```

### 16. Final Verification

After deployment, verify:
- [ ] https://www.monumevip.com loads correctly
- [ ] All static files load (CSS, JS, images)
- [ ] Login system works
- [ ] User management works for admins
- [ ] Location-based access works for managers
- [ ] Email system works
- [ ] Appointment system works
- [ ] SSL certificate is valid
- [ ] No console errors in browser

## 🎉 Success!

Your MonuMe Tracker is now properly configured and deployed for www.monumevip.com with full location-based access control and production-ready security features.