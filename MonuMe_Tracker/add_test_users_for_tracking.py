#!/usr/bin/env python3
"""
Script to add test users to locations for testing tracking page functionality
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import app, db, User, Location
from werkzeug.security import generate_password_hash
from datetime import datetime

def add_test_users():
    """Add test users to existing locations"""
    with app.app_context():
        try:
            # Get existing locations
            locations = Location.query.all()
            print(f"Found {len(locations)} locations:")
            for loc in locations:
                print(f"  - {loc.name} (ID: {loc.id}, Username: {loc.location_username})")
            
            if not locations:
                print("No locations found. Please create locations first.")
                return
            
            # Add test users to each location
            test_users = []
            
            for location in locations:
                # Create 3-4 users per location
                location_users = [
                    {
                        'name': f'Sales Rep 1 - {location.name}',
                        'username': f'sales1_{location.location_username}',
                        'email': f'sales1_{location.location_username}@monumevip.com',
                        'password': 'password123',
                        'role': 'user',
                        'location_id': location.id
                    },
                    {
                        'name': f'Sales Rep 2 - {location.name}',
                        'username': f'sales2_{location.location_username}',
                        'email': f'sales2_{location.location_username}@monumevip.com',
                        'password': 'password123',
                        'role': 'user',
                        'location_id': location.id
                    },
                    {
                        'name': f'Manager - {location.name}',
                        'username': f'manager_{location.location_username}',
                        'email': f'manager_{location.location_username}@monumevip.com',
                        'password': 'password123',
                        'role': 'manager',
                        'location_id': location.id
                    },
                    {
                        'name': f'Employee - {location.name}',
                        'username': f'employee_{location.location_username}',
                        'email': f'employee_{location.location_username}@monumevip.com',
                        'password': 'password123',
                        'role': 'employee',
                        'location_id': location.id
                    }
                ]
                
                for user_data in location_users:
                    # Check if user already exists
                    existing_user = User.query.filter_by(username=user_data['username']).first()
                    if not existing_user:
                        user = User(
                            name=user_data['name'],
                            username=user_data['username'],
                            email=user_data['email'],
                            password=generate_password_hash(user_data['password']),
                            role=user_data['role'],
                            location_id=user_data['location_id'],
                            is_active=True,
                            created_at=datetime.utcnow()
                        )
                        db.session.add(user)
                        test_users.append(user)
                        print(f"  ✅ Created user: {user.name} ({user.username}) for {location.name}")
                    else:
                        print(f"  ⚠️  User already exists: {user_data['username']}")
            
            # Commit all changes
            db.session.commit()
            print(f"\n✅ Successfully created {len(test_users)} new test users")
            
            # Display summary
            print("\n📊 User Summary by Location:")
            for location in locations:
                users = User.query.filter_by(location_id=location.id).all()
                print(f"  {location.name}: {len(users)} users")
                for user in users:
                    print(f"    - {user.name} ({user.username}) - {user.role}")
            
        except Exception as e:
            print(f"❌ Error adding test users: {str(e)}")
            db.session.rollback()

if __name__ == "__main__":
    print("🚀 Adding test users for tracking page testing...")
    add_test_users()
    print("✅ Done!") 