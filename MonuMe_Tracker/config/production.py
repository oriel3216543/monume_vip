"""
Production configuration for MonuMe Tracker Server
"""

import os
from datetime import timedelta

class ProductionConfig:
    """Production configuration settings"""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'monume-vip-production-secret-key-2024')
    DEBUG = False
    TESTING = False
    
    # Database settings
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///monume_tracker.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Server settings
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))
    
    # Domain settings
    DOMAIN = os.environ.get('DOMAIN', 'www.monumevip.com')
    ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'www.monumevip.com,monumevip.com,localhost').split(',')
    
    # CORS settings
    CORS_ORIGINS = [
        'https://www.monumevip.com',
        'http://www.monumevip.com',
        'http://localhost:5000',
        'http://127.0.0.1:5000'
    ]
    
    # Email settings
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', 'monumequeens@gmail.com')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'monumequeens@gmail.com')
    
    # Security settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    
    # Logging settings
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = 'server_logs.txt'
    
    # File upload settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = 'temp'
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
    
    # Performance settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # Feature flags
    ENABLE_EMAIL = os.environ.get('ENABLE_EMAIL', 'True').lower() == 'true'
    ENABLE_PDF = os.environ.get('ENABLE_PDF', 'True').lower() == 'true'
    ENABLE_ANALYTICS = os.environ.get('ENABLE_ANALYTICS', 'True').lower() == 'true'
    
    @staticmethod
    def init_app(app):
        """Initialize application with production settings"""
        pass

class DevelopmentConfig(ProductionConfig):
    """Development configuration settings"""
    
    DEBUG = True
    TESTING = False
    
    # Development-specific settings
    CORS_ORIGINS = [
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ]
    
    # Less secure settings for development
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = False

class TestingConfig(ProductionConfig):
    """Testing configuration settings"""
    
    TESTING = True
    DEBUG = True
    
    # Use in-memory database for testing
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # Disable CSRF protection for testing
    WTF_CSRF_ENABLED = False

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': ProductionConfig
} 