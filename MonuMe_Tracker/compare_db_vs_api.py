#!/usr/bin/env python3
"""
Compare database content vs API response
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import app, db, User, Location
import requests

def compare_db_vs_api():
    print("=== DATABASE CONTENT ===")
    with app.app_context():
        try:
            # Check users in database
            users = User.query.all()
            print(f"Found {len(users)} users in database:")
            for user in users:
                location_name = user.location.name if user.location else "No location"
                print(f"  - ID: {user.id}, Username: {user.username}, Role: {user.role}, Location: {location_name}")
            
            # Check locations in database
            locations = Location.query.all()
            print(f"\nFound {len(locations)} locations in database:")
            for location in locations:
                print(f"  - ID: {location.id}, Name: {location.name}, Location Name: {location.location_name}")
            
        except Exception as e:
            print(f"Database error: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n=== API RESPONSE ===")
    try:
        # Test API with authentication
        session = requests.Session()
        
        # Login
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        response = session.post("http://localhost:5000/api/login", json=login_data)
        if response.status_code == 200:
            print("✅ Login successful")
            
            # Get users from API
            response = session.get("http://localhost:5000/api/users")
            if response.status_code == 200:
                data = response.json()
                print(f"API returned {len(data.get('users', []))} users:")
                for user in data.get('users', []):
                    print(f"  - ID: {user.get('id', 'N/A')}, Username: {user.get('username', 'N/A')}, Role: {user.get('role', 'N/A')}, Location: {user.get('location_name', 'No location')}")
            else:
                print(f"❌ Users API failed: {response.text}")
            
            # Get locations from API
            response = session.get("http://localhost:5000/api/locations")
            if response.status_code == 200:
                data = response.json()
                print(f"\nAPI returned {len(data.get('locations', []))} locations:")
                for location in data.get('locations', []):
                    print(f"  - ID: {location.get('id', 'N/A')}, Name: {location.get('name', 'N/A')}")
            else:
                print(f"❌ Locations API failed: {response.text}")
        else:
            print(f"❌ Login failed: {response.text}")
            
    except Exception as e:
        print(f"API error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    compare_db_vs_api() 