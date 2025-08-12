@echo off
echo 🎯 MonuMe Tracker - Quick Setup and Server Starter
echo ====================================================

REM Check if we're in the right directory
if not exist "server.py" (
    echo ❌ Error: Not in MonuMe_Tracker directory
    echo Please run this from the MonuMe_Tracker folder
    pause
    exit /b 1
)

echo ✅ Directory check passed
echo.

REM Kill any existing servers on our ports
echo 🔧 Checking for existing servers...
for /f "tokens=5" %%i in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo Stopping existing server on port 5000 (PID %%i)
    taskkill /PID %%i /F >nul 2>&1
)

for /f "tokens=5" %%j in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do (
    echo Stopping existing server on port 8080 (PID %%j)
    taskkill /PID %%j /F >nul 2>&1
)

echo.
echo 🚀 Choose your deployment option:
echo.
echo [1] Local Development Server (Port 5000)
echo     - Perfect for testing and development
echo     - Access: http://localhost:5000
echo.
echo [2] Production Server (Port 8080 for www.monumevip.com)
echo     - Production deployment with security
echo     - Requires nginx proxy for domain access
echo.
echo [3] Both Servers (Advanced)
echo     - Run both simultaneously for testing
echo.
echo [4] Environment Check Only
echo     - Run diagnostics without starting servers
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto local
if "%choice%"=="2" goto production  
if "%choice%"=="3" goto both
if "%choice%"=="4" goto check
echo Invalid choice. Defaulting to local development...

:local
echo.
echo 🔧 Starting Local Development Server...
echo ================================================
set DOMAIN=0.0.0.0
set PRODUCTION=false
set PORT=5000
echo ✅ Environment: Local Development
echo ✅ Port: 5000
echo ✅ Access URLs:
echo    📱 Dashboard: http://localhost:5000/static/dashboard.html
echo    💬 Team Chat: http://localhost:5000/static/team_chat.html
echo    📧 Emails: http://localhost:5000/static/emails.html
echo.
echo 💡 Press Ctrl+C to stop the server
echo.
python server.py
goto end

:production
echo.
echo 🌐 Starting Production Server...
echo ================================================
set DOMAIN=www.monumevip.com
set PRODUCTION=true
set PORT=8080
echo ✅ Environment: Production
echo ✅ Port: 8080 (internal)
echo ✅ Domain: www.monumevip.com
echo ✅ Access URLs (after nginx setup):
echo    🌍 Dashboard: https://www.monumevip.com/static/dashboard.html
echo    💬 Team Chat: https://www.monumevip.com/static/team_chat.html
echo    📧 Emails: https://www.monumevip.com/static/emails.html
echo.
echo ⚠️  Make sure nginx is configured and running!
echo 💡 Press Ctrl+C to stop the server
echo.
python deploy.py --production --domain www.monumevip.com --port 8080
goto end

:both
echo.
echo 🚀 Starting Both Servers...
echo ================================================
echo Starting local server on port 5000...
start "MonuMe Local" cmd /k "set DOMAIN=0.0.0.0 && set PRODUCTION=false && set PORT=5000 && python server.py"
timeout /t 3 >nul
echo Starting production server on port 8080...
start "MonuMe Production" cmd /k "set DOMAIN=www.monumevip.com && set PRODUCTION=true && set PORT=8080 && python deploy.py --production --domain www.monumevip.com --port 8080"
echo.
echo ✅ Both servers starting in separate windows!
echo 📱 Local: http://localhost:5000
echo 🌍 Production: https://www.monumevip.com (requires nginx)
goto end

:check
echo.
echo 🔍 Running Environment Check...
echo ================================================
python environment_checker.py
goto end

:end
echo.
echo 👋 Setup complete! Press any key to exit...
pause >nul 