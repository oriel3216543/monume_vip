#!/usr/bin/env python3
"""
Create test users and locations for MonuMe VIP system
"""

import os
import sys
from werkzeug.security import generate_password_hash
from datetime import datetime

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import Flask app and models
from server import app, db, User, Location

def create_test_data():
    """Create test users and locations"""
    
    with app.app_context():
        print("Creating test data...")
        
        # Create admin user
        admin_user = User.query.filter_by(username='admin').first()
        if not admin_user:
            admin_user = User(
                name='System Administrator',
                email='admin@monumevip.com',
                username='admin',
                password=generate_password_hash('admin123'),
                role='admin',
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.session.add(admin_user)
            print("✅ Created admin user: admin/admin123")
        else:
            print("ℹ️  Admin user already exists")
        
        # Create test locations
        locations_data = [
            {
                'name': 'Test Location',
                'location_name': 'Test Location',
                'location_username': 'test_location',
                'location_password': generate_password_hash('test_location123'),
                'mall': 'Test Mall',
                'address': '123 Test Street, Test City',
                'phone': '+1-555-0123',
                'email': 'test@monumevip.com'
            },
            {
                'name': 'Queens Location',
                'location_name': 'Queens Location',
                'location_username': 'queens',
                'location_password': generate_password_hash('queens123'),
                'mall': 'Queens Mall',
                'address': '456 Queens Boulevard, Queens, NY',
                'phone': '+1-555-0456',
                'email': 'queens@monumevip.com'
            }
        ]
        
        for location_data in locations_data:
            existing_location = Location.query.filter_by(
                location_username=location_data['location_username']
            ).first()
            
            if not existing_location:
                location = Location(**location_data)
                location.is_active = True
                location.created_at = datetime.utcnow()
                db.session.add(location)
                print(f"✅ Created location: {location_data['location_username']}/{location_data['location_username']}123")
            else:
                print(f"ℹ️  Location {location_data['location_username']} already exists")
        
        # Commit all changes
        try:
            db.session.commit()
            print("\n🎉 Test data created successfully!")
            print("\nLogin credentials:")
            print("Admin: admin / admin123")
            print("Location 1: test_location / test_location123")
            print("Location 2: queens / queens123")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating test data: {e}")
            return False
            
    return True

if __name__ == '__main__':
    print("MonuMe VIP - Test Data Creator")
    print("=" * 40)
    
    try:
        success = create_test_data()
        if success:
            print("\n✅ All done! You can now test the login system.")
        else:
            print("\n❌ Failed to create test data.")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1) 