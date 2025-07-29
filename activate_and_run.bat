@echo off
echo Activating virtual environment...
call .venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r MonuMe_Tracker\requirements.txt

echo Starting server...
cd MonuMe_Tracker
python server.py

pause 