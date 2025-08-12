#!/usr/bin/env python3
"""
Root launcher script for MonuMe VIP.
Allows you to start the production server with a simple

    python server.py

from the project root (or `python -m server`).
It simply imports the fully-featured Flask application defined in
`MonuMe_Tracker/server.py` and runs it.
"""

import os
import sys

# Ensure project root is on PYTHONPATH
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Import the real Flask application
from MonuMe_Tracker.server import app  # noqa: E402 (import after sys.path tweak)

if __name__ == '__main__':
    # In production environments (e.g., Railway) a PORT is provided.
    # If present, exec Gunicorn instead of the Flask dev server.
    port = os.environ.get('PORT')
    if port:
        os.execvp('sh', ['sh', '-c', f"exec gunicorn MonuMe_Tracker.server:app --bind 0.0.0.0:{port} --workers 2 --timeout 120 --access-logfile - --error-logfile -"])
    else:
        app.run(host='0.0.0.0', port=5000, debug=False)