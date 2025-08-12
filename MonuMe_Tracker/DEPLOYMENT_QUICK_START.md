# 🚀 MonuMe Tracker - Quick Start Deployment Guide

## ✅ Environment Status
Your MonuMe Tracker is **fully configured** and ready for both local development and production deployment!

**Environment Check Results:** ✅ 26/26 items successful

---

## 🔧 Local Development Server (Port 5000)

Perfect for development, testing, and local use.

### Quick Start - Windows
```bash
# Simple one-click start
start_local.bat

# Or manually
python server.py
```

### Access Points
- **Main Dashboard:** http://localhost:5000/static/dashboard.html
- **Team Chat:** http://localhost:5000/static/team_chat.html  
- **Email System:** http://localhost:5000/static/emails.html
- **API Health:** http://localhost:5000/health

### Features Available Locally
- ✅ Full dashboard functionality
- ✅ Team chat with mark read buttons
- ✅ Real-time active users count
- ✅ Email configuration and sending
- ✅ Gift card system
- ✅ Appointment management
- ✅ All recent improvements and fixes

---

## 🌐 Production Server (www.monumevip.com)

Production deployment with SSL, nginx proxy, and full security.

### Quick Start - Windows
```bash
# Simple one-click start
start_production.bat

# Or manually
python server.py
```

### Production Access Points
- **Main Dashboard:** https://www.monumevip.com/static/dashboard.html
- **Team Chat:** https://www.monumevip.com/static/team_chat.html
- **Email System:** https://www.monumevip.com/static/emails.html
- **API Health:** https://www.monumevip.com/health

### Production Configuration
- **Backend Server:** Port 8080 (internal)
- **Nginx Proxy:** Port 443/80 (public HTTPS/HTTP)
- **Domain:** www.monumevip.com
- **SSL:** Let's Encrypt certificates
- **Security:** Production headers and CORS

---

## 🔄 Recent Improvements Included

All your recent functionality improvements are included in both environments:

### ✅ Mark Read Functionality
- **Team Chat:** Mark individual messages as read with user verification
- **Dashboard:** Mark all messages as read with professional modal
- **Cancel Buttons:** Proper modal closing with multiple methods (X, ESC, click outside)

### ✅ Navigation Fixes
- **Users Button:** Properly navigates to team chat
- **Team MonuMe Card:** Only buttons are clickable (card itself is not)

### ✅ Active Users System  
- **Real Count:** Shows actual active users, not placeholder
- **Auto Updates:** Refreshes every 30 seconds
- **Session Management:** Automatic cleanup of inactive users

### ✅ Dashboard Enhancements
- **Professional Modals:** Better styling and animations
- **Error Handling:** Inline error messages and loading states
- **Event Delegation:** Proper handling of dynamic content

---

## 🧪 Testing Your Setup

### Test Local Server
```bash
# Start local server
python server.py

# In browser, test these:
# http://localhost:5000/static/dashboard.html - Dashboard functionality
# http://localhost:5000/static/team_chat.html - Mark read buttons  
# http://localhost:5000/static/emails.html - Email configuration
```

### Test Production Server  
```bash
# Start production server
python server.py

# In browser, test these:
# https://www.monumevip.com/static/dashboard.html - Full production functionality
# https://www.monumevip.com/static/team_chat.html - Production team chat
# https://www.monumevip.com/static/emails.html - Production email system
```

---

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Check what's using the port
netstat -ano | findstr :5000
netstat -ano | findstr :8080

# Kill process if needed
taskkill /PID [process_id] /F
```

**Database Issues:**
```bash
# Reinitialize database
python init_db.py
```

**Permission Issues:**
- Run command prompt as Administrator
- Check file permissions in the MonuMe_Tracker folder

### Nginx Configuration (Production Only)
Make sure nginx is properly configured and running:
```bash
# Check nginx status (on server)
sudo systemctl status nginx

# Reload nginx config
sudo systemctl reload nginx

# Test nginx config
sudo nginx -t
```

---

## 📊 Environment Specifications

### Local Development
- **Python:** 3.x with Flask
- **Database:** SQLite (monume.db)
- **Port:** 5000
- **Domain:** localhost / 127.0.0.1
- **SSL:** Not required
- **CORS:** Permissive for development

### Production
- **Python:** 3.x with Flask + production WSGI
- **Database:** SQLite (monume.db)  
- **Port:** 8080 (internal)
- **Domain:** www.monumevip.com
- **SSL:** Let's Encrypt certificates
- **CORS:** Restricted to allowed domains
- **Proxy:** Nginx reverse proxy
- **Security:** Production headers enabled

---

## 🎯 Next Steps

1. **Start Local Development:** Run `start_local.bat` and test all functionality
2. **Test Recent Changes:** Verify mark read buttons, dashboard improvements
3. **Production Deployment:** Run `start_production.bat` on your server
4. **Monitor Logs:** Check `server_logs.txt` for any issues
5. **Update DNS:** Ensure www.monumevip.com points to your server IP

---

## 🆘 Support

If you encounter any issues:
1. Check the `server_logs.txt` file for error messages
2. Run `python environment_checker.py` to diagnose issues
3. Verify your server configuration matches this guide
4. Test individual components (database, static files, API endpoints)

**Everything is configured and ready to go!** 🌟 