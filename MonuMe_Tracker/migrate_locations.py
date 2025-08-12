#!/usr/bin/env python3
"""
Database migration script to update existing locations with new fields
"""

import os
import sys
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from models import db, Location

# Create Flask app for migration
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///monume.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

def migrate_locations():
    """Migrate existing locations to include new fields"""
    with app.app_context():
        try:
            # Get all existing locations
            locations = Location.query.all()
            
            print(f"Found {len(locations)} locations to migrate...")
            
            for location in locations:
                # Update location_name if not set
                if not hasattr(location, 'location_name') or not location.location_name:
                    location.location_name = location.name
                
                # Update location_username if not set
                if not hasattr(location, 'location_username') or not location.location_username:
                    location.location_username = f"location_{location.id}"
                
                # Update mall if not set
                if not hasattr(location, 'mall') or not location.mall:
                    location.mall = 'Unknown Mall'
                
                print(f"Updated location {location.id}: {location.name}")
            
            # Commit changes
            db.session.commit()
            print("✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration failed: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    migrate_locations() 