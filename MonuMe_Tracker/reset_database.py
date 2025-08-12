#!/usr/bin/env python3
"""
Database Reset Script for MonuMe Tracker
Fixes database schema issues and recreates tables
"""

import os
import sys
from datetime import datetime

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from server import app, db, User, Location, Appointment
    from werkzeug.security import generate_password_hash
    print("✅ Successfully imported server modules")
except ImportError as e:
    print(f"❌ Error importing server modules: {e}")
    sys.exit(1)

def reset_database():
    """Reset the database and recreate all tables"""
    print("🔄 Starting database reset...")
    
    try:
        with app.app_context():
            # Drop all tables
            print("🗑️ Dropping all existing tables...")
            db.drop_all()
            
            # Create all tables
            print("🏗️ Creating new tables...")
            db.create_all()
            
            # Create admin user
            print("👑 Creating admin user...")
            admin_user = User(
                name='Admin',
                email='admin@monumevip.com',
                username='admin',
                password=generate_password_hash('ori3'),
                role='admin',
                is_active=True
            )
            db.session.add(admin_user)
            
            # Create sample location
            print("🏢 Creating sample location...")
            sample_location = Location(
                name='Sample Location',
                location_name='Sample Location',
                location_username='sample_location',
                location_password=generate_password_hash('password123'),
                mall='Sample Mall',
                address='123 Sample Street',
                phone='555-0123',
                email='sample@monumevip.com',
                unique_url_slug='sample-location',
                is_active=True
            )
            db.session.add(sample_location)
            
            # Commit changes
            db.session.commit()
            
            print("✅ Database reset completed successfully!")
            print("📊 Database Summary:")
            print(f"   - Users: {User.query.count()}")
            print(f"   - Locations: {Location.query.count()}")
            print(f"   - Appointments: {Appointment.query.count()}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        db.session.rollback()
        return False

if __name__ == '__main__':
    print("🚀 MonuMe Tracker Database Reset")
    print("=" * 40)
    
    # Confirm reset
    response = input("⚠️ This will DELETE ALL DATA and recreate the database. Continue? (y/N): ")
    if response.lower() != 'y':
        print("❌ Database reset cancelled")
        sys.exit(0)
    
    # Perform reset
    if reset_database():
        print("\n🎉 Database reset successful!")
        print("You can now start the server with: python server.py")
    else:
        print("\n💥 Database reset failed!")
        sys.exit(1) 