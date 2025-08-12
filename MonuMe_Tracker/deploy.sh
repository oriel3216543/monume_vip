#!/bin/bash

# MonuMe Tracker Deployment Script
# Deploys the server to www.monumevip.com:5000

set -e

echo "🚀 Starting MonuMe Tracker deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check Python version
print_status "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.8.0"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" = "$required_version" ]; then
    print_status "Python version $python_version is compatible"
else
    print_error "Python 3.8 or higher is required. Current version: $python_version"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_status "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
print_status "Installing dependencies..."
pip install -r requirements.txt

# Create necessary directories
print_status "Creating directories..."
mkdir -p logs instance static/uploads temp

# Set permissions
print_status "Setting permissions..."
chmod 755 logs instance static/uploads temp
chmod 644 *.py *.txt *.md

# Initialize database
print_status "Initializing database..."
python3 -c "
from server import app, db
with app.app_context():
    db.create_all()
    print('Database initialized successfully')
"

# Create admin user if it doesn't exist
print_status "Checking admin user..."
python3 -c "
from server import app, db
from models import User
from werkzeug.security import generate_password_hash

with app.app_context():
    admin = User.query.filter_by(role='admin').first()
    if not admin:
        admin = User(
            name='Admin User',
            username='admin',
            email='admin@monumevip.com',
            password=generate_password_hash('admin123'),
            role='admin',
            is_active=True
        )
        db.session.add(admin)
        db.session.commit()
        print('Default admin user created (username: admin, password: admin123)')
    else:
        print('Admin user already exists')
"

# Create systemd service file
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/monume-tracker.service > /dev/null <<EOF
[Unit]
Description=MonuMe Tracker Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/venv/bin
ExecStart=$(pwd)/venv/bin/python server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
print_status "Enabling systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable monume-tracker.service

# Start the service
print_status "Starting MonuMe Tracker service..."
sudo systemctl start monume-tracker.service

# Check service status
print_status "Checking service status..."
if sudo systemctl is-active --quiet monume-tracker.service; then
    print_status "✅ MonuMe Tracker service is running successfully!"
else
    print_error "❌ Failed to start MonuMe Tracker service"
    sudo systemctl status monume-tracker.service
    exit 1
fi

# Configure nginx
print_status "Configuring nginx..."
sudo cp nginx_monumevip.conf /etc/nginx/sites-available/monumevip
sudo ln -sf /etc/nginx/sites-available/monumevip /etc/nginx/sites-enabled/

# Test nginx configuration
print_status "Testing nginx configuration..."
if sudo nginx -t; then
    print_status "Nginx configuration is valid"
    sudo systemctl reload nginx
else
    print_error "Nginx configuration is invalid"
    exit 1
fi

# Setup SSL certificate (if certbot is available)
if command -v certbot &> /dev/null; then
    print_status "Setting up SSL certificate..."
    sudo certbot --nginx -d www.monumevip.com -d monumevip.com --non-interactive --agree-tos --email admin@monumevip.com
else
    print_warning "Certbot not found. Please install and configure SSL certificate manually."
fi

# Final status check
print_status "Performing final status check..."
sleep 5

if curl -f -s http://localhost:5000/health > /dev/null; then
    print_status "✅ Server is responding to health checks"
else
    print_warning "⚠️  Server health check failed. Check logs for details."
fi

# Display service information
echo ""
print_status "🎉 Deployment completed successfully!"
echo ""
echo "Service Information:"
echo "  - Service Name: monume-tracker"
echo "  - Status: $(sudo systemctl is-active monume-tracker.service)"
echo "  - Port: 5000"
echo "  - Domain: www.monumevip.com"
echo ""
echo "Useful Commands:"
echo "  - Check status: sudo systemctl status monume-tracker"
echo "  - View logs: sudo journalctl -u monume-tracker -f"
echo "  - Restart service: sudo systemctl restart monume-tracker"
echo "  - Stop service: sudo systemctl stop monume-tracker"
echo ""
echo "Default Admin Credentials:"
echo "  - Username: admin"
echo "  - Password: admin123"
echo ""
print_warning "⚠️  Please change the default admin password after first login!" 