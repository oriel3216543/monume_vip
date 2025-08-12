@echo off
echo Activating MonuMe Tracker Virtual Environment...
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Virtual environment not found. Creating new virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment. Please ensure Python is installed.
        pause
        exit /b 1
    )
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install requirements if needed
if exist "requirements.txt" (
    echo Installing requirements...
    pip install -r requirements.txt
)

echo.
echo Virtual environment activated successfully!
echo To deactivate, run: deactivate
echo To start the server, run: python server.py
echo.
cmd /k 