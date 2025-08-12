#!/bin/bash
set -e  # Exit on error

# Print startup message
echo "Starting MonuMe Tracker application..."

# Start Nginx in the background (with sudo since we're running as non-root)
sudo nginx || echo "Warning: Could not start nginx, continuing with application startup"

# Create required directories if they don't exist
mkdir -p /app/temp

# Set proper permissions for database file
touch /app/monume.db 2>/dev/null || true
chmod 600 /app/monume.db 2>/dev/null || true

# Check if DB exists, if not initialize it
if [ ! -s /app/monume.db ]; then
    echo "Initializing database..."
    python init_db.py
    # Set proper permissions for the newly created database
    chmod 600 /app/monume.db
fi

# Start the application with Gunicorn (preferred) or Waitress fallback
echo "Starting application with Gunicorn..."
if command -v gunicorn >/dev/null 2>&1; then
  export PRODUCTION=true
  exec gunicorn -w ${WORKERS:-4} -b 0.0.0.0:${PORT:-5000} 'server:app'
else
  echo "Gunicorn not found. Falling back to Waitress/Flask."
  export PRODUCTION=true
  python deploy.py --production --port ${PORT:-5000}
fi
