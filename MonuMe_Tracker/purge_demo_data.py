#!/usr/bin/env python3
import os
import json
from datetime import datetime

from server import db, User, Location, TrackingData, TRINFO_DB_DIR

# Heuristics for demo/test detection
DEMO_USERNAMES = {
    'admin', 'testuser', 'sales1_testloc1', 'sales2_testloc1', 'manager_testloc1', 'employee_testloc1',
    'sales1_testloc2', 'sales2_testloc2', 'manager_testloc2', 'employee_testloc2'
}
DEMO_LOCATION_USERNAMES = {'test_location', 'testloc1', 'testloc2'}


def is_demo_user(user: User) -> bool:
    if user.username in DEMO_USERNAMES:
        return True
    # Any user whose location is a demo location
    if user.location and user.location.location_username in DEMO_LOCATION_USERNAMES:
        return True
    # Emails containing monumevip.com test patterns
    if user.email and 'test' in user.email:
        return True
    return False


def is_demo_location(loc: Location) -> bool:
    if loc.location_username in DEMO_LOCATION_USERNAMES:
        return True
    if 'Test Location' in (loc.name or '') or 'Test' in (loc.location_name or ''):
        return True
    return False


def purge_trinfo_files():
    removed = 0
    if os.path.isdir(TRINFO_DB_DIR):
        for name in os.listdir(TRINFO_DB_DIR):
            if name.lower().startswith(('test', 'sales', 'manager', 'employee')) or name.endswith('.json'):
                try:
                    os.remove(os.path.join(TRINFO_DB_DIR, name))
                    removed += 1
                except Exception:
                    pass
    return removed


def main():
    print('Purging demo data...')
    removed_users = 0
    removed_locations = 0
    removed_tracking = 0

    # Remove demo tracking first to avoid FK issues
    for td in TrackingData.query.all():
        user = User.query.get(td.user_id)
        loc = Location.query.get(td.location_id)
        if (user and is_demo_user(user)) or (loc and is_demo_location(loc)):
            db.session.delete(td)
            removed_tracking += 1
    db.session.commit()

    # Remove demo users
    for user in User.query.all():
        if is_demo_user(user):
            db.session.delete(user)
            removed_users += 1
    db.session.commit()

    # Remove demo locations
    for loc in Location.query.all():
        if is_demo_location(loc):
            db.session.delete(loc)
            removed_locations += 1
    db.session.commit()

    # Remove TRinfo files
    removed_files = purge_trinfo_files()

    print(f'Removed users: {removed_users}')
    print(f'Removed locations: {removed_locations}')
    print(f'Removed tracking rows: {removed_tracking}')
    print(f'Removed TRinfo files: {removed_files}')


if __name__ == '__main__':
    from server import app
    with app.app_context():
        main()
