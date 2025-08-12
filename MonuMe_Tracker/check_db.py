#!/usr/bin/env python3
"""
Check database content
"""

import sqlite3
import os

def check_database():
    """Check the database content"""
    # Check both current directory and instance directory
    db_paths = ['monume_tracker.db', 'instance/monume_tracker.db']
    db_path = None
    
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            break
    
    if not db_path:
        print(f"Database file not found in any of these locations: {db_paths}")
        return
    
    print(f"Database file found: {db_path}")
    print("=" * 50)
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("Tables in database:")
        for table in tables:
            print(f"  - {table[0]}")
        
        print("\n" + "=" * 50)
        
        # Check users
        cursor.execute("SELECT id, name, username, role, location_id FROM user;")
        users = cursor.fetchall()
        print(f"Users ({len(users)}):")
        for user in users:
            print(f"  - ID: {user[0]}, Name: {user[1]}, Username: {user[2]}, Role: {user[3]}, Location: {user[4]}")
        
        print("\n" + "=" * 50)
        
        # Check locations
        cursor.execute("SELECT id, name, location_name, location_username FROM location;")
        locations = cursor.fetchall()
        print(f"Locations ({len(locations)}):")
        for location in locations:
            print(f"  - ID: {location[0]}, Name: {location[1]}, Location Name: {location[2]}, Username: {location[3]}")
        
        print("\n" + "=" * 50)
        
        # Check tracking data
        cursor.execute("SELECT id, user_id, location_id, date, opal_demos, opal_sales, scan_demos, scan_sold, net_sales, hours_worked FROM tracking_data;")
        tracking_data = cursor.fetchall()
        print(f"Tracking Data ({len(tracking_data)}):")
        if tracking_data:
            for i, data in enumerate(tracking_data[:5]):  # Show first 5 records
                print(f"  - ID: {data[0]}, User: {data[1]}, Location: {data[2]}, Date: {data[3]}, Opal: {data[4]}→{data[5]}, Scan: {data[6]}→{data[7]}, Sales: ${data[8]}, Hours: {data[9]}")
            if len(tracking_data) > 5:
                print(f"  ... and {len(tracking_data) - 5} more records")
        else:
            print("  No tracking data found!")
        
        conn.close()
        
    except Exception as e:
        print(f"Error checking database: {e}")

if __name__ == "__main__":
    check_database() 