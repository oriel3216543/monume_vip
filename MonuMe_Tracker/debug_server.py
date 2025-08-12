#!/usr/bin/env python3
"""
Debug script to test server functionality
"""

import os
import sys
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from models import db, Location

# Create Flask app for debugging
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///monume.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

def debug_locations():
    """Debug the locations query"""
    with app.app_context():
        try:
            print("🔄 Testing Location query in app context...")
            
            # Test basic query
            locations = Location.query.all()
            print(f"✅ Found {len(locations)} locations")
            
            # Test individual location access
            for location in locations:
                print(f"📍 Location {location.id}:")
                print(f"   - name: {location.name}")
                print(f"   - location_name: {location.location_name}")
                print(f"   - location_username: {location.location_username}")
                print(f"   - mall: {location.mall}")
                print(f"   - is_active: {location.is_active}")
                
                # Test data conversion
                location_data = {
                    'id': location.id,
                    'location_name': location.location_name or location.name,
                    'location_username': location.location_username or f"location_{location.id}",
                    'mall': location.mall or 'Unknown Mall',
                    'name': location.name,
                    'address': location.address or '',
                    'phone': location.phone or '',
                    'email': location.email or '',
                    'is_active': location.is_active,
                    'created_at': location.created_at.isoformat() if location.created_at else None
                }
                print(f"   - converted data: {location_data}")
                print()
            
            print("✅ All tests passed!")
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    debug_locations() 