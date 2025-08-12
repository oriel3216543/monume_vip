#!/usr/bin/env python3
"""
Python Environment Checker for MonuMe Tracker
Verifies that all required packages are available
"""

import sys
import importlib

def check_package(package_name):
    """Check if a package can be imported"""
    try:
        importlib.import_module(package_name)
        print(f"✅ {package_name} - Available")
        return True
    except ImportError as e:
        print(f"❌ {package_name} - Not available: {e}")
        return False

def main():
    print("🐍 Python Environment Check")
    print("=" * 50)
    print(f"Python executable: {sys.executable}")
    print(f"Python version: {sys.version}")
    print(f"Python path: {sys.path}")
    print()
    
    # Check required packages
    required_packages = [
        'flask',
        'flask_sqlalchemy',
        'werkzeug',
        'jinja2',
        'sqlite3'
    ]
    
    all_available = True
    for package in required_packages:
        if not check_package(package):
            all_available = False
    
    print()
    if all_available:
        print("🎉 All packages are available!")
        print("The import error in VS Code/Cursor should be resolved.")
    else:
        print("⚠️  Some packages are missing. Please install them.")
    
    return all_available

if __name__ == "__main__":
    main() 