#!/usr/bin/env python3
"""
MonuMe Email Server Startup Script
Ensures proper email configuration and server startup for both local and domain deployment.
"""

import os
import sys
import configparser
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_email_config():
    """Check and validate email configuration"""
    config_path = os.path.join('config', 'email_config.ini')
    
    if not os.path.exists(config_path):
        logger.error(f"Email configuration file not found: {config_path}")
        return False
    
    config = configparser.ConfigParser()
    config.read(config_path)
    
    if 'EMAIL' not in config:
        logger.error("EMAIL section not found in configuration")
        return False
    
    email_config = config['EMAIL']
    
    # Check required fields
    required_fields = ['smtp_server', 'smtp_port', 'sender_email', 'sender_name']
    missing_fields = []
    
    for field in required_fields:
        if not email_config.get(field):
            missing_fields.append(field)
    
    if missing_fields:
        logger.error(f"Missing required email configuration fields: {missing_fields}")
        return False
    
    # Log configuration (without password)
    logger.info("Email Configuration:")
    logger.info(f"  SMTP Server: {email_config.get('smtp_server')}")
    logger.info(f"  SMTP Port: {email_config.get('smtp_port')}")
    logger.info(f"  Sender Email: {email_config.get('sender_email')}")
    logger.info(f"  Sender Name: {email_config.get('sender_name')}")
    logger.info(f"  Domain: {email_config.get('domain', 'Not set')}")
    logger.info(f"  Auto Email: {email_config.get('auto_email_enabled', 'true')}")
    
    # Check if password is set
    if not email_config.get('password'):
        logger.warning("Email password not set - emails may fail to send")
    else:
        logger.info("  Password: [SET]")
    
    return True

def setup_environment():
    """Setup environment variables for the server"""
    
    # Check if we're running on the domain
    domain = os.environ.get('DOMAIN', '')
    
    if not domain:
        # Check if we can determine the domain from config
        config_path = os.path.join('config', 'email_config.ini')
        if os.path.exists(config_path):
            config = configparser.ConfigParser()
            config.read(config_path)
            if 'EMAIL' in config:
                domain = config['EMAIL'].get('domain', '')
    
    # Set environment variables
    if domain and domain != 'localhost' and domain != '127.0.0.1':
        os.environ['DOMAIN'] = domain
        os.environ['PRODUCTION'] = 'true'
        logger.info(f"Running in PRODUCTION mode for domain: {domain}")
    else:
        os.environ['DOMAIN'] = '0.0.0.0'
        os.environ['PRODUCTION'] = 'false'
        logger.info("Running in DEVELOPMENT mode")
    
    # Set port
    port = os.environ.get('PORT', '5000')
    os.environ['PORT'] = port
    logger.info(f"Server will run on port: {port}")

def main():
    """Main startup function"""
    logger.info("Starting MonuMe Email Server...")
    
    # Check email configuration
    if not check_email_config():
        logger.error("Email configuration check failed!")
        sys.exit(1)
    
    # Setup environment
    setup_environment()
    
    # Import and run the server
    try:
        import server
        logger.info("Server module imported successfully")
        
        # Run the server
        port = int(os.environ.get('PORT', 5000))
        domain = os.environ.get('DOMAIN', '0.0.0.0')
        production = os.environ.get('PRODUCTION', 'false').lower() == 'true'
        
        logger.info(f"Starting server on {domain}:{port}")
        
        if production:
            logger.info("Production mode - using Waitress server")
            try:
                from waitress import serve
                serve(server.app, host=domain, port=port, threads=4)
            except ImportError:
                logger.warning("Waitress not available, falling back to Flask dev server")
                server.app.run(host=domain, port=port, debug=False)
        else:
            logger.info("Development mode - using Flask dev server")
            server.app.run(host=domain, port=port, debug=True)
            
    except ImportError as e:
        logger.error(f"Failed to import server module: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Server startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 