#!/usr/bin/env python3
"""
MonuMe Tracker Server Startup Script
Handles environment setup and server initialization
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        logger.error("Python 3.8 or higher is required")
        sys.exit(1)
    logger.info(f"Python version: {sys.version}")

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import flask
        import flask_sqlalchemy
        import flask_cors
        logger.info("All required dependencies are installed")
        return True
    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        return False

def install_dependencies():
    """Install required dependencies"""
    logger.info("Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        logger.info("Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to install dependencies: {e}")
        return False

def create_directories():
    """Create necessary directories"""
    directories = ['logs', 'instance', 'static/uploads', 'temp']
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        logger.info(f"Created directory: {directory}")

def setup_database():
    """Initialize database"""
    try:
        from server import app, db
        with app.app_context():
            db.create_all()
            logger.info("Database initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        return False

def create_admin_user():
    """Create default admin user if none exists"""
    try:
        from server import app, db
        from models import User
        from werkzeug.security import generate_password_hash
        
        with app.app_context():
            # Check if admin user exists
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
                logger.info("Default admin user created (username: admin, password: admin123)")
            else:
                logger.info("Admin user already exists")
        return True
    except Exception as e:
        logger.error(f"Failed to create admin user: {e}")
        return False

def main():
    """Main startup function"""
    logger.info("Starting MonuMe Tracker Server setup...")
    
    # Check Python version
    check_python_version()
    
    # Check dependencies
    if not check_dependencies():
        logger.info("Installing missing dependencies...")
        if not install_dependencies():
            logger.error("Failed to install dependencies. Exiting.")
            sys.exit(1)
    
    # Create directories
    create_directories()
    
    # Setup database (optional for direct run)
    setup_database()
    create_admin_user()
    
    logger.info("Setup completed successfully! Start server with: python server.py")
    return 0

if __name__ == '__main__':
    main() 