#!/usr/bin/env python3
"""
Check database content directly
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import app, db, User, Location

def check_db_content():
    with app.app_context():
        try:
            print("Checking database content...")
            
            # Check users
            users = User.query.all()
            print(f"Found {len(users)} users in database:")
            for user in users:
                location_name = user.location.name if user.location else "No location"
                print(f"  - ID: {user.id}, Username: {user.username}, Role: {user.role}, Location: {location_name}")
            
            # Check locations
            locations = Location.query.all()
            print(f"\nFound {len(locations)} locations in database:")
            for location in locations:
                print(f"  - ID: {location.id}, Name: {location.name}, Location Name: {location.location_name}")
            
        except Exception as e:
            print(f"Database error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    check_db_content() 