Write-Host "Activating virtual environment..." -ForegroundColor Green
& ".\.venv\Scripts\Activate.ps1"

Write-Host "Installing dependencies..." -ForegroundColor Green
pip install -r "MonuMe_Tracker\requirements.txt"

Write-Host "Starting server..." -ForegroundColor Green
Set-Location "MonuMe_Tracker"
python server.py 