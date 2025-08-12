@echo off
echo Starting MonuMe Tracker Server...
echo.

REM Check if virtual environment exists
if exist "venv\Scripts\python.exe" (
    echo Using virtual environment...
    venv\Scripts\python.exe server.py
) else (
    echo Virtual environment not found. Using system Python...
    python server.py
)

pause 