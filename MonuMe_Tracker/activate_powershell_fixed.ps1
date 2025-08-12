# MonuMe Tracker Virtual Environment Activation Script
# This script bypasses execution policy restrictions

Write-Host "Activating MonuMe Tracker Virtual Environment..." -ForegroundColor Green
Write-Host ""

# Check if virtual environment exists
if (-not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "Virtual environment not found. Creating new virtual environment..." -ForegroundColor Yellow
    try {
        python -m venv venv
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to create virtual environment. Please ensure Python is installed." -ForegroundColor Red
            Read-Host "Press Enter to continue"
            exit 1
        }
    }
    catch {
        Write-Host "Error creating virtual environment: $_" -ForegroundColor Red
        Read-Host "Press Enter to continue"
        exit 1
    }
}

# Activate virtual environment using direct execution
try {
    & "venv\Scripts\Activate.ps1"
    
    # Install requirements if needed
    if (Test-Path "requirements.txt") {
        Write-Host "Installing requirements..." -ForegroundColor Yellow
        pip install -r requirements.txt
    }
    
    Write-Host ""
    Write-Host "Virtual environment activated successfully!" -ForegroundColor Green
    Write-Host "To deactivate, run: deactivate" -ForegroundColor Cyan
    Write-Host "To start the server, run: python server.py" -ForegroundColor Cyan
    Write-Host ""
    
    # Keep PowerShell open
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
catch {
    Write-Host "Error activating virtual environment: $_" -ForegroundColor Red
    Read-Host "Press Enter to continue"
    exit 1
} 