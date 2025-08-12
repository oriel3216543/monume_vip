#!/usr/bin/env python3
"""
Fix admin user location assignment
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import app, db, User, Location

def fix_admin_location():
    with app.app_context():
        try:
            # Find the admin user
            admin = User.query.filter_by(username="admin").first()
            if not admin:
                print("❌ Admin user not found")
                return
            
            # Find the queens location
            queens_location = Location.query.filter_by(name="queens").first()
            if not queens_location:
                print("❌ Queens location not found")
                return
            
            # Update admin user to have queens location
            admin.location_id = queens_location.id
            db.session.commit()
            
            print(f"✅ Updated admin user to have location: {queens_location.name}")
            
            # Verify the change
            admin = User.query.filter_by(username="admin").first()
            location_name = admin.location.name if admin.location else "No location"
            print(f"✅ Admin user now has location: {location_name}")
            
        except Exception as e:
            print(f"Error fixing admin location: {e}")
            db.session.rollback()
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    fix_admin_location() 