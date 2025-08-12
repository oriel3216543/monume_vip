#!/usr/bin/env python3
"""
Database Initialization Script
Creates database tables and adds sample data for testing
"""

import sqlite3
import os
from datetime import datetime

def create_database():
    """Create database with proper schema"""
    db_path = 'monume_tracker.db'
    
    # Remove existing database if it exists
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"🗑️ Removed existing database: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create user table
        cursor.execute('''
            CREATE TABLE user (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(128),
                email VARCHAR(128) UNIQUE,
                username VARCHAR(64) UNIQUE,
                password_hash VARCHAR(256),
                role VARCHAR(32) DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                location_id VARCHAR(64),
                last_login DATETIME
            )
        ''')
        
        # Create appointment table
        cursor.execute('''
            CREATE TABLE appointment (
                id VARCHAR(64) PRIMARY KEY,
                client_name VARCHAR(128),
                client_email VARCHAR(128),
                date VARCHAR(32),
                time VARCHAR(32),
                type VARCHAR(64),
                notes TEXT,
                host_id INTEGER,
                status VARCHAR(32) DEFAULT 'scheduled',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (host_id) REFERENCES user (id)
            )
        ''')
        
        # Create location table
        cursor.execute('''
            CREATE TABLE location (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(128),
                address VARCHAR(256),
                phone VARCHAR(32),
                email VARCHAR(128),
                manager_id INTEGER,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (manager_id) REFERENCES user (id)
            )
        ''')
        
        # Create email_log table
        cursor.execute('''
            CREATE TABLE email_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                recipient VARCHAR(128),
                type VARCHAR(64),
                status VARCHAR(32),
                error_message TEXT
            )
        ''')
        
        # Create performance_record table
        cursor.execute('''
            CREATE TABLE performance_record (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                date DATE,
                metrics TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user (id)
            )
        ''')
        
        conn.commit()
        print("✅ Database tables created successfully")
        
        # Add sample users
        add_sample_users(cursor)
        
        conn.commit()
        conn.close()
        
        print("✅ Database initialization completed")
        return True
        
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        return False

def add_sample_users(cursor):
    """Add sample users for testing"""
    sample_users = [
        {
            'name': 'Admin User',
            'email': 'admin@monume.com',
            'username': 'admin',
            'password_hash': 'pbkdf2:sha256:600000$admin123$hash_placeholder',
            'role': 'admin',
            'is_active': 1
        },
        {
            'name': 'Manager User',
            'email': 'manager@monume.com',
            'username': 'manager',
            'password_hash': 'pbkdf2:sha256:600000$manager123$hash_placeholder',
            'role': 'manager',
            'is_active': 1
        },
        {
            'name': 'Regular User',
            'email': 'user@monume.com',
            'username': 'user',
            'password_hash': 'pbkdf2:sha256:600000$user123$hash_placeholder',
            'role': 'user',
            'is_active': 1
        }
    ]
    
    for user in sample_users:
        cursor.execute('''
            INSERT INTO user (name, email, username, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user['name'], user['email'], user['username'], user['password_hash'], user['role'], user['is_active']))
    
    print(f"✅ Added {len(sample_users)} sample users")

def verify_database():
    """Verify database was created correctly"""
    db_path = 'monume_tracker.db'
    
    if not os.path.exists(db_path):
        print(f"❌ Database file '{db_path}' not found")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        table_names = [table[0] for table in tables]
        
        print(f"📋 Tables created: {table_names}")
        
        # Check user count
        cursor.execute("SELECT COUNT(*) FROM user")
        user_count = cursor.fetchone()[0]
        print(f"👥 Users in database: {user_count}")
        
        # Show users
        cursor.execute("SELECT id, name, email, username, role FROM user")
        users = cursor.fetchall()
        print("📝 Users:")
        for user in users:
            print(f"   ID: {user[0]}, Name: {user[1]}, Email: {user[2]}, Username: {user[3]}, Role: {user[4]}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error verifying database: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Database Initialization")
    print("=" * 40)
    
    # Create database
    if create_database():
        print("\n🔍 Verifying database...")
        verify_database()
        
        print("\n✅ Database initialization completed successfully!")
        print("\n📋 Next steps:")
        print("1. Start the server: python server.py")
        print("2. Navigate to: http://localhost:5000/users")
        print("3. Test user management functionality")
    else:
        print("\n❌ Database initialization failed!")
