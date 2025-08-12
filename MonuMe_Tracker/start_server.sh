#!/bin/bash

echo "========================================"
echo "   MonuMe Tracker Server Startup"
echo "========================================"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed or not in PATH"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

echo "Python found. Starting server..."
echo

# Set environment variables
export FLASK_APP=server.py
export FLASK_ENV=development
export PORT=5000
export HOST=127.0.0.1
# Prefer explicit PRODUCTION flag and avoid forcing DEBUG True here
export DEBUG=${DEBUG:-False}

# Run server directly
python3 server.py

# Check exit status
if [ $? -ne 0 ]; then
    echo
    echo "Server startup failed. Check the logs above for details."
    exit 1
fi

echo
echo "Server stopped." 