@echo off
echo Running MonuMe Tracker without virtual environment...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo Python found. Installing required packages globally...
echo.

REM Install required packages
pip install flask flask-sqlalchemy werkzeug

echo.
echo Starting server...
echo Server will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

python server.py

echo.
echo Server stopped. Press any key to exit...
pause >nul 