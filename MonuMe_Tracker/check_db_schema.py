#!/usr/bin/env python3
"""
Check Database Schema
"""

import sqlite3

def check_schema():
    conn = sqlite3.connect('monume.db')
    cursor = conn.cursor()
    
    print("Database Schema Check")
    print("=" * 30)
    
    # Check locations table
    print("\nLocations table:")
    cursor.execute("PRAGMA table_info(locations)")
    columns = cursor.fetchall()
    for column in columns:
        print(f"  {column[1]} ({column[2]})")
    
    # Check users table
    print("\nUsers table:")
    cursor.execute("PRAGMA table_info(users)")
    columns = cursor.fetchall()
    for column in columns:
        print(f"  {column[1]} ({column[2]})")
    
    conn.close()

if __name__ == "__main__":
    check_schema() 