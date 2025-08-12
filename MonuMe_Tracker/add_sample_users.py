#!/usr/bin/env python3
"""
Add sample users to the database for testing the user management system.
"""

import os
import sys
from datetime import datetime
from werkzeug.security import generate_password_hash

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import app, db, User

def add_sample_users():
    """Add sample users to the database"""
    
    with app.app_context():
        # Check if users already exist
        existing_users = User.query.count()
        if existing_users > 0:
            print(f"Database already has {existing_users} users. Skipping sample data creation.")
            return
        
        # Sample users data
        sample_users = [
            {
                'name': 'John Smith',
                'email': 'john.smith@monume.com',
                'username': 'johnsmith',
                'password': 'password123',
                'role': 'admin',
                'is_active': True
            },
            {
                'name': 'Sarah Johnson',
                'email': 'sarah.johnson@monume.com',
                'username': 'sarahj',
                'password': 'password123',
                'role': 'manager',
                'is_active': True
            },
            {
                'name': 'Mike Davis',
                'email': 'mike.davis@monume.com',
                'username': 'mikedavis',
                'password': 'password123',
                'role': 'user',
                'is_active': True
            },
            {
                'name': 'Lisa Wilson',
                'email': 'lisa.wilson@monume.com',
                'username': 'lisawilson',
                'password': 'password123',
                'role': 'manager',
                'is_active': True
            },
            {
                'name': 'Tom Brown',
                'email': 'tom.brown@monume.com',
                'username': 'tombrown',
                'password': 'password123',
                'role': 'user',
                'is_active': False
            }
        ]
        
        # Create users
        for user_data in sample_users:
            try:
                user = User(
                    name=user_data['name'],
                    email=user_data['email'],
                    username=user_data['username'],
                    password_hash=generate_password_hash(user_data['password']),
                    role=user_data['role'],
                    is_active=user_data['is_active'],
                    created_at=datetime.utcnow()
                )
                db.session.add(user)
                print(f"Added user: {user_data['name']} ({user_data['role']})")
            except Exception as e:
                print(f"Error adding user {user_data['name']}: {e}")
        
        # Commit all changes
        try:
            db.session.commit()
            print(f"\nSuccessfully added {len(sample_users)} sample users to the database.")
            print("\nSample login credentials:")
            print("Username: johnsmith, Password: password123 (Admin)")
            print("Username: sarahj, Password: password123 (Manager)")
            print("Username: mikedavis, Password: password123 (User)")
        except Exception as e:
            db.session.rollback()
            print(f"Error committing users to database: {e}")

if __name__ == "__main__":
    print("Adding sample users to MonuMe Tracker database...")
    add_sample_users()
    print("Done!") 