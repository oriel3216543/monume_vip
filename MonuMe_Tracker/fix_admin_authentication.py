#!/usr/bin/env python3
"""
Fix Admin Authentication Script
Ensures the admin user exists in the database with correct credentials
"""

import sqlite3
import os
import sys

def get_db_connection():
    """Get database connection"""
    db_path = 'monume.db'
    if not os.path.exists(db_path):
        print(f"❌ Database file not found: {db_path}")
        return None
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def check_admin_user(conn):
    """Check if admin user exists"""
    cursor = conn.cursor()
    admin = cursor.execute("SELECT * FROM users WHERE username = 'admin'").fetchone()
    return admin

def create_admin_user(conn):
    """Create admin user if it doesn't exist"""
    cursor = conn.cursor()
    
    # Check if admin user already exists
    existing_admin = check_admin_user(conn)
    
    if existing_admin:
        print(f"✅ Admin user already exists (ID: {existing_admin['id']})")
        
        # Update admin password to ensure it's correct
        cursor.execute("""
            UPDATE users 
            SET password = 'monume2024', role = 'admin', email = 'admin@monumevip.com'
            WHERE username = 'admin'
        """)
        conn.commit()
        print("✅ Admin password updated to 'monume2024'")
        return existing_admin
    else:
        # Create new admin user
        cursor.execute("""
            INSERT INTO users (username, password, email, name, role, location_id)
            VALUES (?, ?, ?, ?, ?, ?)
        """, ('admin', 'monume2024', 'admin@monumevip.com', 'System Administrator', 'admin', None))
        
        admin_id = cursor.lastrowid
        conn.commit()
        print(f"✅ Admin user created with ID: {admin_id}")
        return {'id': admin_id, 'username': 'admin', 'role': 'admin'}

def verify_admin_login(conn):
    """Verify admin can login with correct credentials"""
    cursor = conn.cursor()
    admin = cursor.execute("""
        SELECT * FROM users 
        WHERE username = 'admin' AND password = 'monume2024' AND role = 'admin'
    """).fetchone()
    
    if admin:
        print("✅ Admin login verification successful")
        return True
    else:
        print("❌ Admin login verification failed")
        return False

def main():
    print("🔧 Fixing Admin Authentication...")
    
    # Get database connection
    conn = get_db_connection()
    if not conn:
        sys.exit(1)
    
    try:
        # Create or update admin user
        admin_user = create_admin_user(conn)
        
        # Verify admin login
        if verify_admin_login(conn):
            print("\n✅ Admin authentication fixed successfully!")
            print(f"   Username: admin")
            print(f"   Password: monume2024")
            print(f"   Role: {admin_user['role']}")
            print(f"   User ID: {admin_user['id']}")
        else:
            print("\n❌ Admin authentication verification failed")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Error fixing admin authentication: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main() 