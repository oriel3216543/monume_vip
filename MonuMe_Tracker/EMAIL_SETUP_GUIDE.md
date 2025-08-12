# MonuMe Email Setup Guide

## 🎯 **Overview**
To send real gift card emails from your MonuMe system, you need to configure SMTP settings with one of the supported email providers.

## 📧 **Supported Email Providers**

### **1. Gmail (Recommended for Testing)**
- **Server:** smtp.gmail.com
- **Port:** 587
- **Security:** TLS
- **Environment Variables:**
  ```
  GMAIL_USERNAME=your-email@gmail.com
  GMAIL_PASSWORD=your-app-password
  ```
- **Setup Instructions:**
  1. Enable 2-Factor Authentication on your Gmail account
  2. Generate an App Password: Google Account → Security → App passwords
  3. Use the app password instead of your regular password

### **2. Outlook/Hotmail**
- **Server:** smtp-mail.outlook.com
- **Port:** 587
- **Security:** TLS
- **Environment Variables:**
  ```
  OUTLOOK_USERNAME=your-email@outlook.com
  OUTLOOK_PASSWORD=your-password
  ```

### **3. MonuMe Domain Email**
- **Server:** mail.monumevip.com
- **Port:** 587
- **Security:** TLS
- **Environment Variables:**
  ```
  MONUME_SMTP_USER=info@monumevip.com
  MONUME_SMTP_PASS=your-domain-password
  ```

### **4. SendGrid (Professional)**
- **Server:** smtp.sendgrid.net
- **Port:** 587
- **Security:** TLS
- **Environment Variables:**
  ```
  SENDGRID_API_KEY=SG.your-api-key-here
  ```

### **5. Mailgun (Professional)**
- **Server:** smtp.mailgun.org
- **Port:** 587
- **Security:** TLS
- **Environment Variables:**
  ```
  MAILGUN_USERNAME=postmaster@your-domain.mailgun.org
  MAILGUN_PASSWORD=your-mailgun-password
  ```

## 🔧 **Setting Up Environment Variables**

### **Windows (PowerShell)**
```powershell
$env:GMAIL_USERNAME="your-email@gmail.com"
$env:GMAIL_PASSWORD="your-app-password"
```

### **Windows (Command Prompt)**
```cmd
set GMAIL_USERNAME=your-email@gmail.com
set GMAIL_PASSWORD=your-app-password
```

### **Linux/Mac**
```bash
export GMAIL_USERNAME="your-email@gmail.com"
export GMAIL_PASSWORD="your-app-password"
```

### **Python Script (.env file)**
Create a `.env` file in your MonuMe_Tracker directory:
```
GMAIL_USERNAME=your-email@gmail.com
GMAIL_PASSWORD=your-app-password
```

## 🚀 **Quick Start (Gmail)**

1. **Enable 2FA on Gmail**
   - Go to Google Account settings
   - Security → 2-Step Verification → Turn on

2. **Generate App Password**
   - Security → App passwords
   - Select "Mail" and "Windows Computer"
   - Copy the 16-character password

3. **Set Environment Variables**
   ```powershell
   $env:GMAIL_USERNAME="youremail@gmail.com"
   $env:GMAIL_PASSWORD="abcd efgh ijkl mnop"
   ```

4. **Restart MonuMe Server**
   ```powershell
   cd MonuMe_Tracker; python server.py
   ```

5. **Test Gift Card Email**
   - Create a test gift card
   - Use your own email as recipient
   - Check if you receive the email

## 🔍 **Troubleshooting**

### **Email Not Sending**
- Check server logs for SMTP error messages
- Verify environment variables are set correctly
- Test with a simple email client first

### **Gmail "Less Secure Apps" Error**
- Use App Passwords instead of regular password
- Ensure 2FA is enabled

### **Outlook Authentication Failed**
- Check if account has 2FA enabled
- Try generating an app-specific password

### **Domain Email Issues**
- Contact your domain hosting provider
- Verify SMTP settings and credentials
- Check if SMTP is enabled for your hosting plan

## 📝 **Testing Email Configuration**

1. **Check Environment Variables**
   ```python
   import os
   print("Gmail User:", os.environ.get('GMAIL_USERNAME'))
   print("Gmail Pass:", "Set" if os.environ.get('GMAIL_PASSWORD') else "Not Set")
   ```

2. **Test SMTP Connection**
   - Use the test email function in MonuMe
   - Check server logs for detailed error messages
   - Verify firewall isn't blocking SMTP ports

3. **Verify Email Template**
   - Use the preview function in emails.html
   - Check that all variables are properly replaced
   - Test with different email addresses

## 🎁 **Gift Card Email Features**

Once configured, your MonuMe system will:
- ✅ Send professional gift card emails automatically
- 📎 Attach the generated gift card image
- 📧 Use your configured email provider
- 🔄 Retry with fallback providers if one fails
- 📝 Save unsent emails to files if all providers fail

## 🛡️ **Security Best Practices**

- Use app-specific passwords instead of main passwords
- Store environment variables securely
- Don't commit passwords to code repositories
- Use professional email services for production
- Regularly rotate API keys and passwords

## 📞 **Support**

If you need help setting up email:
1. Check the server logs for specific error messages
2. Test your SMTP settings with a simple email client
3. Contact your email provider's support for SMTP configuration
4. Ensure all required ports (587) are open in your firewall

---

**💡 Quick Test:** After setup, create a test gift card with your own email to verify everything works! 