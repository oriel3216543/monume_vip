@echo off
title MonuMe Tracker - Quick Start
color 0A

echo ========================================
echo    MonuMe Tracker - Quick Start
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo Python found. Checking version...
python --version

echo.
echo Step 1: Creating virtual environment...
if not exist "venv" (
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created successfully.
) else (
    echo Virtual environment already exists.
)

echo.
echo Step 2: Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Step 3: Installing requirements...
if exist "requirements.txt" (
    pip install -r requirements.txt
    if errorlevel 1 (
        echo WARNING: Some packages may not have installed correctly
        echo Continuing anyway...
    )
) else (
    echo No requirements.txt found. Installing basic packages...
    pip install flask flask-sqlalchemy werkzeug
)

echo.
echo Step 4: Starting the server...
echo.
echo Server will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
echo ========================================

python server.py

echo.
echo Server stopped. Press any key to exit...
pause >nul 