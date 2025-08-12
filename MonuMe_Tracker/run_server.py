#!/usr/bin/env python3
"""
Simple server runner for MonuMe Tracker
Runs the server on port 5000 for www.monumevip.com
"""

import os
import sys
import subprocess
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import flask
        import flask_sqlalchemy
        import flask_cors
        print("✅ All dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Installing dependencies...")
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        return True

def check_database():
    """Check if database exists, create if not"""
    if not os.path.exists('monume.db'):
        print("🔧 Database not found, initializing...")
        try:
            from server import init_database
            init_database()
            print("✅ Database initialized successfully")
        except Exception as e:
            print(f"❌ Database initialization failed: {e}")
            return False
    else:
        print("✅ Database exists")
    return True

def main():
    """Main function to start the server"""
    print("🚀 Starting MonuMe Tracker Server")
    print("=" * 50)
    print("🌐 Domain: www.monumevip.com")
    print("🔌 Port: 5000")
    print("🏭 Environment: Production")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        print("❌ Failed to install dependencies")
        return
    
    # Check database
    if not check_database():
        print("❌ Failed to initialize database")
        return
    
    print("\n🌍 Server will be available at:")
    print("   http://localhost:5000")
    print("   https://www.monumevip.com")
    print("   http://localhost:5000/static/dashboard.html")
    print("\n💡 Press Ctrl+C to stop the server")
    print("=" * 50)
    
    # Start the server
    try:
        from server import app
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=False,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 