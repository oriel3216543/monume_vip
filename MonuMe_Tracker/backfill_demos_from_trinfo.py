#!/usr/bin/env python3
"""
Backfill Demos and SalesHours from legacy TRinfo file store.
Reads files under instance/TRinfo.db/<username>_<YYYY-MM-DD>.json
and writes to Demos and SalesHours tables by resolving username to user_id.
"""
import os
import json
from datetime import datetime

from server import app, db, User, Demos, SalesHours


def iter_trinfo_entries(base_dir: str):
    if not os.path.isdir(base_dir):
        return
    for name in os.listdir(base_dir):
        if not name.endswith('.json'):
            continue
        fp = os.path.join(base_dir, name)
        try:
            with open(fp, 'r', encoding='utf-8') as f:
                entries = json.load(f)
                for e in entries:
                    yield e
        except Exception:
            continue


def resolve_user_id(username: str):
    if not username:
        return None
    user = User.query.filter_by(username=username).first()
    return user.id if user else None


def backfill():
    base = os.path.join('instance', 'TRinfo.db')
    inserted_demos = 0
    upserted_sales_hours = 0
    for e in iter_trinfo_entries(base):
        username = e.get('username')
        date_str = e.get('date')
        if not (username and date_str):
            continue
        try:
            day = datetime.strptime(date_str, '%Y-%m-%d').date()
        except Exception:
            continue
        user_id = resolve_user_id(username)
        if not user_id:
            continue

        # Demos: sum opal and scan demos
        total_demos = int(e.get('opal_demos') or 0) + int(e.get('scan_demos') or 0)
        row = Demos.query.filter_by(user_id=user_id, date=day).first()
        if row:
            row.demos = total_demos
            row.source = 'manual'
            row.updated_at = datetime.utcnow()
        else:
            db.session.add(Demos(user_id=user_id, date=day, demos=total_demos, source='manual'))
        inserted_demos += 1

        # SalesHours from net_sales and hours_worked if present
        sales_val = int(float(e.get('net_sales') or 0))
        hours_val = float(e.get('hours_worked') or 0)
        if sales_val or hours_val:
            sh = SalesHours.query.filter_by(user_id=user_id, date=day).first()
            if sh:
                sh.sales = sales_val
                sh.hours = hours_val
                sh.source = 'manual'
            else:
                db.session.add(SalesHours(user_id=user_id, date=day, sales=sales_val, hours=hours_val, source='manual'))
            upserted_sales_hours += 1

    db.session.commit()
    return inserted_demos, upserted_sales_hours


if __name__ == '__main__':
    with app.app_context():
        demos, sh = backfill()
        print(f"Backfill complete: demos upserts={demos}, sales_hours upserts={sh}")


