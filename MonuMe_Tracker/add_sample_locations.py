#!/usr/bin/env python3
"""
Add sample locations to the database for testing location login functionality
"""

import os
import sys
from werkzeug.security import generate_password_hash

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import app, db
from models import Location

def add_sample_locations():
    """Add sample locations to the database"""
    
    with app.app_context():
        # Check if locations already exist
        existing_locations = Location.query.all()
        if existing_locations:
            print(f"Found {len(existing_locations)} existing locations:")
            for loc in existing_locations:
                print(f"  - {loc.name} (Username: {loc.location_username})")
            return
        
        # Sample locations data
        sample_locations = [
            {
                'name': 'Test Location',
                'location_name': 'Test Location',
                'location_username': 'test_location',
                'location_password': generate_password_hash('test_location123'),
                'mall': 'Test Mall',
                'address': '123 Test Street, Test City, TC 12345',
                'phone': '(555) 123-4567',
                'email': 'test@monumevip.com',
                'is_active': True
            },
            {
                'name': 'Queens Location',
                'location_name': 'Queens Location',
                'location_username': 'queens',
                'location_password': generate_password_hash('queens123'),
                'mall': 'Queens Center Mall',
                'address': '90-15 Queens Blvd, Queens, NY 11373',
                'phone': '(555) 987-6543',
                'email': 'queens@monumevip.com',
                'is_active': True
            },
            {
                'name': 'Brooklyn Location',
                'location_name': 'Brooklyn Location',
                'location_username': 'brooklyn',
                'location_password': generate_password_hash('brooklyn123'),
                'mall': 'Kings Plaza',
                'address': '5100 Kings Plaza, Brooklyn, NY 11234',
                'phone': '(555) 456-7890',
                'email': 'brooklyn@monumevip.com',
                'is_active': True
            },
            {
                'name': 'Manhattan Location',
                'location_name': 'Manhattan Location',
                'location_username': 'manhattan',
                'location_password': generate_password_hash('manhattan123'),
                'mall': 'Manhattan Mall',
                'address': '100 W 33rd St, New York, NY 10001',
                'phone': '(555) 321-0987',
                'email': 'manhattan@monumevip.com',
                'is_active': True
            }
        ]
        
        # Add locations to database
        for location_data in sample_locations:
            location = Location(**location_data)
            db.session.add(location)
            print(f"Adding location: {location.name}")
        
        try:
            db.session.commit()
            print(f"\nSuccessfully added {len(sample_locations)} sample locations!")
            print("\nLocation login credentials:")
            print("=" * 50)
            for loc in sample_locations:
                print(f"Location: {loc['name']}")
                print(f"Username: {loc['location_username']}")
                print(f"Password: {loc['location_username']}123")
                print("-" * 30)
            
        except Exception as e:
            db.session.rollback()
            print(f"Error adding locations: {str(e)}")
            return False
        
        return True

if __name__ == '__main__':
    print("Adding sample locations to database...")
    print("=" * 50)
    
    success = add_sample_locations()
    
    if success:
        print("\n✅ Sample locations added successfully!")
        print("\nYou can now test location login with:")
        print("  - Username: test_location, Password: test_location123")
        print("  - Username: queens, Password: queens123")
        print("  - Username: brooklyn, Password: brooklyn123")
        print("  - Username: manhattan, Password: manhattan123")
    else:
        print("\n❌ Failed to add sample locations!")
        sys.exit(1) 