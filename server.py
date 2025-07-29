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
    # Default to port 5000 and host 0.0.0.0 so it behaves exactly
    # like `python MonuMe_Tracker/server.py`.
    app.run(host='0.0.0.0', port=5000, debug=False) 