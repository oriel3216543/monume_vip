@echo off
REM MonuMe Tracker Domain Deployment Configuration (Windows)
REM Use this script to easily deploy on your domain

echo 🚀 Setting up MonuMe Tracker for domain deployment...

REM Default configuration - modify these for your domain
set DOMAIN=monumevip.com
set PRODUCTION=true
set PORT=5000

REM Optional: Set these if you have SSL certificates
REM set SSL_CERT=C:\path\to\your\certificate.crt
REM set SSL_KEY=C:\path\to\your\private.key

REM Generate a secure secret key for production
for /f %%i in ('python -c "import secrets; print(secrets.token_hex(32))"') do set SECRET_KEY=%%i

echo ✅ Configuration set:
echo    DOMAIN: %DOMAIN%
echo    PRODUCTION: %PRODUCTION%
echo    PORT: %PORT%
echo    SECRET_KEY: [Generated securely]

echo.
echo 🔧 To customize for your domain:
echo    1. Edit this file and change DOMAIN to your domain
echo    2. Run: domain_config.bat
echo    3. Run: python server.py
echo.
echo 📱 Your appointment system will be available at:
echo    http://%DOMAIN%:%PORT%
echo    http://%DOMAIN%:%PORT%/appointment.html
echo.
echo 🔒 For HTTPS (recommended for production):
echo    1. Get SSL certificates
echo    2. Uncomment and set SSL_CERT and SSL_KEY above
echo    3. Use a reverse proxy like nginx or IIS
echo.

REM Start server if requested
if "%1"=="start" (
    echo 🚀 Starting server...
    python server.py
) 