#!/usr/bin/env python3
"""
Direct database query to see what's actually stored
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import app, db

def direct_db_query():
    with app.app_context():
        try:
            print("Direct database query...")
            
            # Query users table directly
            result = db.session.execute(db.text("SELECT id, username, name, role, location_id FROM user"))
            users = result.fetchall()
            print(f"Found {len(users)} users in user table:")
            for user in users:
                print(f"  - ID: {user[0]}, Username: {user[1]}, Name: {user[2]}, Role: {user[3]}, Location: {user[4]}")
            
            # Query locations table directly
            result = db.session.execute(db.text("SELECT id, name, location_name FROM location"))
            locations = result.fetchall()
            print(f"\nFound {len(locations)} locations in location table:")
            for location in locations:
                print(f"  - ID: {location[0]}, Name: {location[1]}, Location Name: {location[2]}")
            
            # Query with JOIN to see user-location relationships
            result = db.session.execute(db.text("""
                SELECT u.id, u.username, u.name, u.role, l.name as location_name 
                FROM user u 
                LEFT JOIN location l ON u.location_id = l.id
            """))
            users_with_locations = result.fetchall()
            print(f"\nUsers with locations (JOIN query):")
            for user in users_with_locations:
                location_name = user[4] if user[4] else "No location"
                print(f"  - ID: {user[0]}, Username: {user[1]}, Name: {user[2]}, Role: {user[3]}, Location: {location_name}")
            
        except Exception as e:
            print(f"Database error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    direct_db_query() 