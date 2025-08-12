@echo off
echo Fixing PowerShell Execution Policy...
echo.

echo Current execution policy:
powershell -Command "Get-ExecutionPolicy -List"

echo.
echo Setting execution policy to RemoteSigned for current user...
powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"

echo.
echo New execution policy:
powershell -Command "Get-ExecutionPolicy -List"

echo.
echo PowerShell execution policy has been updated.
echo You can now run PowerShell scripts including Activate.ps1
echo.
pause 