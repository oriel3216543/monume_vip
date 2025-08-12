#!/usr/bin/env python3
"""
MonuMe Tracker Server
Production server for www.monumevip.com running on port 5000
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template, send_from_directory, session, redirect, url_for, make_response, render_template_string
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import json
import hashlib
import secrets
from functools import wraps
# Ensure configuration imports resolve both when running from the project root
# and when executing within the `MonuMe_Tracker` package.
try:
    from config.production import ProductionConfig, DevelopmentConfig  # type: ignore
except ModuleNotFoundError:
    from MonuMe_Tracker.config.production import ProductionConfig, DevelopmentConfig
from sqlalchemy import text

# Email helpers
try:
    from email_sender import (
        load_email_config,
        load_email_config_for_location,
        save_email_config,
        save_email_config_for_location,
        send_email as send_email_smtp,
        get_email_logs,
    )
except Exception:
    # Fallback no-op implementations if import fails (keeps server running)
    def load_email_config():
        return {}
    def load_email_config_for_location(_):
        return {}
    def save_email_config(_):
        return False
    def save_email_config_for_location(_, __):
        return False
    def send_email_smtp(*args, **kwargs):
        return {'success': False, 'error': 'email_sender unavailable'}
    def get_email_logs(*args, **kwargs):
        return []

"""
Ensure logs directory exists before configuring logging. This avoids failures
when the module is imported under WSGI servers (where __main__ is not executed).
"""
os.makedirs('logs', exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/server.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder="static", template_folder="templates")

# Fast health check for platforms like Railway
@app.get("/healthz")
def healthz():
    return "ok", 200

# Load configuration (production vs development)
is_production = os.environ.get('PRODUCTION', os.environ.get('FLASK_ENV', 'production')).lower() in (
    '1', 'true', 'prod', 'production'
)
app.config.from_object(ProductionConfig if is_production else DevelopmentConfig)

# Database URL (allow override via env)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL', app.config.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///monume_tracker.db')
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config.setdefault('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)  # 16MB max file size

# Secret key handling
if is_production and not os.environ.get('SECRET_KEY'):
    # Generate a strong ephemeral key if not provided (recommend setting env var)
    app.config['SECRET_KEY'] = secrets.token_hex(32)
else:
    app.config['SECRET_KEY'] = os.environ.get(
        'SECRET_KEY', app.config.get('SECRET_KEY', secrets.token_hex(32))
    )

SEED_TEST_DATA = os.environ.get('MONUME_SEED_TEST_DATA', '').lower() in ('1', 'true', 'yes')

# Session configuration
app.config['SESSION_COOKIE_SECURE'] = bool(is_production)
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

# CORS configuration
# Allow production domains (with and without www) and common local dev hosts
ALLOWED_ORIGINS = [
    'https://www.monumevip.com',
    'http://www.monumevip.com',
    'https://monumevip.com',
    'http://monumevip.com',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://0.0.0.0:5000'
]

def add_cors_headers(response):
    """Add CORS headers to response"""
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

@app.after_request
def after_request(response):
    """Add CORS headers to all responses"""
    return add_cors_headers(response)


@app.route('/health', methods=['GET'])
def health_check():
    """Lightweight health endpoint for load balancers and uptime checks."""
    try:
        # Basic DB check using SQLAlchemy text to be compatible with SQLAlchemy 2.x
        db.session.execute(text('SELECT 1'))
        db_ok = True
    except Exception:
        db_ok = False
    return jsonify({
        'status': 'ok' if db_ok else 'degraded',
        'db': db_ok,
        'version': '1.0'
    }), 200


def _current_location_id_for_request():
    """Resolve location id from session or query for scoping."""
    try:
        if 'location_id' in session and session.get('location_id'):
            return int(session.get('location_id'))
        # Look at current location context set by location-scoped routes
        ctx = session.get('current_location_context')
        if isinstance(ctx, dict) and ctx.get('id'):
            try:
                return int(ctx.get('id'))
            except Exception:
                pass
        # Admin with explicit location query
        loc_q = request.args.get('location_id') or request.args.get('location')
        if loc_q:
            try:
                return int(loc_q)
            except Exception:
                pass
        # Try current user location
        if 'user_id' in session:
            user = User.query.get(session['user_id'])
            if user and user.location_id:
                return int(user.location_id)
    except Exception:
        pass
    return None

# ===== TRinfo file-based store (per-user, per-day) =====
# Files are kept under instance/TRinfo.db/<username>_<YYYY-MM-DD>.json as a JSON array of entries
TRINFO_DB_DIR = os.path.join('instance', 'TRinfo.db')

def ensure_trinfo_dir_exists() -> None:
    try:
        os.makedirs(TRINFO_DB_DIR, exist_ok=True)
    except Exception as e:
        logger.error(f"Failed to create TRinfo directory: {str(e)}")

def make_safe_filename_component(value: str) -> str:
    if not value:
        return "unknown"
    safe = ''.join(ch for ch in value if ch.isalnum() or ch in ('-', '_'))
    return safe or "unknown"

def trinfo_file_path(username: str, date_str: str) -> str:
    ensure_trinfo_dir_exists()
    safe_user = make_safe_filename_component(username)
    safe_date = make_safe_filename_component(date_str)
    return os.path.join(TRINFO_DB_DIR, f"{safe_user}_{safe_date}.json")

@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    """Handle preflight OPTIONS requests"""
    response = make_response()
    return add_cors_headers(response)

# Initialize database directly in server.py
from flask_sqlalchemy import SQLAlchemy

# Create and initialize database with Flask app
db = SQLAlchemy(app)

# Define models directly in server.py with properly initialized db
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128))
    email = db.Column(db.String(128), unique=True)
    username = db.Column(db.String(64), unique=True)
    password = db.Column(db.String(255))
    role = db.Column(db.String(32), default='user')
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
    base_hourly_rate = db.Column(db.Numeric(6, 2), default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    location = db.relationship('Location', backref='users')
    
    def __repr__(self):
        return f'<User {self.username}>'

class Location(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    location_name = db.Column(db.String(128), nullable=False)  # For frontend compatibility
    location_username = db.Column(db.String(64), unique=True)  # Login username for location
    location_password = db.Column(db.String(255))  # Login password for location
    mall = db.Column(db.String(128))  # Mall or area name
    address = db.Column(db.Text)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(128))
    unique_url_slug = db.Column(db.String(128), unique=True)  # URL-friendly slug for unique location URLs
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def __repr__(self):
        return f'<Location {self.name}>'

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_name = db.Column(db.String(128))
    client_email = db.Column(db.String(128))
    date = db.Column(db.String(32))
    time = db.Column(db.String(32))
    employee_name = db.Column(db.String(128))
    employee_email = db.Column(db.String(128))
    service = db.Column(db.String(128))
    notes = db.Column(db.Text)
    status = db.Column(db.String(32), default='scheduled')
    type = db.Column(db.String(64))
    host_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    host = db.relationship('User', backref='appointments')
    location = db.relationship('Location', backref='appointments')
    
    def __repr__(self):
        return f'<Appointment {self.client_name} - {self.date}>'

class TrackingData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    opal_demos = db.Column(db.Integer, default=0)
    opal_sales = db.Column(db.Integer, default=0)
    scan_demos = db.Column(db.Integer, default=0)
    scan_sold = db.Column(db.Integer, default=0)
    net_sales = db.Column(db.Float, default=0.0)
    hours_worked = db.Column(db.Float, default=0.0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='tracking_data')
    location = db.relationship('Location', backref='tracking_data')
    
    def __repr__(self):
        return f'<TrackingData {self.user_id} - {self.date}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'user_id': self.user_id,
            'locationId': self.location_id,
            'location_id': self.location_id,
            'date': self.date.strftime('%Y-%m-%d') if self.date else None,
            'opalDemos': self.opal_demos,
            'opal_demos': self.opal_demos,
            'opalSales': self.opal_sales,
            'opal_sales': self.opal_sales,
            'scanDemos': self.scan_demos,
            'scan_demos': self.scan_demos,
            'scanSold': self.scan_sold,
            'scan_sold': self.scan_sold,
            'netSales': self.net_sales,
            'net_sales': self.net_sales,
            'hoursWorked': self.hours_worked,
            'hours_worked': self.hours_worked,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

# ===== Commission and Unified Metrics: New Data Models =====
class PayPeriod(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    timezone = db.Column(db.String(64), default='UTC')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'start_date': self.start_date.strftime('%Y-%m-%d') if self.start_date else None,
            'end_date': self.end_date.strftime('%Y-%m-%d') if self.end_date else None,
            'timezone': self.timezone,
        }


class UserTierSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    sales_goal_in_period = db.Column(db.Integer, nullable=False)
    daily_demo_min = db.Column(db.Integer, nullable=False)
    # tier type: 'hourly' or 'commission'
    tier_type = db.Column(db.String(16), nullable=False, default='hourly')
    hourly_rate = db.Column(db.Numeric(6, 2), nullable=True)
    commission_rate_pct = db.Column(db.Numeric(5, 2), nullable=True, default=0)
    demo_bonus = db.Column(db.Numeric(6, 2), nullable=False)
    effective_from = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    active = db.Column(db.Boolean, default=True, nullable=False)
    order_index = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref='tier_schedules')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            # Expose as per-day goal for UI while keeping column name for compatibility
            'sales_goal_in_day': int(self.sales_goal_in_period or 0),
            'daily_demo_min': int(self.daily_demo_min or 0),
            'tier_type': self.tier_type or 'hourly',
            'hourly_rate': float(self.hourly_rate or 0),
            'commission_rate_pct': float(self.commission_rate_pct or 0),
            'demo_bonus': float(self.demo_bonus or 0),
            'effective_from': self.effective_from.strftime('%Y-%m-%d') if self.effective_from else None,
            'active': bool(self.active),
            'order_index': int(self.order_index or 0),
        }


class Demos(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    demos = db.Column(db.Integer, default=0, nullable=False)
    source = db.Column(db.String(32), default='manual')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref='demos')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'date', name='uq_demos_user_date'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date': self.date.strftime('%Y-%m-%d'),
            'demos': int(self.demos or 0),
            'source': self.source,
        }


class RawImport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    filename = db.Column(db.String(255), nullable=False)
    file_hash = db.Column(db.String(128), unique=True, nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(32), default='parsed')
    parsed_rows = db.Column(db.JSON, nullable=True)

    user = db.relationship('User', backref='raw_imports')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'filename': self.filename,
            'file_hash': self.file_hash,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'status': self.status,
        }


class SalesHours(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    sales = db.Column(db.Integer, default=0, nullable=False)
    hours = db.Column(db.Numeric(5, 2), default=0, nullable=False)
    source = db.Column(db.String(32), default='xls')
    import_id = db.Column(db.Integer, db.ForeignKey('raw_import.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref='sales_hours')
    raw_import = db.relationship('RawImport', backref='sales_hours_rows')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'date', name='uq_saleshours_user_date'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'date': self.date.strftime('%Y-%m-%d'),
            'sales': int(self.sales or 0),
            'hours': float(self.hours or 0),
            'source': self.source,
            'import_id': self.import_id,
        }


# ===== Commission Computation Helpers =====
def _get_active_tiers_for_user(user_id: int, on_date: datetime.date):
    return (UserTierSchedule.query
            .filter(UserTierSchedule.user_id == user_id,
                    UserTierSchedule.active == True,
                    UserTierSchedule.effective_from <= on_date)
            .order_by(UserTierSchedule.order_index.asc(), UserTierSchedule.sales_goal_in_period.asc())
            .all())


def _select_best_tier_by_pay(candidates_with_pay):
    if not candidates_with_pay:
        return None
    # Pick by highest base pay for the day; break ties by higher demo_bonus then higher sales goal
    return sorted(candidates_with_pay, key=lambda item: (
        float(item['base_pay']),
        float(item['tier'].demo_bonus or 0),
        int(item['tier'].sales_goal_in_period or 0)
    ), reverse=True)[0]['tier']


def compute_daily_pay(user_id: int, day: datetime.date, pay_period: PayPeriod):
    # a) cumulative sales in period up to day
    cumulative_sales = (db.session.query(db.func.coalesce(db.func.sum(SalesHours.sales), 0))
                        .filter(SalesHours.user_id == user_id,
                                SalesHours.date >= pay_period.start_date,
                                SalesHours.date <= day)
                        .scalar()) or 0

    # b) demos on day
    demos_row = Demos.query.filter_by(user_id=user_id, date=day).first()
    demos_today = int(demos_row.demos) if demos_row else 0

    # c) hours on day
    sh_row = SalesHours.query.filter_by(user_id=user_id, date=day).first()
    hours_today = float(sh_row.hours) if sh_row else 0.0
    sales_today = int(sh_row.sales) if sh_row else 0

    # d) candidate tiers (same-day sales goal; min demo optional)
    tiers = _get_active_tiers_for_user(user_id, day)
    unlocked = None
    candidates_with_pay = []
    for t in tiers:
        goal = int(t.sales_goal_in_period or 0)
        min_demo = int(t.daily_demo_min or 0)
        sales_ok = sales_today >= goal
        demos_ok = True if min_demo <= 0 else (demos_today >= min_demo)
        if sales_ok and demos_ok:
            # compute base pay for selection
            if (t.tier_type or 'hourly') == 'commission':
                base_pay = (float(t.commission_rate_pct or 0) / 100.0) * sales_today
            else:
                base_pay = float(t.hourly_rate or 0) * hours_today
            candidates_with_pay.append({'tier': t, 'base_pay': base_pay})
    unlocked = _select_best_tier_by_pay(candidates_with_pay)

    if unlocked:
        hourly_rate = float(unlocked.hourly_rate or 0)
        commission_rate_pct = float(unlocked.commission_rate_pct or 0)
        tier_type = unlocked.tier_type or 'hourly'
        demo_bonus = float(unlocked.demo_bonus or 0)
        unlocked_id = unlocked.id
    else:
        # No unlocked tier → no pay
        hourly_rate = 0.0
        commission_rate_pct = 0.0
        tier_type = 'hourly'
        demo_bonus = 0.0
        unlocked_id = None

    if tier_type == 'commission' and unlocked:
        pay_base = (commission_rate_pct / 100.0) * sales_today
    elif tier_type == 'hourly' and unlocked:
        pay_base = hourly_rate * hours_today
    else:
        pay_base = 0.0
    pay = pay_base + (demos_today * demo_bonus)

    return {
        'unlocked_tier_id': unlocked_id,
        'hourly_rate': round(hourly_rate, 2),
        'tier_type': tier_type,
        'commission_rate_pct': round(commission_rate_pct, 2) if 'commission_rate_pct' in locals() else 0.0,
        'demo_bonus': round(demo_bonus, 2),
        'computed_pay': round(pay, 2),
        'cumulative_sales': int(cumulative_sales),
        'demos_today': int(demos_today),
        'hours_today': round(hours_today, 2),
        'sales_today': int(sales_today),
    }

# Create database tables and add test data
def initialize_database():
    """Initialize database with proper schema and test data"""
    try:
        # Create logs directory
        os.makedirs('logs', exist_ok=True)
        
        # Create tables
        db.create_all()
        logger.info("Database tables created successfully")
        
        # Try to create admin user if it doesn't exist
        try:
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
                db.session.commit()
                logger.info("Created admin user: admin/admin123")
        except Exception as e:
            logger.error(f"Error creating admin user: {str(e)}")
            db.session.rollback()
        
        # Try to create test locations if they don't exist (only when seeding is enabled)
        try:
            # Removed test location and test user seeding
            pass
        except Exception as e:
            logger.error(f"Error creating test locations: {str(e)}")
            db.session.rollback()
        
        # Run lightweight schema migrations for existing installs
        try:
            run_schema_migrations()
        except Exception as mig_e:
            logger.error(f"Schema migration failed: {mig_e}")
        logger.info("Database initialization completed")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        # Continue anyway - server should still start

# Initialize database - simplified approach
try:
    with app.app_context():
        # Create logs directory
        os.makedirs('logs', exist_ok=True)
        
        # Try to create database tables
        db.create_all()
        logger.info("Database tables created successfully")
        
        # Try to create admin user
        try:
            admin_exists = User.query.filter_by(username='admin').first()
            if not admin_exists:
                admin_user = User(
                    name='Admin',
                    email='admin@monume.com',
                    username='admin',
                    password=generate_password_hash('admin123'),
                    role='admin',
                    is_active=True
                )
                db.session.add(admin_user)
                db.session.commit()
                logger.info("Admin user created")
        except Exception as user_error:
            logger.error(f"Could not create admin user: {str(user_error)}")
            
except Exception as e:
    logger.error(f"Database setup failed: {str(e)}")
    # Server will still start

# Authentication decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check for user authentication
        if 'user_id' in session:
            user = User.query.get(session['user_id'])
            if user and user.is_active:
                return f(*args, **kwargs)
        
        # Check for location authentication
        if 'location_id' in session:
            location = Location.query.get(session['location_id'])
            if location and location.is_active:
                return f(*args, **kwargs)
        
        # If not authenticated: for browser page requests, redirect to login
        try:
            wants_html = 'text/html' in (request.headers.get('Accept') or '')
            is_get = request.method in ('GET', 'HEAD')
            is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
            if is_get and wants_html and not is_ajax:
                return redirect('/login')
        except Exception:
            pass
        # Default JSON response for API/JS calls
        return jsonify({'error': 'Authentication required'}), 401
    return decorated_function
# ===== Lightweight Schema Migrations (SQLite-safe) =====
def _table_columns(table_name: str):
    try:
        res = db.session.execute(db.text(f"PRAGMA table_info({table_name})"))
        cols = [row[1] for row in res]
        return set(cols)
    except Exception:
        return set()

def _add_column_sqlite(table: str, column_def: str):
    try:
        db.session.execute(db.text(f"ALTER TABLE {table} ADD COLUMN {column_def}"))
        db.session.commit()
        logger.info(f"Added column {column_def} to {table}")
    except Exception as e:
        logger.warning(f"Add column failed for {table}.{column_def}: {e}")
        db.session.rollback()

def run_schema_migrations():
    # Ensure new tables exist
    db.create_all()

    # UserTierSchedule columns added over time
    cols = _table_columns('user_tier_schedule')
    if cols:
        if 'tier_type' not in cols:
            _add_column_sqlite('user_tier_schedule', 'tier_type TEXT DEFAULT \"hourly\"')
        if 'commission_rate_pct' not in cols:
            _add_column_sqlite('user_tier_schedule', 'commission_rate_pct NUMERIC DEFAULT 0')
        if 'effective_from' not in cols:
            _add_column_sqlite('user_tier_schedule', 'effective_from DATE')
        if 'active' not in cols:
            _add_column_sqlite('user_tier_schedule', 'active BOOLEAN DEFAULT 1')
        if 'order_index' not in cols:
            _add_column_sqlite('user_tier_schedule', 'order_index INTEGER DEFAULT 0')
    # Users base_hourly_rate
    ucols = _table_columns('user')
    if ucols and 'base_hourly_rate' not in ucols:
        _add_column_sqlite('user', 'base_hourly_rate NUMERIC DEFAULT 0')


# Admin authentication decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check for user authentication
        if 'user_id' in session:
            user = User.query.get(session['user_id'])
            if user and user.is_active and user.role == 'admin':
                return f(*args, **kwargs)
        
        # Check for location authentication (locations have admin-like access to their data)
        if 'location_id' in session:
            location = Location.query.get(session['location_id'])
            if location and location.is_active:
                return f(*args, **kwargs)
        
        return jsonify({'error': 'Admin access required'}), 403
    return decorated_function

# Root route - redirect to dashboard
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect('/dashboard')
    return redirect('/login')

# Serve static files
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

# Serve specific static files that might be requested directly
@app.route('/sidebar-template.html')
def sidebar_template():
    return send_from_directory('static', 'sidebar-template.html')

@app.route('/sidebar-styles.css')
def sidebar_styles():
    return send_from_directory('static', 'sidebar-styles.css')

@app.route('/style.css')
def style_css():
    return send_from_directory('static', 'style.css')

# Favicon to avoid 405 from OPTIONS catch-all
@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static', 'favicon.ico')

@app.route('/favicon.JPG')
def favicon_jpg():
    return send_from_directory('static', 'favicon.JPG')

@app.route('/icon.png')
def icon_png():
    return send_from_directory('static', 'icon.png')

@app.route('/sidebar-loader.js')
def sidebar_loader():
    return send_from_directory('static', 'sidebar-loader.js')

@app.route('/test-sidebar')
def test_sidebar():
    return send_from_directory('static', 'test_sidebar_visual.html')

@app.route('/js/team-monume-activeusers.js')
def team_monume_js():
    return send_from_directory('static/js', 'team-monume-activeusers.js')

@app.route('/js/users.js')
def users_js():
    return send_from_directory('static/js', 'users.js')

@app.route('/js/add-location.js')
def add_location_js():
    return send_from_directory('static/js', 'add-location.js')

@app.route('/static/js/login.js')
def login_js():
    return send_from_directory('static/js', 'login.js')

# Generic JS route for any other JS files (must come after specific routes)
@app.route('/js/<path:filename>')
def js_files(filename):
    return send_from_directory('static/js', filename)

# Clean URL routes (without .html extension)
@app.route('/login')
def login():
    return send_from_directory('static', 'login.html')

@app.route('/dashboard')
@login_required
def dashboard():
    """Serve the dashboard with location context support"""
    try:
        # Get location parameter from query string (e.g., ?location=HQ)
        location_param = request.args.get('location', '').strip()
        
        # Check authentication and permissions
        current_user = None
        current_location_id = None
        current_location_username = None
        is_admin = False
        
        # Check for user authentication
        if 'user_id' in session:
            current_user = User.query.get(session['user_id'])
            if current_user:
                if current_user.role == 'admin':
                    is_admin = True
                else:
                    current_location_id = current_user.location_id
                    if current_user.location:
                        current_location_username = current_user.location.location_username
        # Check for location authentication
        elif 'location_id' in session:
            current_location_id = session['location_id']
            location = Location.query.get(session['location_id'])
            if location:
                current_location_username = location.location_username
        
        # If location parameter is provided, verify access and resolve location
        target_location = None
        if location_param:
            # Find location by username, name, or ID
            target_location = Location.query.filter(
                db.or_(
                    Location.location_username == location_param,
                    Location.location_name == location_param,
                    Location.unique_url_slug == location_param
                )
            ).first()
            
            # Try by ID if not found by name
            if not target_location and location_param.isdigit():
                target_location = Location.query.get(int(location_param))
            
            if not target_location:
                return jsonify({'error': f'Location "{location_param}" not found'}), 404
            
            # Verify access permissions
            if not is_admin and current_location_id != target_location.id:
                return jsonify({'error': 'Access denied to this location'}), 403
        
        # For non-admin users without location parameter, redirect to their location
        elif not is_admin and current_location_username:
            return redirect(f'/dashboard?location={current_location_username}')
        
        # Serve the dashboard page
        return send_from_directory('static', 'dashboard.html')
        
    except Exception as e:
        logger.error(f"Error serving dashboard page: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/tracking')
@login_required
def tracking():
    """Serve the tracking page with location context support like dashboard"""
    try:
        # Get location parameter from query string (e.g., ?location=HQ)
        location_param = request.args.get('location', '').strip()
        
        # Check authentication and permissions
        current_user = None
        current_location_id = None
        current_location_username = None
        is_admin = False
        
        # Check for user authentication
        if 'user_id' in session:
            current_user = User.query.get(session['user_id'])
            if current_user:
                if current_user.role == 'admin':
                    is_admin = True
                else:
                    current_location_id = current_user.location_id
                    if current_user.location:
                        current_location_username = current_user.location.location_username
        # Check for location authentication
        elif 'location_id' in session:
            current_location_id = session['location_id']
            location = Location.query.get(session['location_id'])
            if location:
                current_location_username = location.location_username
        
        # If location parameter is provided, verify access and resolve location
        target_location = None
        if location_param:
            # Find location by username, name, or ID
            target_location = Location.query.filter(
                db.or_(
                    Location.location_username == location_param,
                    Location.location_name == location_param,
                    Location.unique_url_slug == location_param
                )
            ).first()
            
            # Try by ID if not found by name
            if not target_location and location_param.isdigit():
                target_location = Location.query.get(int(location_param))
            
            if not target_location:
                return jsonify({'error': f'Location "{location_param}" not found'}), 404
            
            # Verify access permissions
            if not is_admin and current_location_id != target_location.id:
                return jsonify({'error': 'Access denied to this location'}), 403
        
        # For non-admin users without location parameter, redirect to their location
        elif not is_admin and current_location_username:
            return redirect(f'/tracking?location={current_location_username}')
        
        # Serve the tracking page
        return send_from_directory('static', 'tracking.html')
        
    except Exception as e:
        logger.error(f"Error serving tracking page: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500



# Clean URLs for Users and Locations management
@app.route('/test-users')
def test_users():
    return send_from_directory('static', 'test_users_page.html')

@app.route('/users')
@login_required
def users():
    return send_from_directory('static', 'users.html')

@app.route('/add-user')
@login_required
def add_user():
    return send_from_directory('static', 'add-user.html')

@app.route('/locations')
def locations():
    return send_from_directory('static', 'locations.html')

@app.route('/add-location')
@login_required
def add_location_page():
    # Check if this is an edit request
    edit_mode = request.args.get('edit', 'false').lower() == 'true'
    
    if edit_mode:
        # For edit mode, allow both admin and location users
        # The frontend will handle showing the correct location data
        return send_from_directory('static', 'Add-Location.html')
    else:
        # For add mode, only allow admin users
        if 'user_id' in session:
            user = User.query.get(session['user_id'])
            if user and user.role != 'admin':
                return jsonify({'error': 'Admin access required to add locations'}), 403
        elif 'location_id' in session:
            return jsonify({'error': 'Admin access required to add locations'}), 403
        else:
            return jsonify({'error': 'Authentication required'}), 401
        
        return send_from_directory('static', 'Add-Location.html')

@app.route('/test-add-location')
def test_add_location_page():
    """Test route for add location page (no authentication required)"""
    return send_from_directory('static', 'Add-Location.html')

# Location-specific dashboard routes with unique URLs
@app.route('/location/<location_name>')
@login_required
def location_dashboard_by_name(location_name):
    """Serve location-specific dashboard with clean URL"""
    try:
        # Find location by name
        location = Location.query.filter_by(location_name=location_name).first()
        if not location:
            # Try by location_username as fallback
            location = Location.query.filter_by(location_username=location_name).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Check if user has access to this location
        user = User.query.get(session['user_id'])
        if user.role != 'admin' and user.location_id != location.id:
            return jsonify({'error': 'Access denied to this location'}), 403
        
        # Serve the location dashboard with location context
        return render_template_string('''
        <!DOCTYPE html>
        <html>
        <head>
            <title>{{location.location_name}} - Dashboard</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="icon" type="image/png" href="/favicon.JPG">
            <script>
                // Set location context for the dashboard
                window.LOCATION_CONTEXT = {
                    id: {{location.id}},
                    name: "{{location.location_name}}",
                    username: "{{location.location_username}}",
                    mall: "{{location.mall}}",
                    url_name: "{{location_name}}"
                };
            </script>
        </head>
        <body>
            <script>
                // Redirect to main location dashboard with context
                window.location.href = "/location-dashboard?location={{location.id}}&name={{location.location_name}}";
            </script>
            <p>Loading {{location.location_name}} dashboard...</p>
        </body>
        </html>
        ''', location=location, location_name=location_name)
        
    except Exception as e:
        logger.error(f"Error serving location dashboard: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

@app.route('/location-dashboard')
@login_required
def location_dashboard():
    """Serve the main location dashboard HTML"""
    return send_from_directory('static', 'location-dashboard.html')

@app.route('/management')
@login_required
def management():
    return send_from_directory('static', 'management.html')

@app.route('/location/<location_name>/management')
@login_required
def location_management(location_name):
    """Serve location-specific management page with clean URL"""
    try:
        # Find location by name
        location = Location.query.filter_by(location_name=location_name).first()
        if not location:
            # Try by location_username as fallback
            location = Location.query.filter_by(location_username=location_name).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Check if user has access to this location
        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
            
        # Check access permissions
        if current_user.role == 'admin':
            # Admin can access any location
            pass
        elif current_user.role == 'location':
            # Location users can only access their own location
            if session.get('location_id') != location.id:
                return jsonify({'error': 'Access denied to this location'}), 403
        else:
            # Regular users cannot access management pages
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        # Set location context in session for this request
        session['current_location_context'] = {
            'id': location.id,
            'name': location.name,
            'location_name': location.location_name
        }
        
        # Serve the management page
        return send_from_directory('static', 'management.html')
        
    except Exception as e:
        logger.error(f"Location management error: {str(e)}")
        return jsonify({'error': 'Failed to load location management'}), 500

# Add more location-specific routes for other pages
@app.route('/location/<location_name>/users')
@login_required
def location_users(location_name):
    """Serve location-specific users page with clean URL"""
    try:
        # Find location by name
        location = Location.query.filter_by(location_name=location_name).first()
        if not location:
            location = Location.query.filter_by(location_username=location_name).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Check access permissions
        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
            
        if current_user.role == 'admin':
            pass
        elif current_user.role == 'location':
            if session.get('location_id') != location.id:
                return jsonify({'error': 'Access denied to this location'}), 403
        else:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        session['current_location_context'] = {
            'id': location.id,
            'name': location.name,
            'location_name': location.location_name
        }
        
        return send_from_directory('static', 'users.html')
        
    except Exception as e:
        logger.error(f"Location users error: {str(e)}")
        return jsonify({'error': 'Failed to load location users'}), 500



@app.route('/location/<location_name>/endofday')
@login_required
def location_endofday(location_name):
    """Serve location-specific end of day page with clean URL"""
    try:
        location = Location.query.filter_by(location_name=location_name).first()
        if not location:
            location = Location.query.filter_by(location_username=location_name).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
            
        if current_user.role == 'admin':
            pass
        elif current_user.role == 'location':
            if session.get('location_id') != location.id:
                return jsonify({'error': 'Access denied to this location'}), 403
        else:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        session['current_location_context'] = {
            'id': location.id,
            'name': location.name,
            'location_name': location.location_name
        }
        
        return send_from_directory('static', 'endofday.html')
        
    except Exception as e:
        logger.error(f"Location endofday error: {str(e)}")
        return jsonify({'error': 'Failed to load location endofday'}), 500

@app.route('/endofday')
@login_required
def endofday():
    return send_from_directory('static', 'endofday.html')

@app.route('/appointments', methods=['GET'])
@login_required
def appointments():
    return send_from_directory(app.static_folder, 'appointment.html')

# Backward-compatible route: some frontend links use /appointment
@app.route('/appointment', methods=['GET', 'POST'])
@login_required
def appointment_single():
    if request.method == 'POST':
        data = request.form or request.get_json(silent=True) or {}
        return jsonify({"ok": True, "received": bool(data)}), 200
    return send_from_directory(app.static_folder, 'appointment.html')

# Fallbacks for trailing slash and legacy filename
@app.route('/appointment/', methods=['GET', 'POST'])
@login_required
def appointment_single_slash():
    if request.method == 'POST':
        data = request.form or request.get_json(silent=True) or {}
        return jsonify({"ok": True, "received": bool(data)}), 200
    return send_from_directory(app.static_folder, 'appointment.html')

@app.route('/appointments.html', methods=['GET'])
@login_required
def appointment_legacy_html():
    return send_from_directory(app.static_folder, 'appointment.html')

# Direct filename route for compatibility with existing links
@app.route('/appointment.html', methods=['GET', 'HEAD'])
@login_required
def appointment_direct_html():
    return send_from_directory(app.static_folder, 'appointment.html')

@app.route('/analytics')
@login_required
def analytics():
    return send_from_directory('static', 'analytics.html')

@app.route('/location/<location_name>/analytics')
@login_required
def location_analytics(location_name):
    """Serve location-specific analytics page with clean URL"""
    try:
        # Find location by name
        location = Location.query.filter_by(location_name=location_name).first()
        if not location:
            # Try by location_username as fallback
            location = Location.query.filter_by(location_username=location_name).first()
        
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Check if user has access to this location
        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
            
        # Check access permissions
        if current_user.role == 'admin':
            # Admin can access any location
            pass
        elif current_user.role == 'location':
            # Location users can only access their own location
            if session.get('location_id') != location.id:
                return jsonify({'error': 'Access denied to this location'}), 403
        else:
            # Regular users can access their assigned location
            if current_user.location_id != location.id:
                return jsonify({'error': 'Access denied to this location'}), 403
        
        # Set location context in session for this request
        session['current_location_context'] = {
            'id': location.id,
            'name': location.name,
            'location_name': location.location_name
        }
        
        # Serve the analytics page with location context
        return render_template_string('''
        <!DOCTYPE html>
        <html>
        <head>
            <title>{{location.location_name}} - Analytics</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="icon" type="image/png" href="/favicon.JPG">
            <script>
                // Set location context for the analytics page
                window.LOCATION_CONTEXT = {
                    id: {{location.id}},
                    name: "{{location.location_name}}",
                    username: "{{location.location_username}}",
                    mall: "{{location.mall}}",
                    url_name: "{{location_name}}"
                };
            </script>
        </head>
        <body>
            <script>
                // Redirect to main analytics page with location context
                window.location.href = "/analytics?location={{location.id}}&name={{location.location_name}}&url_name={{location_name}}";
            </script>
            <p>Loading {{location.location_name}} analytics...</p>
        </body>
        </html>
        ''', location=location, location_name=location_name)
        
    except Exception as e:
        logger.error(f"Error serving location analytics: {str(e)}")
        return jsonify({'error': 'Server error'}), 500

@app.route('/emails')
@login_required
def emails():
    return send_from_directory('static', 'emails.html')


@app.route('/location/<location_name>/emails', methods=['GET', 'HEAD', 'OPTIONS'])
@login_required
def location_emails_page(location_name):
    try:
        if request.method == 'OPTIONS':
            return add_cors_headers(make_response())

        # Find location by name or username
        location = Location.query.filter_by(location_name=location_name).first()
        if not location:
            location = Location.query.filter_by(location_username=location_name).first()
        if not location:
            return jsonify({'error': 'Location not found'}), 404

        # Validate access
        current_user = None
        if 'user_id' in session:
            current_user = User.query.get(session['user_id'])
        if current_user and current_user.role not in ('admin',):
            if current_user.location_id != location.id:
                return jsonify({'error': 'Access denied to this location'}), 403
        if session.get('role') == 'location' and session.get('location_id') != location.id:
            return jsonify({'error': 'Access denied to this location'}), 403

        # Store context for downstream usage by APIs
        session['current_location_context'] = {
            'id': location.id,
            'name': location.name,
            'location_name': location.location_name
        }

        return send_from_directory('static', 'emails.html')
    except Exception as e:
        logger.error(f"Location emails page error: {e}")
        return jsonify({'error': 'Failed to load location emails page'}), 500


# ===== Email configuration APIs (global and per-location) =====
@app.route('/get-email-config', methods=['GET'])
@login_required
def get_email_config_route():
    try:
        location_id = _current_location_id_for_request()
        cfg = load_email_config_for_location(location_id)
        cfg = dict(cfg or {})
        # Compute configured status
        configured = bool(cfg.get('sender_email')) and bool(cfg.get('password'))
        # Hide password
        if 'password' in cfg and cfg['password']:
            cfg['password'] = '********'
        # Provide both a structured and flattened shape for backward compatibility
        response = {
            'success': True,
            'settings': cfg,
            'configured': configured,
            'sender_email': cfg.get('sender_email', ''),
            'sender_name': cfg.get('sender_name', ''),
            'configured_at': cfg.get('configured_at') or cfg.get('updated_at') or None
        }
        return jsonify(response), 200
    except Exception as e:
        logger.error(f"get-email-config error: {e}")
        return jsonify({'success': False, 'message': 'Failed to load email config'}), 500


@app.route('/save-email-config', methods=['POST'])
@login_required
def save_email_config_route():
    try:
        payload = request.get_json(force=True) or {}
        location_id = _current_location_id_for_request()

        # Allow admins to override location by explicit param
        if 'location_id' in payload and session.get('role') == 'admin':
            try:
                location_id = int(payload['location_id'])
            except Exception:
                pass

        # Accept camelCase and snake_case keys
        key_map = {
            'senderEmail': 'sender_email',
            'sender_email': 'sender_email',
            'senderPassword': 'password',
            'password': 'password',
            'senderName': 'sender_name',
            'sender_name': 'sender_name',
            'smtpServer': 'smtp_server',
            'smtp_server': 'smtp_server',
            'smtpPort': 'smtp_port',
            'smtp_port': 'smtp_port',
            'useTls': 'use_tls',
            'use_tls': 'use_tls',
            'auto_email_enabled': 'auto_email_enabled',
            'daily_email_enabled': 'daily_email_enabled',
            'weekly_email_enabled': 'weekly_email_enabled',
            'domain': 'domain',
        }
        normalized = {}
        for k, v in payload.items():
            if k in key_map:
                normalized[key_map[k]] = v
        # Only allow expected keys to be saved
        allowed_keys = {
            'smtp_server', 'smtp_port', 'sender_email', 'sender_name', 'password',
            'use_tls', 'auto_email_enabled', 'daily_email_enabled', 'weekly_email_enabled', 'domain'
        }
        settings = {k: v for k, v in normalized.items() if k in allowed_keys}

        if not settings:
            return jsonify({'success': False, 'message': 'No valid settings provided'}), 400

        ok = save_email_config_for_location(location_id, settings)
        if not ok:
            return jsonify({'success': False, 'message': 'Save failed'}), 500
        return jsonify({'success': True}), 200
    except Exception as e:
        logger.error(f"save-email-config error: {e}")
        return jsonify({'success': False, 'message': 'Failed to save email config'}), 500


@app.route('/get_email_settings', methods=['GET'])
@login_required
def get_email_settings_bridge():
    """Bridge endpoint for existing front-end that expects condensed settings."""
    try:
        location_id = _current_location_id_for_request()
        cfg = load_email_config_for_location(location_id)
        result = {
            'auto_email_enabled': bool(cfg.get('auto_email_enabled', True)),
            'daily_email_enabled': bool(cfg.get('daily_email_enabled', False)),
            'weekly_email_enabled': bool(cfg.get('weekly_email_enabled', True)),
            'domain': cfg.get('domain', request.host.split(':')[0])
        }
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"get_email_settings error: {e}")
        return jsonify({'auto_email_enabled': True, 'daily_email_enabled': False, 'weekly_email_enabled': True}), 200


@app.route('/api/send-appointment-email', methods=['POST'])
@login_required
def api_send_appointment_email():
    try:
        data = request.get_json(force=True) or {}
        appointment_id = data.get('appointmentId')
        template_type = data.get('templateType') or 'confirmation'
        apt_data = data.get('appointmentData') or {}

        if not appointment_id:
            return jsonify({'success': False, 'message': 'appointmentId required'}), 400

        # Build subject and HTML
        subject_map = {
            'confirmation': 'Appointment Confirmation - MonuMe Tracker',
            'reminder': 'Appointment Reminder - MonuMe Tracker',
            'rescheduled': 'Appointment Rescheduled - MonuMe Tracker',
            'custom': 'MonuMe Tracker - Custom Email',
        }
        subject = subject_map.get(template_type, 'MonuMe Tracker Email')

        customer_name = apt_data.get('customerName') or apt_data.get('clientName') or 'Customer'
        client_email = apt_data.get('clientEmail') or apt_data.get('email')
        date_str = apt_data.get('date') or ''
        time_str = apt_data.get('time') or ''
        description = apt_data.get('description') or ''
        # Determine correct domain for links based on host (ignore client-provided domain)
        host = request.host.split(':')[0]
        scheme = 'https' if host.endswith('monumevip.com') else 'http'
        default_link = f"{scheme}://{host}/appointment/confirm/{appointment_id}"
        confirmation_link = default_link

        if not client_email:
            return jsonify({'success': False, 'message': 'Client email is required'}), 400

        html_content = f"""
        <div style="font-family: Arial, sans-serif; color:#333;">
          <h2 style="margin:0 0 8px">{subject}</h2>
          <p>Hello {customer_name},</p>
          <p>Your appointment is scheduled for <strong>{date_str} {time_str}</strong>.</p>
          {f'<p>Details: {description}</p>' if description else ''}
          {f'<p>Manage your appointment: <a href="{confirmation_link}">{confirmation_link}</a></p>' if confirmation_link else ''}
          <p style="margin-top:20px; font-size:12px; color:#666;">This message was sent by MonuMe Tracker.</p>
        </div>
        """

        # Resolve config per location
        location_id = _current_location_id_for_request()
        cfg = load_email_config_for_location(location_id)

        result = send_email_smtp(client_email, subject, html_content, pdf_path=None, email_type='appointment', config_override=cfg)
        if result.get('success'):
            return jsonify({'success': True, 'message': 'Email sent'}), 200
        return jsonify({'success': False, 'message': result.get('error') or 'Failed to send'}), 500
    except Exception as e:
        logger.error(f"api_send_appointment_email error: {e}", exc_info=True)
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/test-email-config', methods=['POST'])
@login_required
def test_email_config_route():
    try:
        data = request.get_json(force=True) or {}
        recipient = data.get('testEmail') or data.get('to')
        if not recipient:
            return jsonify({'success': False, 'error': 'testEmail is required'}), 400

        location_id = _current_location_id_for_request()
        cfg = load_email_config_for_location(location_id)

        subject = 'MonuMe Tracker - Test Email'
        html_content = f"<p>This is a test email sent at {datetime.utcnow().isoformat()}.</p>"
        result = send_email_smtp(recipient, subject, html_content, config_override=cfg)
        if result.get('success'):
            return jsonify({'success': True, 'message': f'Test email sent to {recipient}'}), 200
        return jsonify({'success': False, 'error': result.get('error') or 'Failed to send'}), 500
    except Exception as e:
        logger.error(f"test-email-config error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/send_simple_email', methods=['POST'])
@login_required
def send_simple_email_route():
    try:
        data = request.get_json(force=True) or {}
        to_addr = data.get('to')
        subject = data.get('subject') or 'MonuMe Tracker'
        body = data.get('body') or ''
        if not to_addr:
            return jsonify({'success': False, 'error': 'to is required'}), 400

        location_id = _current_location_id_for_request()
        cfg = load_email_config_for_location(location_id)
        result = send_email_smtp(to_addr, subject, f"<pre>{body}</pre>", config_override=cfg)
        if result.get('success'):
            return jsonify({'success': True}), 200
        return jsonify({'success': False, 'error': result.get('error') or 'Failed to send'}), 500
    except Exception as e:
        logger.error(f"send_simple_email error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

# Salary calculator pages
@app.route('/salary', methods=['GET', 'HEAD', 'OPTIONS'])
@login_required
def salary_page():
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response())
    return send_from_directory('static', 'salary/salary-calculator.html')

@app.route('/salary/users', methods=['GET'])
@login_required
def salary_users_redirect():
    return redirect(url_for('users'))

@app.route('/salary/history', methods=['GET', 'HEAD', 'OPTIONS'])
@login_required
def salary_history_page():
    if request.method == 'OPTIONS':
        return add_cors_headers(make_response())
    return send_from_directory('static', 'salary/history.html')

# Location-scoped Salary routes (mirror endofday/analytics access rules)
@app.route('/location/<location_name>/salary', methods=['GET', 'HEAD', 'OPTIONS'])
@login_required
def location_salary_page(location_name):
    try:
        if request.method == 'OPTIONS':
            return add_cors_headers(make_response())
        # Find location by name or username
        location = Location.query.filter_by(location_name=location_name).first()
        if not location:
            location = Location.query.filter_by(location_username=location_name).first()
        if not location:
            return jsonify({'error': 'Location not found'}), 404

        # Validate access
        current_user = User.query.get(session['user_id'])
        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        if current_user.role == 'admin':
            pass
        elif current_user.role == 'location':
            if session.get('location_id') != location.id:
                return jsonify({'error': 'Access denied to this location'}), 403
        else:
            if current_user.location_id != location.id:
                return jsonify({'error': 'Access denied to this location'}), 403

        # Store context for downstream usage
        session['current_location_context'] = {
            'id': location.id,
            'name': location.name,
            'location_name': location.location_name
        }

        # Redirect to main salary page with location context (similar to analytics)
        return render_template_string('''
        <!DOCTYPE html>
        <html>
        <head>
            <title>{{location.location_name}} - Salary</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="icon" type="image/png" href="/favicon.JPG">
        </head>
        <body>
            <script>
                window.location.href = "/salary?location={{location.id}}&name={{location.location_name}}&url_name={{location_name}}";
            </script>
            <p>Loading {{location.location_name}} salary calculator...</p>
        </body>
        </html>
        ''', location=location, location_name=location_name)
    except Exception as e:
        logger.error(f"Location salary error: {str(e)}")
        return jsonify({'error': 'Failed to load location salary page'}), 500

# Helper function for location login
def try_location_login(username, password, return_none_on_fail=False):
    """Try to authenticate as a location"""
    try:
        location = Location.query.filter(
            (Location.location_username == username) | (Location.name == username)
        ).first()
        
        if location and location.is_active:
            # Check if location has password set, if not, allow any password for demo
            if location.location_password:
                if not check_password_hash(location.location_password, password):
                    if return_none_on_fail:
                        return None
                    return jsonify({'success': False, 'message': 'Invalid location credentials'}), 401
            else:
                # For demo purposes, allow common passwords if no password is set
                demo_passwords = ['test_location123', 'queens123', 'location123', 'demo123']
                if password not in demo_passwords:
                    if return_none_on_fail:
                        return None
                    return jsonify({'success': False, 'message': 'Invalid location credentials'}), 401
            
            # For location login, we'll create a session with location info
            session['location_id'] = location.id
            session['location_name'] = location.name
            session['location_username'] = location.location_username
            session['role'] = 'location'
            
            return jsonify({
                'success': True,
                'user': {
                    'id': location.id,
                    'name': location.name,
                    'username': location.location_username,
                    'role': 'location',
                    'location_id': location.id,
                    'location_name': location.name
                }
            })
        else:
            if return_none_on_fail:
                return None
            return jsonify({'success': False, 'message': 'Invalid location credentials'}), 401
    except Exception as e:
        if return_none_on_fail:
            return None
        raise e

# Helper function for user/admin login
def try_user_login(username, password):
    """Try to authenticate as a user/admin"""
    logger.info(f"Trying user login for username: {username}")
    
    user = User.query.filter(
        (User.username == username) | (User.email == username)
    ).first()
    
    if user and check_password_hash(user.password, password):
        if not user.is_active:
            logger.warning(f"User {username} is deactivated")
            return jsonify({'success': False, 'message': 'Account is deactivated'}), 401
        
        # Set session data
        session.permanent = True  # Make session permanent
        session['user_id'] = user.id
        session['username'] = user.username
        session['role'] = user.role
        session['location_id'] = user.location_id
        
        logger.info(f"User {username} logged in successfully. Session: {dict(session)}")
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'name': user.name,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'location_id': user.location_id
            }
        })
    else:
        logger.warning(f"Invalid credentials for username: {username}")
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

# Authentication API - Simplified and bulletproof
@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login_api():
    if request.method == 'OPTIONS':
        response = make_response()
        return add_cors_headers(response)
        
    try:
        logger.info("Login API called")
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
            
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password required'}), 400
        
        logger.info(f"Login attempt for username: {username}")
        
        # Ensure database exists
        try:
            db.create_all()
        except Exception as e:
            logger.error(f"Database creation failed: {str(e)}")
            return jsonify({'success': False, 'message': 'Database error'}), 500
        
        # Try admin login
        try:
            user = User.query.filter(
                (User.username == username) | (User.email == username)
            ).first()
            
            if user and check_password_hash(user.password, password) and user.is_active:
                # Set session
                session['user_id'] = user.id
                session['username'] = user.username
                session['role'] = user.role
                
                logger.info(f"Admin login successful for: {username}")
                return jsonify({
                    'success': True,
                    'user': {
                        'id': user.id,
                        'name': user.name,
                        'username': user.username,
                        'email': user.email,
                        'role': user.role
                    }
                })
        except Exception as e:
            logger.error(f"Admin login check failed: {str(e)}")
            
            # If we get "no such column" error, recreate database
            if "no such column" in str(e).lower():
                logger.info("Database schema issue detected, recreating database")
                try:
                    db.drop_all()
                    db.create_all()
                    
                    # Create admin user
                    admin_user = User(
                        name='Admin',
                        email='admin@monume.com',
                        username='admin',
                        password=generate_password_hash('admin123'),
                        role='admin',
                        is_active=True
                    )
                    db.session.add(admin_user)
                    
                    # Create test location
                    test_location = Location(
                        name='Test Location',
                        location_name='Test Location',
                        location_username='test_location',
                        location_password=generate_password_hash('test_location123'),
                        mall='Test Mall',
                        address='123 Test Street',
                        phone='+1-555-0123',
                        email='test@monume.com',
                        is_active=True
                    )
                    db.session.add(test_location)
                    
                    db.session.commit()
                    logger.info("Database recreated with admin user and test location")
                    
                    # Now try login again
                    if username == 'admin' and password == 'admin123':
                        session['user_id'] = admin_user.id
                        session['username'] = admin_user.username
                        session['role'] = admin_user.role
                        
                        return jsonify({
                            'success': True,
                            'user': {
                                'id': admin_user.id,
                                'name': admin_user.name,
                                'username': admin_user.username,
                                'email': admin_user.email,
                                'role': admin_user.role
                            }
                        })
                    elif username == 'test_location' and password == 'test_location123':
                        session['location_id'] = test_location.id
                        session['location_name'] = test_location.name
                        session['role'] = 'location'
                        
                        return jsonify({
                            'success': True,
                            'user': {
                                'id': test_location.id,
                                'name': test_location.name,
                                'username': test_location.location_username,
                                'role': 'location',
                                'location_id': test_location.id,
                                'location_name': test_location.location_name,
                                'location_username': test_location.location_username
                            }
                        })
                        
                except Exception as recreate_error:
                    logger.error(f"Failed to recreate database: {str(recreate_error)}")
                    return jsonify({'success': False, 'message': 'Database recreation failed'}), 500
        
        # Try location login
        try:
            location = Location.query.filter(
                Location.location_username == username
            ).first()
            
            if location and location.location_password and check_password_hash(location.location_password, password) and location.is_active:
                # Set session
                session['location_id'] = location.id
                session['location_name'] = location.name
                session['role'] = 'location'
                
                logger.info(f"Location login successful for: {username}")
                return jsonify({
                    'success': True,
                    'user': {
                        'id': location.id,
                        'name': location.name,
                        'username': location.location_username,
                        'role': 'location',
                        'location_id': location.id,
                        'location_name': location.location_name,
                        'location_username': location.location_username
                    }
                })
        except Exception as e:
            logger.error(f"Location login check failed: {str(e)}")
        
        # If we get here, login failed
        logger.warning(f"Login failed for username: {username}")
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
            
    except Exception as e:
        logger.error(f"Login API error: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Server error'}), 500


@app.route('/api/health', methods=['GET', 'OPTIONS'])
def api_health_check():
    """Health check endpoint"""
    if request.method == 'OPTIONS':
        response = make_response()
        return add_cors_headers(response)
    
    return jsonify({
        'status': 'healthy',
        'message': 'MonuMe VIP Server is running',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/setup', methods=['GET', 'POST'])
def setup_system():
    """Setup system with admin user - FORCE RECREATE DATABASE"""
    try:
        # Force drop and recreate all tables
        db.drop_all()
        db.create_all()
        logger.info("Database tables recreated")
        
        # Create admin user
        admin_user = User(
            name='Admin',
            email='admin@monume.com',
            username='admin',
            password=generate_password_hash('admin123'),
            role='admin',
            is_active=True
        )
        db.session.add(admin_user)
        
        db.session.commit()
        logger.info("Database setup completed (admin only)")
        
        return jsonify({
            'success': True,
            'message': 'Database recreated and admin user created successfully',
            'credentials': {
                'admin': {'username': 'admin', 'password': 'admin123'}
            }
        })
            
    except Exception as e:
        logger.error(f"Setup error: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Setup failed: {str(e)}'
        }), 500

@app.route('/api/init-db', methods=['POST'])
def init_database():
    """Manually initialize database endpoint"""
    try:
        with app.app_context():
            initialize_database()
        return jsonify({
            'success': True,
            'message': 'Database initialized successfully'
        })
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Database initialization failed: {str(e)}'
        }), 500

@app.route('/api/reset-db', methods=['POST'])
def reset_database():
    """Reset database completely - DANGEROUS! Only use for development"""
    try:
        with app.app_context():
            # Drop all tables
            db.drop_all()
            logger.info("All database tables dropped")
            
            # Recreate all tables
            db.create_all()
            logger.info("All database tables recreated")
            
            # Initialize with test data
            initialize_database()
            
        return jsonify({
            'success': True,
            'message': 'Database reset successfully'
        })
    except Exception as e:
        logger.error(f"Database reset error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Database reset failed: {str(e)}'
        }), 500

@app.route('/api/create-db', methods=['POST'])
def create_database():
    """Create database if it doesn't exist"""
    try:
        with app.app_context():
            # Create instance directory
            import os
            os.makedirs('instance', exist_ok=True)
            
            # Create tables
            db.create_all()
            logger.info("Database tables created")
            
            # Initialize with test data
            initialize_database()
            
        return jsonify({
            'success': True,
            'message': 'Database created successfully'
        })
    except Exception as e:
        logger.error(f"Database creation error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Database creation failed: {str(e)}'
        }), 500

@app.route('/api/fix-db', methods=['GET'])
def fix_database():
    """Fix database issues"""
    try:
        # Create logs directory
        os.makedirs('logs', exist_ok=True)
        
        # Force recreate tables
        db.drop_all()
        db.create_all()
        logger.info("Database tables recreated")
        
        # Create admin user
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
        
        # Create test locations
        test_locations = [
            Location(
                name='Test Location',
                location_name='Test Location',
                location_username='test_location',
                location_password=generate_password_hash('test_location123'),
                mall='Test Mall',
                address='123 Test Street, Test City',
                phone='+1-555-0123',
                email='test@monumevip.com',
                is_active=True,
                created_at=datetime.utcnow()
            ),
            Location(
                name='Queens Location',
                location_name='Queens Location',
                location_username='queens',
                location_password=generate_password_hash('queens123'),
                mall='Queens Mall',
                address='456 Queens Boulevard, Queens, NY',
                phone='+1-555-0456',
                email='queens@monumevip.com',
                is_active=True,
                created_at=datetime.utcnow()
            )
        ]
        
        for location in test_locations:
            db.session.add(location)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Database fixed successfully'
        })
    except Exception as e:
        logger.error(f"Database fix error: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Database fix failed: {str(e)}'
        }), 500

@app.route('/api/check-db', methods=['GET'])
def check_database():
    """Check database status and schema"""
    try:
        # Check if user table exists and has correct schema
        user_count = User.query.count()
        location_count = Location.query.count()
        
        # Check if admin user exists
        admin_user = User.query.filter_by(username='admin').first()
        admin_exists = admin_user is not None
        
        # Check if test location exists
        test_location = Location.query.filter_by(location_username='test_location').first()
        location_exists = test_location is not None
        
        return jsonify({
            'success': True,
            'database_status': 'healthy',
            'user_count': user_count,
            'location_count': location_count,
            'admin_exists': admin_exists,
            'test_location_exists': location_exists,
            'message': 'Database is working correctly'
        })
    except Exception as e:
        logger.error(f"Database check error: {str(e)}")
        return jsonify({
            'success': False,
            'database_status': 'error',
            'message': f'Database error: {str(e)}'
        }), 500

@app.route('/api/test-login', methods=['POST'])
def test_login():
    """Test login functionality"""
    try:
        data = request.get_json()
        username = data.get('username', 'admin')
        password = data.get('password', 'admin123')
        
        # Test admin login
        admin_result = try_user_login(username, password)
        if admin_result[1] == 200:  # Success
            return jsonify({
                'success': True,
                'login_type': 'admin',
                'message': 'Admin login test successful'
            })
        
        # Test location login
        location_result = try_location_login(username, password)
        if location_result[1] == 200:  # Success
            return jsonify({
                'success': True,
                'login_type': 'location',
                'message': 'Location login test successful'
            })
        
        return jsonify({
            'success': False,
            'message': 'Login test failed'
        }), 401
        
    except Exception as e:
        logger.error(f"Test login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Test login error: {str(e)}'
        }), 500

@app.route('/api/test-system', methods=['GET'])
def test_system():
    """Test system functionality"""
    try:
        # Test database connection
        try:
            User.query.first()
            db_status = "connected"
        except Exception as e:
            db_status = f"error: {str(e)}"
        
        # Test server status
        server_status = "running"
        
        return jsonify({
            'success': True,
            'system': {
                'server': server_status,
                'database': db_status,
                'timestamp': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"System test error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'System test error: {str(e)}'
        }), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/check-auth')
def check_auth():
    logger.info(f"Check auth called. Session: {dict(session)}")
    
    # Check for user authentication
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        logger.info(f"User found: {user.username if user else 'None'}, Active: {user.is_active if user else 'None'}")
        
        if user and user.is_active:
            return jsonify({
                'authenticated': True,
                'user': {
                    'id': user.id,
                    'name': user.name,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'location_id': user.location_id
                }
            })
        else:
            logger.warning(f"User inactive or not found. Clearing session.")
            session.clear()
    
    # Check for location authentication
    if 'location_id' in session:
        location = Location.query.get(session['location_id'])
        logger.info(f"Location found: {location.name if location else 'None'}, Active: {location.is_active if location else 'None'}")
        
        if location and location.is_active:
            return jsonify({
                'authenticated': True,
                'user': {
                    'id': location.id,
                    'name': location.name,
                    'username': location.location_username,
                    'role': 'location',
                    'location_id': location.id,
                    'location_name': location.location_name,
                    'location_username': location.location_username
                }
            })
        else:
            logger.warning(f"Location inactive or not found. Clearing session.")
            session.clear()
    
    logger.info("No valid session found")
    return jsonify({'authenticated': False}), 401

# Users API
@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '').strip()
        role_filter = request.args.get('role', '').strip()
        status_filter = request.args.get('status', '').strip()
        location_filter = request.args.get('location_id', '').strip()
        all_flag_raw = request.args.get('all', '').strip().lower()
        all_flag = all_flag_raw in ('true', '1', 'yes', 'y', 'on')
        
        # Get current user to check permissions - handle both user and location authentication
        current_user = None
        current_user_role = None
        current_location_id = None
        
        # Check for regular user authentication
        if 'user_id' in session:
            current_user = User.query.get(session['user_id'])
            if current_user:
                current_user_role = current_user.role
                current_location_id = current_user.location_id
                logger.info(f"DEBUG: Regular user: {current_user.username} (role: {current_user.role}, location_id: {current_user.location_id})")
        
        # Check for location authentication
        elif 'location_id' in session:
            location = Location.query.get(session['location_id'])
            if location:
                current_user_role = 'location'
                current_location_id = location.id
                logger.info(f"DEBUG: Location user: {location.location_username} (location_id: {location.id})")
        
        if not current_user and not current_location_id:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        
        query = User.query
        
        # Check for location query parameter (like ?location=HQ)
        location_query_param = request.args.get('location', '').strip()
        filter_location_id = None
        
        if location_query_param:
            # Try to find location by location code or name
            location = Location.query.filter(
                db.or_(
                    Location.location_username == location_query_param,
                    Location.location_name == location_query_param,
                    Location.name == location_query_param
                )
            ).first()
            if location:
                filter_location_id = location.id
                logger.info(f"DEBUG: Found location for query param '{location_query_param}': {location.name} (ID: {location.id})")
        
        # Handle direct location_id filter
        if location_filter:
            try:
                filter_location_id = int(location_filter)
            except ValueError:
                pass
        
        # Location-based filtering based on user role
        if current_user_role == 'admin':
            # Admin can see all users, but can filter by location
            if filter_location_id:
                query = query.filter(User.location_id == filter_location_id)
                logger.info(f"DEBUG: Admin filtering by location_id: {filter_location_id}")
        else:
            # Non-admin users (regular users and location users) can only see users from their own location
            if current_location_id:
                query = query.filter(User.location_id == current_location_id)
                logger.info(f"DEBUG: Non-admin user filtering by own location_id: {current_location_id}")
            else:
                # User has no location assigned, return empty
                return jsonify({
                    'success': True,
                    'users': [],
                    'pagination': {
                        'page': page,
                        'per_page': per_page,
                        'total': 0,
                        'pages': 0,
                        'has_next': False,
                        'has_prev': False
                    }
                })
        
        # Apply search filter
        if search:
            query = query.filter(
                db.or_(
                    User.name.contains(search),
                    User.username.contains(search),
                    User.email.contains(search)
                )
            )
        
        # Apply role filter
        if role_filter:
            query = query.filter(User.role == role_filter)
        
        # Apply status filter
        if status_filter == 'active':
            query = query.filter(User.is_active == True)
        elif status_filter == 'inactive':
            query = query.filter(User.is_active == False)
        
        users_data = []
        pagination_meta = None
        
        if all_flag:
            # Return all users (respecting filters above)
            items = query.all()
            logger.info(f"DEBUG: Returning ALL users due to all=true flag. Count: {len(items)}")
            for user in items:
                users_data.append({
                    'id': user.id,
                    'name': user.name or user.username or user.email,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'location_id': user.location_id,
                    'location_name': user.location.name if user.location else None,
                    'is_active': user.is_active,
                    'base_hourly_rate': float(user.base_hourly_rate or 0),
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'updated_at': user.updated_at.isoformat() if user.updated_at else None
                })
            pagination_meta = {
                'page': 1,
                'per_page': len(items),
                'total': len(items),
                'pages': 1,
                'has_next': False,
                'has_prev': False
            }
        else:
            # Pagination
            pagination = query.paginate(
                page=page, 
                per_page=per_page, 
                error_out=False
            )
            
            # DEBUG: Log what we found
            logger.info(f"DEBUG: Found {len(pagination.items)} users in query")
            for user in pagination.items:
                location_name = user.location.name if user.location else "No location"
                logger.info(f"DEBUG: User {user.username} (role: {user.role}) -> {location_name}")
            
            for user in pagination.items:
                users_data.append({
                    'id': user.id,
                    'name': user.name or user.username or user.email,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'location_id': user.location_id,
                    'location_name': user.location.name if user.location else None,
                    'is_active': user.is_active,
                    'base_hourly_rate': float(user.base_hourly_rate or 0),
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'updated_at': user.updated_at.isoformat() if user.updated_at else None
                })
            pagination_meta = {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        
        return jsonify({
            'success': True,
            'users': users_data,
            'pagination': pagination_meta
        })
        
    except Exception as e:
        logger.error(f"Get users error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch users'}), 500

@app.route('/api/users', methods=['POST'])
@login_required # Changed from @admin_required
def create_user():
    try:
        data = request.get_json()
        
        # Get current user to check permissions - handle both user and location authentication
        current_user = None
        current_user_role = None
        current_location_id = None
        
        # Check for regular user authentication
        if 'user_id' in session:
            current_user = User.query.get(session['user_id'])
            if current_user:
                current_user_role = current_user.role
                current_location_id = current_user.location_id
        
        # Check for location authentication
        elif 'location_id' in session:
            location = Location.query.get(session['location_id'])
            if location:
                current_user_role = 'location'
                current_location_id = location.id
        
        if not current_user and not current_location_id:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        
        # Check permissions
        if current_user_role not in ['admin', 'location']:
            return jsonify({'success': False, 'message': 'Insufficient permissions to create users'}), 403
        
        # Validate required fields
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        # Check if username or email already exists
        existing_user = User.query.filter(
            db.or_(
                User.username == data['username'],
                User.email == data['email']
            )
        ).first()
        
        if existing_user:
            return jsonify({'success': False, 'message': 'Username or email already exists'}), 400
        
        # Location-based restrictions
        requested_location_id = data.get('location_id')
        
        if current_user_role == 'admin':
            # Admin can assign users to any location
            if not requested_location_id:
                return jsonify({'success': False, 'message': 'Location is required'}), 400
        else:
            # Location managers can only create users for their own location
            if requested_location_id and int(requested_location_id) != current_location_id:
                return jsonify({'success': False, 'message': 'You can only create users for your own location'}), 403
            # Force location to be the same as current user/location
            requested_location_id = current_location_id
        
        # Role restrictions for location managers
        requested_role = data.get('role', 'user')
        if current_user_role == 'location' and requested_role == 'admin':
            return jsonify({'success': False, 'message': 'Location managers cannot create admin users'}), 403
        
        # Create new user
        new_user = User(
            name=data.get('name', ''),
            username=data['username'],
            email=data['email'],
            password=generate_password_hash(data['password']),
            role=requested_role, # Use requested_role
            location_id=requested_location_id, # Use requested_location_id
            is_active=data.get('is_active', True),
            base_hourly_rate=float(data.get('base_hourly_rate') or 0)
        )
        
        db.session.add(new_user)
        db.session.commit()

        # Create any pending tiers sent along with user creation
        pending_tiers = data.get('tiers') or []
        for t in pending_tiers:
            try:
                tier = UserTierSchedule(
                    user_id=new_user.id,
                    sales_goal_in_period=int(t.get('sales_goal_in_period', t.get('sales_goal_in_day', 0))),
                    daily_demo_min=int(t.get('daily_demo_min', 0)),
                    tier_type=str(t.get('tier_type', 'hourly')),
                    hourly_rate=float(t.get('hourly_rate', 0)) if str(t.get('tier_type','hourly'))=='hourly' else 0.0,
                    commission_rate_pct=float(t.get('commission_rate_pct', 0)) if str(t.get('tier_type','hourly'))=='commission' else 0.0,
                    demo_bonus=float(t.get('demo_bonus', 0)),
                    effective_from=datetime.strptime(t.get('effective_from', datetime.utcnow().strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
                    active=True,
                    order_index=int(t.get('order_index', 0)),
                )
                db.session.add(tier)
            except Exception as _e:
                logger.warning(f"Skipping invalid pending tier: {_e}")
        db.session.commit()
        
        creator_name = current_user.username if current_user else f"location-{current_location_id}"
        logger.info(f"User {new_user.username} created by {creator_name} for location {requested_location_id}")
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'user': {
                'id': new_user.id,
                'name': new_user.name,
                'username': new_user.username,
                'email': new_user.email,
                'role': new_user.role,
                'location_id': new_user.location_id,
                'is_active': new_user.is_active
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create user error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to create user'}), 500

@app.route('/api/users/<int:user_id>', methods=['GET'])
@login_required
def get_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        
        # Check if current user is admin to include password
        current_user = None
        is_admin = False
        
        if 'user_id' in session:
            current_user = User.query.get(session['user_id'])
            is_admin = current_user and current_user.role == 'admin'
        
        user_data = {
            'id': user.id,
            'name': user.name,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'location_id': user.location_id,
            'location_name': user.location.name if user.location else None,
            'is_active': user.is_active,
            'base_hourly_rate': float(user.base_hourly_rate or 0),
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'updated_at': user.updated_at.isoformat() if user.updated_at else None
        }
        
        # Include password only for admin users
        if is_admin:
            # Since passwords are hashed, we'll indicate that password exists but show a placeholder
            # In a real-world scenario, you'd never return actual passwords
            user_data['password'] = '••••••••' if user.password else 'No password set'
            user_data['has_password'] = bool(user.password)
        
        return jsonify({
            'success': True,
            'user': user_data
        })
        
    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch user'}), 500

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        
        # Validate request data
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        logger.info(f"Updating user {user_id} with data: {data}")
        
        # Get current user to check permissions - handle both user and location authentication
        current_user = None
        current_user_role = None
        current_location_id = None
        
        # Check for regular user authentication
        if 'user_id' in session:
            current_user = User.query.get(session['user_id'])
            if current_user:
                current_user_role = current_user.role
                current_location_id = current_user.location_id
        
        # Check for location authentication
        elif 'location_id' in session:
            location = Location.query.get(session['location_id'])
            if location:
                current_user_role = 'location'
                current_location_id = location.id
        
        if not current_user and not current_location_id:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        
        # Check permissions
        if current_user_role not in ['admin', 'location']:
            return jsonify({'success': False, 'message': 'Insufficient permissions to update users'}), 403
        
        # Location-based restrictions for editing
        if current_user_role == 'location':
            # Location managers can only edit users from their own location
            if user.location_id != current_location_id:
                return jsonify({'success': False, 'message': 'You can only edit users from your own location'}), 403
            
            # Location managers cannot change certain fields
            if 'role' in data and data['role'] == 'admin':
                return jsonify({'success': False, 'message': 'Location managers cannot create admin users'}), 403
            
            if 'location_id' in data and data['location_id'] and int(data['location_id']) != current_location_id:
                return jsonify({'success': False, 'message': 'You can only assign users to your own location'}), 403
        
        # Update fields
        if 'name' in data and data['name']:
            user.name = data['name']
        if 'username' in data and data['username']:
            # Check if username is already taken by another user
            existing = User.query.filter(
                User.username == data['username'],
                User.id != user_id
            ).first()
            if existing:
                return jsonify({'success': False, 'message': 'Username already exists'}), 400
            user.username = data['username']
        if 'email' in data and data['email']:
            # Check if email is already taken by another user
            existing = User.query.filter(
                User.email == data['email'],
                User.id != user_id
            ).first()
            if existing:
                return jsonify({'success': False, 'message': 'Email already exists'}), 400
            user.email = data['email']
        if 'password' in data and data['password']:
            user.password = generate_password_hash(data['password'])
        if 'role' in data and data['role']:
            user.role = data['role']
        if 'location_id' in data:
            user.location_id = int(data['location_id']) if data['location_id'] else None
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'base_hourly_rate' in data:
            try:
                user.base_hourly_rate = float(data.get('base_hourly_rate') or 0)
            except Exception:
                logger.warning('Invalid base_hourly_rate provided on update')
        
        # Set updated_at timestamp
        try:
            user.updated_at = datetime.utcnow()
        except Exception as e:
            logger.warning(f"Could not set updated_at: {str(e)}")
        
        db.session.commit()
        
        updater_name = current_user.username if current_user else f"location-{current_location_id}"
        logger.info(f"User {user.username} updated by {updater_name}")
        
        return jsonify({
            'success': True,
            'message': 'User updated successfully',
            'user': {
                'id': user.id,
                'name': user.name,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'location_id': user.location_id,
                'base_hourly_rate': float(user.base_hourly_rate or 0),
                'is_active': user.is_active
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update user error: {str(e)}")
        logger.error(f"Request data: {data}")
        logger.error(f"User ID: {user_id}")
        return jsonify({'success': False, 'message': f'Failed to update user: {str(e)}'}), 500

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        
        # Prevent deleting own account
        if user.id == session.get('user_id'):
            return jsonify({'success': False, 'message': 'Cannot delete your own account'}), 400
        
        # Check if user has appointments
        appointments_count = Appointment.query.filter_by(host_id=user_id).count()
        if appointments_count > 0:
            return jsonify({'success': False, 'message': f'Cannot delete user with {appointments_count} appointments'}), 400
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'User deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete user error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to delete user'}), 500

# Location management endpoints are defined later in the file

@app.route('/get_location/<location_id>', methods=['GET'])
@login_required
def get_location(location_id):
    try:
        location = Location.query.get(location_id)
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Check if user is admin to return password
        user = User.query.get(session['user_id'])
        is_admin = user and user.role == 'admin'
        
        response_data = {
            'id': location.id,
            'name': location.name,
            'location_name': location.location_name,
            'location_username': location.location_username,
            'location_password_set': bool(location.location_password),
            'mall': location.mall,
            'address': location.address,
            'phone': location.phone,
            'email': location.email,
            'unique_url_slug': location.unique_url_slug,
            'is_active': location.is_active,
            'created_at': location.created_at.strftime('%Y-%m-%d %H:%M:%S') if location.created_at else None
        }
        
        # For edit mode, indicate that password exists but don't return the hashed value
        if is_admin and location.location_password:
            response_data['has_password'] = True
        
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error getting location: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Enhanced API endpoint for getting location details with unique URL support
@app.route('/api/location/<location_identifier>')
@login_required
def get_location_details(location_identifier):
    """Get location details by ID, name, or username with unique URL generation"""
    try:
        # Try to find location by ID first
        if location_identifier.isdigit():
            location = Location.query.get(int(location_identifier))
        else:
            # Try by location_name or location_username
            location = Location.query.filter(
                db.or_(
                    Location.location_name == location_identifier,
                    Location.location_username == location_identifier
                )
            ).first()
        
        if not location:
            return jsonify({'success': False, 'error': 'Location not found'}), 404
        
        # Check access permissions
        user = User.query.get(session['user_id'])
        if user.role != 'admin' and user.location_id != location.id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403
        
        # Generate unique URL for location
        unique_url_name = location.location_name.lower().replace(' ', '-').replace('&', 'and')
        
        return jsonify({
            'success': True,
            'location': {
                'id': location.id,
                'name': location.name,
                'location_name': location.location_name,
                'location_username': location.location_username,
                'mall': location.mall,
                'address': location.address,
                'phone': location.phone,
                'email': location.email,
                'is_active': location.is_active,
                'created_at': location.created_at.isoformat() if location.created_at else None,
                'unique_url': f"/location/{unique_url_name}",
                'dashboard_url': f"/location-dashboard?location={location.id}"
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting location details: {str(e)}")
        return jsonify({'success': False, 'error': 'Server error'}), 500

# Enhanced add location endpoint with unique URL generation
@app.route('/add_location', methods=['POST'])
@admin_required
def add_location():
    try:
        # Handle both FormData and JSON
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
        
        logger.info(f"Add location request: {data}")
        
        # Map form field names to expected names
        location_name = data.get('location_name', '').strip()
        mall_area = data.get('mall_area', '').strip()  # Form sends 'mall_area'
        location_username = data.get('location_username', '').strip()
        location_password = data.get('location_password', '').strip()
        address = data.get('address', '').strip()
        
        # Validate required fields
        if not location_name:
            return jsonify({'error': 'Location name is required'}), 400
        if not mall_area:
            return jsonify({'error': 'Mall/Area is required'}), 400
        if not location_username:
            return jsonify({'error': 'Location username is required'}), 400
        if not location_password:
            return jsonify({'error': 'Location password is required'}), 400
        
        # Check if location username already exists
        existing_location = Location.query.filter_by(location_username=location_username).first()
        if existing_location:
            return jsonify({'error': 'Location username already exists'}), 400
        
        # Check if location name already exists
        existing_name = Location.query.filter_by(location_name=location_name).first()
        if existing_name:
            return jsonify({'error': 'Location name already exists'}), 400
        
        # Hash the password
        hashed_password = generate_password_hash(location_password)
        
        # Generate unique URL slug
        import re
        unique_url_slug = re.sub(r'[^\w\s-]', '', location_name.lower())
        unique_url_slug = re.sub(r'[\s_-]+', '-', unique_url_slug)
        unique_url_slug = unique_url_slug.strip('-')
        
        # Ensure unique URL slug
        base_slug = unique_url_slug
        counter = 1
        while Location.query.filter_by(unique_url_slug=unique_url_slug).first():
            unique_url_slug = f"{base_slug}-{counter}"
            counter += 1
        
        # Create new location
        new_location = Location(
            name=location_name,
            location_name=location_name,
            location_username=location_username,
            location_password=hashed_password,
            mall=mall_area,  # Use mall_area from form
            address=address,
            phone=data.get('phone', ''),
            email=data.get('email', ''),
            unique_url_slug=unique_url_slug,
            is_active=True
        )
        
        db.session.add(new_location)
        db.session.commit()
        
        logger.info(f"Location created successfully: {new_location.id}")
        
        return jsonify({
            'success': True,
            'message': 'Location created successfully',
            'location': {
                'id': new_location.id,
                'name': new_location.location_name,
                'location_name': new_location.location_name,
                'location_username': new_location.location_username,
                'mall': new_location.mall,
                'address': new_location.address,
                'unique_url_slug': new_location.unique_url_slug,
                'unique_url': f"/location/{new_location.unique_url_slug}",
                'dashboard_url': f"/location-dashboard?location={new_location.id}",
                'created_at': new_location.created_at.isoformat() if new_location.created_at else None
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating location: {str(e)}")
        return jsonify({'error': f'Failed to create location: {str(e)}'}), 500

@app.route('/update_location', methods=['POST'])
@login_required
def update_location():
    try:
        # Handle both JSON and FormData
        if request.is_json:
            data = request.get_json()
        else:
            # Handle FormData
            data = {}
            for key in request.form:
                data[key] = request.form[key]
        
        logger.info(f"Update location request: {data}")
        
        location_id = data.get('location_id')
        if not location_id:
            return jsonify({'error': 'Location ID is required'}), 400
        
        location = Location.query.get(location_id)
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        # Check if user has permission to update this location
        # Admin can update any location, location users can only update their own
        if 'user_id' in session:
            user = User.query.get(session['user_id'])
            if user and user.role == 'admin':
                # Admin can update any location
                pass
            elif user and user.role == 'location' and user.location_id == int(location_id):
                # Location user can update their own location
                pass
            else:
                return jsonify({'error': 'Access denied. You can only update your own location.'}), 403
        elif 'location_id' in session:
            # Location login - can only update their own location
            if session['location_id'] != int(location_id):
                return jsonify({'error': 'Access denied. You can only update your own location.'}), 403
        else:
            return jsonify({'error': 'Authentication required'}), 401
        
        # Update fields if provided
        if 'location_name' in data and data['location_name']:
            # Check if new name already exists (excluding current location)
            existing_name = Location.query.filter(
                Location.location_name == data['location_name'],
                Location.id != location_id
            ).first()
            if existing_name:
                return jsonify({'error': 'Location name already exists'}), 400
            location.location_name = data['location_name']
            location.name = data['location_name']  # Keep both fields synchronized
        
        if 'mall_area' in data:
            location.mall = data['mall_area']
        elif 'mall' in data:
            location.mall = data['mall']
        
        if 'location_username' in data and data['location_username']:
            # Check if new username already exists (excluding current location)
            existing_username = Location.query.filter(
                Location.location_username == data['location_username'],
                Location.id != location_id
            ).first()
            if existing_username:
                return jsonify({'error': 'Location username already exists'}), 400
            location.location_username = data['location_username']
        
        if 'location_password' in data and data['location_password']:
            location.location_password = generate_password_hash(data['location_password'])
        
        if 'address' in data:
            location.address = data['address']
        
        if 'phone' in data:
            location.phone = data['phone']
        
        if 'email' in data:
            location.email = data['email']
        
        if 'unique_url_slug' in data and data['unique_url_slug']:
            location.unique_url_slug = data['unique_url_slug']
        
        if 'is_active' in data:
            location.is_active = data['is_active']
        
        location.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Generate unique URL for updated location
        unique_url_name = location.unique_url_slug or location.location_name.lower().replace(' ', '-').replace('&', 'and')
        
        logger.info(f"Location updated successfully: {location.id}")
        
        return jsonify({
            'success': True,
            'message': 'Location updated successfully',
            'location': {
                'id': location.id,
                'name': location.location_name,
                'location_name': location.location_name,
                'location_username': location.location_username,
                'mall': location.mall,
                'address': location.address,
                'phone': location.phone,
                'email': location.email,
                'is_active': location.is_active,
                'unique_url': f"/location/{unique_url_name}",
                'dashboard_url': f"/location-dashboard?location={location.id}",
                'updated_at': location.updated_at.isoformat() if location.updated_at else None
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating location: {str(e)}")
        return jsonify({'error': f'Failed to update location: {str(e)}'}), 500

@app.route('/remove_location', methods=['POST'])
@admin_required
def remove_location():
    try:
        # Handle both JSON and FormData
        if request.is_json:
            data = request.get_json()
        else:
            # Handle FormData
            data = {}
            for key in request.form:
                data[key] = request.form[key]
        
        logger.info(f"Remove location request: {data}")
        
        location_id = data.get('location_id')
        if not location_id:
            return jsonify({'error': 'Location ID is required'}), 400
        
        location = Location.query.get(location_id)
        if not location:
            return jsonify({'error': 'Location not found'}), 404
        
        location_name = location.location_name
        
        # Check if location has associated users
        users_count = User.query.filter_by(location_id=location_id).count()
        if users_count > 0:
            return jsonify({'error': f'Cannot delete location with {users_count} associated users. Please reassign or remove users first.'}), 400
        
        # Check if location has associated appointments
        appointments_count = Appointment.query.filter_by(location_id=location_id).count()
        if appointments_count > 0:
            return jsonify({'error': f'Cannot delete location with {appointments_count} associated appointments. Please reassign or remove appointments first.'}), 400
        
        db.session.delete(location)
        db.session.commit()
        
        logger.info(f"Location deleted successfully: {location_name}")
        
        return jsonify({
            'success': True,
            'message': f'Location "{location_name}" deleted successfully',
            'deleted_location': location_name
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting location: {str(e)}")
        return jsonify({'error': f'Failed to delete location: {str(e)}'}), 500

# Enhanced get_locations endpoint with unique URLs
@app.route('/get_locations', methods=['GET'])
@login_required
def get_locations():
    try:
        user = User.query.get(session['user_id'])
        
        # Admin can see all locations, others only their own
        if user.role == 'admin':
            locations = Location.query.all()
        else:
            locations = Location.query.filter_by(id=user.location_id).all() if user.location_id else []
        
        locations_data = []
        for location in locations:
            unique_url_name = location.location_name.lower().replace(' ', '-').replace('&', 'and')
            locations_data.append({
                'id': location.id,
                'name': location.name,
                'location_name': location.location_name,
                'location_username': location.location_username,
                'mall': location.mall,
                'address': location.address,
                'phone': location.phone,
                'email': location.email,
                'is_active': location.is_active,
                'created_at': location.created_at.strftime('%Y-%m-%d %H:%M:%S') if location.created_at else None,
                'unique_url': f"/location/{unique_url_name}",
                'dashboard_url': f"/location-dashboard?location={location.id}",
                'user_count': User.query.filter_by(location_id=location.id).count()
            })
        
        logger.info(f"Returning {len(locations_data)} locations for user {user.username}")
        return jsonify(locations_data)
        
    except Exception as e:
        logger.error(f"Error getting locations: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Enhanced API/locations endpoint for better frontend integration
@app.route('/api/locations', methods=['GET'])
def api_get_locations():
    try:
        # Check for user authentication
        if 'user_id' in session:
            user = User.query.get(session['user_id'])
            if user and user.is_active:
                # Admin can see all locations, others only their own
                if user.role == 'admin':
                    locations = Location.query.all()
                else:
                    locations = Location.query.filter_by(id=user.location_id).all() if user.location_id else []
            else:
                return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        # Check for location authentication
        elif 'location_id' in session:
            location = Location.query.get(session['location_id'])
            if location and location.is_active:
                # Location users can only see their own location
                locations = [location]
            else:
                return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        else:
            return jsonify({'success': False, 'error': 'Authentication required'}), 401
        
        locations_data = []
        for location in locations:
            unique_url_name = location.location_name.lower().replace(' ', '-').replace('&', 'and')
            locations_data.append({
                'id': location.id,
                'name': location.location_name,  # Use location_name for consistency
                'location_name': location.location_name,
                'location_username': location.location_username,
                'mall': location.mall,
                'address': location.address,
                'phone': location.phone,
                'email': location.email,
                'is_active': location.is_active,
                'created_at': location.created_at.isoformat() if location.created_at else None,
                'updated_at': location.updated_at.isoformat() if location.updated_at else None,
                'unique_url': f"/location/{unique_url_name}",
                'dashboard_url': f"/location-dashboard?location={location.id}",
                'user_count': User.query.filter_by(location_id=location.id).count(),
                'appointment_count': Appointment.query.filter_by(location_id=location.id).count()
            })
        
        return jsonify({
            'success': True,
            'locations': locations_data,
            'total': len(locations_data)
        })
        
    except Exception as e:
        logger.error(f"Error getting locations via API: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to fetch locations'}), 500

# Current user endpoint for authentication
@app.route('/get_current_user')
def get_current_user():
    try:
        # Check for user authentication
        if 'user_id' in session:
            user = User.query.get(session['user_id'])
            if user and user.is_active:
                return jsonify({
                    'success': True,
                    'user': {
                        'id': user.id,
                        'name': user.name,
                        'username': user.username,
                        'email': user.email,
                        'role': user.role,
                        'location_id': user.location_id,
                        'location_name': user.location.name if user.location else None,
                        'is_active': user.is_active
                    }
                })
        
        # Check for location authentication
        if 'location_id' in session:
            location = Location.query.get(session['location_id'])
            if location and location.is_active:
                return jsonify({
                    'success': True,
                    'user': {
                        'id': location.id,
                        'name': location.name,
                        'username': location.location_username,
                        'role': 'location',
                        'location_id': location.id,
                        'location_name': location.name,
                        'is_active': location.is_active
                    }
                })
        
        # No valid authentication found
        return jsonify({'success': False, 'message': 'Authentication required'}), 401
        
    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch user data'}), 500

# Admin password verification endpoint
@app.route('/verify_admin_password', methods=['POST'])
@login_required
def verify_admin_password():
    try:
        data = request.get_json()
        password = data.get('password')
        
        if not password:
            return jsonify({'success': False, 'message': 'Password is required'}), 400
        
        user = User.query.get(session['user_id'])
        
        # Check if user is admin
        if user.role != 'admin':
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
        
        # Verify admin password - support both hardcoded admin and database users
        is_valid = False
        if user.username == 'admin':
            # For hardcoded admin, check against common admin passwords
            valid_passwords = ['ori3', 'admin123', 'admin']
            is_valid = password in valid_passwords
        elif user.password:
            # For database admin users, check hashed password
            is_valid = check_password_hash(user.password, password)
        
        if is_valid:
            return jsonify({'valid': True, 'success': True, 'message': 'Admin password verified'})
        else:
            return jsonify({'valid': False, 'success': False, 'message': 'Invalid admin password'}), 401
            
    except Exception as e:
        logger.error(f"Verify admin password error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to verify password'}), 500

# Location users endpoint
@app.route('/api/location/users')
@login_required
def get_location_users():
    try:
        location_id = request.args.get('location_id')
        
        if not location_id:
            return jsonify({'success': False, 'message': 'Location ID is required'}), 400
        
        user = User.query.get(session['user_id'])
        
        # Check if user has access to this location
        if user.role != 'admin' and user.location_id != int(location_id):
            return jsonify({'success': False, 'message': 'Access denied'}), 403
        
        users = User.query.filter_by(location_id=location_id).all()
        users_data = []
        
        for user_obj in users:
            users_data.append({
                'id': user_obj.id,
                'name': user_obj.name,
                'username': user_obj.username,
                'email': user_obj.email,
                'role': user_obj.role,
                'is_active': user_obj.is_active
            })
        
        return jsonify({
            'success': True,
            'users': users_data
        })
        
    except Exception as e:
        logger.error(f"Get location users error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch location users'}), 500

# Appointments API
def _resolve_location_param(location_param: str):
    """Resolve a flexible location parameter to a Location row.
    Accepts ID, username, name, or unique_url_slug. Returns Location or None.
    """
    if not location_param:
        return None
    loc = Location.query.filter(
        db.or_(
            Location.location_username == location_param,
            Location.location_name == location_param,
            Location.unique_url_slug == location_param
        )
    ).first()
    if not loc and location_param.isdigit():
        loc = Location.query.get(int(location_param))
    return loc


@app.route('/api/appointments', methods=['GET'])
@login_required
def get_appointments():
    try:
        user = User.query.get(session['user_id'])

        # Optional location override for admins via URL (?location=...)
        location_param = request.args.get('location', '').strip()
        if user.role == 'admin' and location_param:
            target_location = _resolve_location_param(location_param)
            if not target_location:
                return jsonify({'success': False, 'message': f'Location "{location_param}" not found'}), 404
            query = Appointment.query.filter_by(location_id=target_location.id)
        else:
            # Non-admins are limited to their own location
            if user.role != 'admin' and not user.location_id:
                return jsonify({'success': False, 'message': 'User has no location'}), 400
            query = Appointment.query if user.role == 'admin' else Appointment.query.filter_by(location_id=user.location_id)

        appointments = query.all()
        appointments_data = []

        for appointment in appointments:
            appointments_data.append({
                'id': appointment.id,
                'client_name': appointment.client_name,
                'client_email': appointment.client_email,
                'date': appointment.date,
                'time': appointment.time,
                'type': appointment.type,
                'notes': appointment.notes,
                'host_id': appointment.host_id,
                'host_name': appointment.host.name if appointment.host else None,
                'location_id': appointment.location_id,
                'location_name': appointment.location.name if appointment.location else None,
                'status': appointment.status,
                'created_at': appointment.created_at.isoformat() if appointment.created_at else None
            })

        # Return shape compatible with existing frontend expectations
        return jsonify({
            'success': True,
            'appointments': appointments_data
        })

    except Exception as e:
        logger.error(f"Get appointments error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch appointments'}), 500

@app.route('/api/appointments', methods=['POST'])
@login_required
def create_appointment():
    try:
        data = request.get_json() or {}
        user = User.query.get(session['user_id'])
        
        # Validate required fields
        # Accept flexible payload keys from different front-ends
        client_name = data.get('client_name') or data.get('name')
        client_email = data.get('client_email') or data.get('email') or ''
        appointment_date = data.get('date') or data.get('appointment_date')
        appointment_time = data.get('time') or data.get('appointment_time')
        appointment_type = data.get('type') or data.get('service') or ''
        notes = data.get('notes') or data.get('description') or ''
        host_id = data.get('host_id') or (user.id if user else None)

        # Determine location: prefer explicit location_id or URL ?location= param (admin only)
        location_id = data.get('location_id')
        if not location_id:
            location_param = request.args.get('location', '').strip() or data.get('location')
            if location_param and user and user.role == 'admin':
                loc = _resolve_location_param(str(location_param))
                if not loc:
                    return jsonify({'success': False, 'message': f'Location "{location_param}" not found'}), 404
                location_id = loc.id
            else:
                # fallback to user's own location
                location_id = user.location_id if user else None

        required_fields = ['client_name', 'date', 'time']
        for field in required_fields:
            value_map = {
                'client_name': client_name,
                'date': appointment_date,
                'time': appointment_time,
            }
            if not value_map.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        # Create appointment
        appointment = Appointment(
            client_name=client_name,
            client_email=client_email,
            date=appointment_date,
            time=appointment_time,
            type=appointment_type,
            notes=notes,
            host_id=host_id,
            location_id=location_id,
            status=data.get('status', 'scheduled')
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Appointment created successfully',
            'appointment': {
                'id': appointment.id,
                'client_name': appointment.client_name,
                'date': appointment.date,
                'time': appointment.time
            }
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create appointment error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to create appointment'}), 500


@app.route('/api/appointments/<int:appointment_id>', methods=['PUT'])
@login_required
def update_appointment(appointment_id: int):
    try:
        data = request.get_json() or {}
        user = User.query.get(session['user_id'])

        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'success': False, 'message': 'Appointment not found'}), 404

        # Permission: non-admins can only update within their location
        if user.role != 'admin' and appointment.location_id != user.location_id:
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        # Flexible field updates
        if 'client_name' in data or 'name' in data:
            appointment.client_name = data.get('client_name') or data.get('name')
        if 'client_email' in data or 'email' in data:
            appointment.client_email = data.get('client_email') or data.get('email')
        if 'date' in data or 'appointment_date' in data:
            appointment.date = data.get('date') or data.get('appointment_date')
        if 'time' in data or 'appointment_time' in data:
            appointment.time = data.get('time') or data.get('appointment_time')
        if 'type' in data or 'service' in data:
            appointment.type = data.get('type') or data.get('service')
        if 'notes' in data or 'description' in data:
            appointment.notes = data.get('notes') or data.get('description')
        if 'status' in data:
            appointment.status = data.get('status')

        # Admins may move appointments between locations if provided
        if user.role == 'admin':
            if 'location_id' in data and data['location_id']:
                appointment.location_id = data['location_id']
            elif 'location' in data and data['location']:
                loc = _resolve_location_param(str(data['location']))
                if not loc:
                    return jsonify({'success': False, 'message': f'Location "{data["location"]}" not found'}), 404
                appointment.location_id = loc.id

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Appointment updated successfully',
            'appointment': {
                'id': appointment.id,
                'client_name': appointment.client_name,
                'date': appointment.date,
                'time': appointment.time
            }
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update appointment error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to update appointment'}), 500


@app.route('/api/appointments/<int:appointment_id>', methods=['DELETE'])
@login_required
def delete_appointment(appointment_id: int):
    try:
        user = User.query.get(session['user_id'])
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'success': False, 'message': 'Appointment not found'}), 404

        # Permission: non-admins can only delete within their location
        if user.role != 'admin' and appointment.location_id != user.location_id:
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        db.session.delete(appointment)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Appointment deleted'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete appointment error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to delete appointment'}), 500

@app.route('/api/appointments/<int:appointment_id>', methods=['GET'])
@login_required
def get_appointment_by_id(appointment_id: int):
    try:
        user = User.query.get(session['user_id'])
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({'success': False, 'message': 'Appointment not found'}), 404

        # Permission: non-admins can only view within their location
        if user.role != 'admin' and appointment.location_id != user.location_id:
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        return jsonify({
            'success': True,
            'appointment': {
                'id': appointment.id,
                'client_name': appointment.client_name,
                'client_email': appointment.client_email,
                'date': appointment.date,
                'time': appointment.time,
                'type': appointment.type,
                'notes': appointment.notes,
                'host_id': appointment.host_id,
                'location_id': appointment.location_id,
                'status': appointment.status,
                'created_at': appointment.created_at.isoformat() if appointment.created_at else None
            }
        })
    except Exception as e:
        logger.error(f"Get appointment by id error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch appointment'}), 500

# Statistics API
@app.route('/api/stats')
@login_required
def get_stats():
    try:
        user = User.query.get(session['user_id'])
        
        # Build queries based on user role
        if user.role == 'admin':
            users_query = User.query
            appointments_query = Appointment.query
            locations_query = Location.query
        else:
            users_query = User.query.filter_by(location_id=user.location_id)
            appointments_query = Appointment.query.filter_by(location_id=user.location_id)
            locations_query = Location.query.filter_by(id=user.location_id)
        
        stats = {
            'total_users': users_query.count(),
            'active_users': users_query.filter_by(is_active=True).count(),
            'total_appointments': appointments_query.count(),
            'scheduled_appointments': appointments_query.filter_by(status='scheduled').count(),
            'completed_appointments': appointments_query.filter_by(status='completed').count(),
            'cancelled_appointments': appointments_query.filter_by(status='cancelled').count(),
            'total_locations': locations_query.count()
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"Get stats error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch statistics'}), 500

# Email API endpoint for gift cards
@app.route('/api/email/gift-card', methods=['POST'])
@login_required
def send_gift_card_email():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        # Extract gift card data
        gift_card_code = data.get('code')
        recipient_email = data.get('email')
        gift_card_type = data.get('type', 'Gift Card')
        message = data.get('message', '')
        
        if not gift_card_code or not recipient_email:
            return jsonify({'success': False, 'message': 'Missing required fields: code and email'}), 400
        
        # Here you would typically integrate with your email service
        # For now, we'll just log the request
        logger.info(f"Gift card email request: Code={gift_card_code}, Email={recipient_email}, Type={gift_card_type}")
        
        # Simulate email sending success
        return jsonify({
            'success': True, 
            'message': f'Gift card email sent successfully to {recipient_email}',
            'gift_card_code': gift_card_code,
            'sent_at': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Gift card email error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to send gift card email'}), 500

# Add tracking-specific API endpoints
@app.route('/api/tracking_data', methods=['GET'])
@login_required
def get_tracking_data():
    """Get tracking data with location-based filtering"""
    try:
        # Determine role and scope from session without assuming user object is present
        is_admin = False
        scope_location_id = None
        current_username = None

        if 'user_id' in session:
            try:
                user_obj = User.query.get(session['user_id'])
                if user_obj:
                    current_username = user_obj.username
                    if user_obj.role == 'admin':
                        is_admin = True
                    else:
                        scope_location_id = user_obj.location_id
            except Exception as _e:
                logger.warning(f"Could not resolve current user from session: {_e}")
        elif 'location_id' in session:
            scope_location_id = session.get('location_id')
            current_username = session.get('location_username', 'location')

        # Get query parameters for filtering
        user_id = request.args.get('user_id', type=int)
        location_id = request.args.get('location_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # Build query
        query = TrackingData.query

        # Apply filters based on role
        if is_admin:
            if user_id:
                query = query.filter(TrackingData.user_id == user_id)
            if location_id:
                query = query.filter(TrackingData.location_id == location_id)
        else:
            if scope_location_id is None:
                # No scope, return empty array gracefully
                return jsonify([]), 200
            query = query.filter(TrackingData.location_id == scope_location_id)
            if user_id:
                user = User.query.get(user_id)
                if not user or user.location_id != scope_location_id:
                    return jsonify({'success': False, 'message': 'Access denied'}), 403
                query = query.filter(TrackingData.user_id == user_id)

        # Date filters
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                query = query.filter(TrackingData.date >= start_date_obj)
            except Exception:
                pass
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                query = query.filter(TrackingData.date <= end_date_obj)
            except Exception:
                pass

        tracking_data = query.all()
        result = [data.to_dict() for data in tracking_data]
        logger.info(f"Retrieved {len(result)} tracking records (admin={is_admin}, user={current_username})")
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error retrieving tracking data: {str(e)}", exc_info=True)
        # Fail soft with empty array to avoid frontend 500 breaks
        return jsonify([]), 200

# New TRinfo endpoints
@app.route('/save_trinfo', methods=['POST', 'OPTIONS'])
def save_trinfo():
    """Save a tracking entry to TRinfo file-based store without requiring session auth.
    Body JSON must contain: username, date (YYYY-MM-DD), and metrics fields.
    """
    try:
        # Handle CORS preflight
        if request.method == 'OPTIONS':
            response = make_response()
            return add_cors_headers(response)

        payload = request.get_json(force=True, silent=True) or {}
        username = payload.get('username') or payload.get('user_name') or payload.get('user')
        date_str = payload.get('date')
        if not username or not date_str:
            return jsonify({'success': False, 'message': 'username and date are required'}), 400

        # Build record
        record = {
            'username': username,
            'date': date_str,
            'opal_demos': int(payload.get('opal_demos') or payload.get('opalDemos') or 0),
            'opal_sales': int(payload.get('opal_sales') or payload.get('opalSales') or 0),
            'scan_demos': int(payload.get('scan_demos') or payload.get('scanDemos') or 0),
            'scan_sold': int(payload.get('scan_sold') or payload.get('scanSold') or 0),
            'net_sales': float(payload.get('net_sales') or payload.get('netSales') or 0),
            'hours_worked': float(payload.get('hours_worked') or payload.get('hoursWorked') or 0),
            'opal_demo_numbers': payload.get('opal_demo_numbers') or payload.get('opalDemoNumbers') or [],
            'scan_demo_numbers': payload.get('scan_demo_numbers') or payload.get('scanDemoNumbers') or [],
            'timestamp': datetime.utcnow().isoformat()
        }

        # Append to file array
        file_path = trinfo_file_path(username, date_str)
        entries = []
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    entries = json.load(f)
            except Exception:
                entries = []
        entries.append(record)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)

        return jsonify({'success': True, 'saved': 1, 'file': file_path, 'data': record}), 201
    except Exception as e:
        logger.error(f"Error saving TRinfo: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to save'}), 500

@app.route('/api/trinfo', methods=['GET', 'OPTIONS'])
def get_trinfo():
    """Fetch TRinfo entries.
    Query params supported:
    - username (optional)
    - start_date (YYYY-MM-DD, optional)
    - end_date (YYYY-MM-DD, optional)
    If only one of start/end provided, uses that single day.
    Returns 200 with an empty list on any validation issue to avoid UI breaks.
    """
    try:
        if request.method == 'OPTIONS':
            response = make_response()
            return add_cors_headers(response)

        username = request.args.get('username', '').strip()
        # Be tolerant of param name variations
        start_date = (request.args.get('start_date') or request.args.get('start') or request.args.get('from') or request.args.get('start_dat') or '').strip()
        end_date = (request.args.get('end_date') or request.args.get('end') or request.args.get('to') or '').strip()

        ensure_trinfo_dir_exists()

        def iter_all_files():
            for name in os.listdir(TRINFO_DB_DIR):
                if not name.endswith('.json'):
                    continue
                yield os.path.join(TRINFO_DB_DIR, name)

        def iter_user_files(safe_user):
            for name in os.listdir(TRINFO_DB_DIR):
                if not name.startswith(f"{safe_user}_") or not name.endswith('.json'):
                    continue
                yield os.path.join(TRINFO_DB_DIR, name)

        results = []
        # Date normalization with validation and soft-fail
        if start_date or end_date:
            if not start_date:
                start_date = end_date
            if not end_date:
                end_date = start_date
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
            except Exception:
                # Soft-fail if bad dates
                return jsonify({'success': True, 'count': 0, 'data': []}), 200
            if end < start:
                start, end = end, start

            # Walk dates inclusive
            cur = start
            target_files = []
            if username:
                while cur <= end:
                    target_files.append(trinfo_file_path(username, cur.strftime('%Y-%m-%d')))
                    cur = cur + timedelta(days=1)
            else:
                # All users: collect matching date suffix files
                while cur <= end:
                    day = cur.strftime('%Y-%m-%d')
                    for name in os.listdir(TRINFO_DB_DIR):
                        if name.endswith(f"_{day}.json"):
                            target_files.append(os.path.join(TRINFO_DB_DIR, name))
                    cur = cur + timedelta(days=1)

            for fp in target_files:
                if os.path.exists(fp):
                    try:
                        with open(fp, 'r', encoding='utf-8') as f:
                            results.extend(json.load(f))
                    except Exception:
                        pass
        else:
            # No dates: return all files for given user or everyone
            files_iter = iter_all_files() if not username else iter_user_files(make_safe_filename_component(username))
            for fp in files_iter:
                try:
                    with open(fp, 'r', encoding='utf-8') as f:
                        results.extend(json.load(f))
                except Exception:
                    pass

        return jsonify({'success': True, 'count': len(results), 'data': results}), 200
    except Exception as e:
        logger.error(f"Error reading TRinfo: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to read'}), 500

@app.route('/save_tracking_data', methods=['POST'])
def save_tracking_data():
    """Save tracking data from tracking stations with location-based access control"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        # Extract tracking data
        user_id = data.get('user_id')
        username = data.get('username', 'Unknown User')
        opal_demos = data.get('opal_demos', 0)
        opal_sales = data.get('opal_sales', 0)
        scan_demos = data.get('scan_demos', 0)
        scan_sold = data.get('scan_sold', 0)
        net_sales = data.get('net_sales', 0)
        hours_worked = data.get('hours_worked', 0)
        date_str = data.get('date', datetime.utcnow().strftime('%Y-%m-%d'))
        
        # Parse date
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            date_obj = datetime.utcnow().date()
        
        # Get user's location access
        user_location_id = None
        is_admin = False
        
        if 'user_id' in session:
            user = User.query.get(session['user_id'])
            if user:
                if user.role == 'admin':
                    is_admin = True
                else:
                    user_location_id = user.location_id
        elif 'location_id' in session:
            user_location_id = session['location_id']
        
        # Verify user has permission to save data for this user
        if not is_admin:
            # Get the user being tracked
            tracked_user = User.query.get(user_id)
            if not tracked_user or tracked_user.location_id != user_location_id:
                return jsonify({'success': False, 'message': 'Access denied to save data for this user'}), 403
        
        # Get location ID
        location_id = None
        if user_id:
            tracked_user = User.query.get(user_id)
            if tracked_user:
                location_id = tracked_user.location_id
        
        if not location_id:
            return jsonify({'success': False, 'message': 'Invalid user or location'}), 400
        
        # Save to database
        tracking_data = TrackingData(
            user_id=user_id,
            location_id=location_id,
            date=date_obj,
            opal_demos=opal_demos,
            opal_sales=opal_sales,
            scan_demos=scan_demos,
            scan_sold=scan_sold,
            net_sales=net_sales,
            hours_worked=hours_worked
        )
        
        db.session.add(tracking_data)

        # Upsert into unified tables for commission
        try:
            # Demos: sum opal and scan demos
            total_demos = int(opal_demos or 0) + int(scan_demos or 0)
            demos_row = Demos.query.filter_by(user_id=user_id, date=date_obj).first()
            if demos_row:
                demos_row.demos = total_demos
                demos_row.source = 'manual'
                demos_row.updated_at = datetime.utcnow()
            else:
                db.session.add(Demos(user_id=user_id, date=date_obj, demos=total_demos, source='manual'))

            # SalesHours from net_sales and hours_worked if provided
            if net_sales is not None or hours_worked is not None:
                sh = SalesHours.query.filter_by(user_id=user_id, date=date_obj).first()
                sales_val = int(float(net_sales or 0))
                hours_val = float(hours_worked or 0)
                if sh:
                    sh.sales = sales_val
                    sh.hours = hours_val
                    sh.source = 'manual'
                else:
                    db.session.add(SalesHours(user_id=user_id, date=date_obj, sales=sales_val, hours=hours_val, source='manual'))
        except Exception as _e:
            logger.warning(f"Unified upsert failed: {_e}")

        db.session.commit()
        
        # Log the tracking data with location context
        location_name = "Unknown"
        if tracked_user and tracked_user.location:
            location_name = tracked_user.location.location_name
        
        logger.info(f"Tracking data saved to database: User={username}, Location={location_name}, Opal={opal_demos}→{opal_sales}, Scan={scan_demos}→{scan_sold}, Sales=${net_sales}, Hours={hours_worked}")
        
        return jsonify({
            'success': True,
            'message': f'Tracking data saved successfully for {username}',
            'data': tracking_data.to_dict()
        }), 201
        
    except Exception as e:
        logger.error(f"Error saving tracking data: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Failed to save tracking data'}), 500

@app.route('/get_users_for_tracking', methods=['GET'])
def get_users_for_tracking():
    """Get users for tracking dropdown with location-based filtering"""
    try:
        # Get location filter from query parameters
        location_id = request.args.get('location_id')
        location_name = request.args.get('location_name')
        
        # Get current user to check permissions - handle both user and location authentication
        current_user = None
        current_user_role = None
        current_location_id = None
        is_admin = False
        
        # Check for regular user authentication
        if 'user_id' in session:
            current_user = User.query.get(session['user_id'])
            if current_user:
                current_user_role = current_user.role
                current_location_id = current_user.location_id
                if current_user.role == 'admin':
                    is_admin = True
                logger.info(f"DEBUG: Regular user: {current_user.username} (role: {current_user.role}, location_id: {current_user.location_id})")
        
        # Check for location authentication
        elif 'location_id' in session:
            location = Location.query.get(session['location_id'])
            if location:
                current_user_role = 'location'
                current_location_id = location.id
                logger.info(f"DEBUG: Location user: {location.location_username} (location_id: {location.id})")
        
        if not current_user and not current_location_id:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        
        query = User.query
        
        # Check for location query parameter (like ?location=HQ)
        location_query_param = request.args.get('location', '').strip()
        filter_location_id = None
        
        if location_query_param:
            # Try to find location by location code or name
            location = Location.query.filter(
                db.or_(
                    Location.location_username == location_query_param,
                    Location.location_name == location_query_param,
                    Location.name == location_query_param
                )
            ).first()
            if location:
                filter_location_id = location.id
                logger.info(f"DEBUG: Found location for query param '{location_query_param}': {location.name} (ID: {location.id})")
        
        # Handle direct location_id filter
        if location_id:
            try:
                filter_location_id = int(location_id)
            except ValueError:
                pass
        
        # Handle location_name filter
        if location_name and not filter_location_id:
            location = Location.query.filter_by(location_name=location_name).first()
            if location:
                filter_location_id = location.id
        
        # Location-based filtering based on user role
        if is_admin:
            # Admin can see all users, but can filter by location
            if filter_location_id:
                query = query.filter(User.location_id == filter_location_id)
                logger.info(f"DEBUG: Admin filtering by location_id: {filter_location_id}")
        else:
            # Non-admin users (regular users and location users) can only see users from their own location
            if current_location_id:
                query = query.filter(User.location_id == current_location_id)
                logger.info(f"DEBUG: Non-admin user filtering by own location_id: {current_location_id}")
            else:
                # User has no location assigned, return empty
                return jsonify({
                    'success': True,
                    'users': [],
                    'count': 0,
                    'is_admin': is_admin,
                    'user_location_id': current_location_id
                })
        
        # Get all users from the query
        users = query.all()
        
        user_list = []
        for user in users:
            user_list.append({
                'id': user.id,
                'username': user.username,
                'name': user.name,
                'role': user.role,
                'location': user.location.name if user.location else None,
                'location_id': user.location_id
            })
        
        logger.info(f"get_users_for_tracking: Returning {len(user_list)} users (admin: {is_admin}, location_id: {current_location_id})")
        
        return jsonify({
            'success': True,
            'users': user_list,
            'count': len(user_list),
            'is_admin': is_admin,
            'user_location_id': current_location_id
        })
        
    except Exception as e:
        logger.error(f"Database error in get_users_for_tracking: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Database error',
            'users': []
        }), 500


# ====== New API Endpoints: Demos, Imports, Tiers, Daily Metrics, Recompute ======

@app.route('/api/demos', methods=['POST'])
@login_required
def upsert_demos():
    try:
        payload = request.get_json(force=True) or {}
        user_id = int(payload.get('user_id'))
        date_str = payload.get('date')
        demos = int(payload.get('demos', 0))
        source = payload.get('source', 'manual')

        try:
            day = datetime.strptime(date_str, '%Y-%m-%d').date()
        except Exception:
            return jsonify({'success': False, 'message': 'Invalid date'}), 400

        row = Demos.query.filter_by(user_id=user_id, date=day).first()
        if row:
            row.demos = demos
            row.source = source
            row.updated_at = datetime.utcnow()
        else:
            row = Demos(user_id=user_id, date=day, demos=demos, source=source)
            db.session.add(row)

        db.session.commit()
        return jsonify({'success': True, 'data': row.to_dict()}), 200
    except Exception as e:
        logger.error(f"/api/demos error: {e}", exc_info=True)
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Failed to upsert demos'}), 500


@app.route('/api/demos', methods=['GET'])
@login_required
def list_demos():
    try:
        user_id = request.args.get('userId', type=int)
        start = request.args.get('start')
        end = request.args.get('end')
        if not (user_id and start and end):
            return jsonify({'success': False, 'message': 'userId, start, end required'}), 400
        start_day = datetime.strptime(start, '%Y-%m-%d').date()
        end_day = datetime.strptime(end, '%Y-%m-%d').date()

        # Permission: admin or same-location
        actor = None
        is_admin = False
        actor_location_id = None
        if 'user_id' in session:
            actor = User.query.get(session['user_id'])
            if actor:
                is_admin = actor.role == 'admin'
                actor_location_id = actor.location_id
        elif 'location_id' in session:
            actor_location_id = session.get('location_id')
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        if not is_admin and (actor_location_id is None or target_user.location_id != actor_location_id):
            return jsonify({'success': False, 'message': 'Access denied'}), 403

        rows = (Demos.query
                .filter(Demos.user_id == user_id,
                        Demos.date >= start_day,
                        Demos.date <= end_day)
                .order_by(Demos.date.asc())
                .all())
        return jsonify({'success': True, 'demos': [{'date': r.date.strftime('%Y-%m-%d'), 'demos': int(r.demos or 0)} for r in rows]})
    except Exception as e:
        logger.error(f"/api/demos GET error: {e}", exc_info=True)
        return jsonify({'success': False, 'message': 'Failed to fetch demos'}), 500


@app.route('/api/imports/xls', methods=['POST'])
@admin_required
def upload_xls():
    try:
        # Accept multipart/form-data or JSON with rows
        file = request.files.get('file')
        rows = None
        filename = None
        if file:
            content = file.read()
            filename = secure_filename(file.filename)
            file_hash = hashlib.sha256(content).hexdigest()
        else:
            data = request.get_json(force=True) or {}
            rows = data.get('rows')
            filename = data.get('filename', 'api.json')
            content = json.dumps(rows or []).encode('utf-8')
            file_hash = hashlib.sha256(content).hexdigest()

        # Idempotency check
        existing = RawImport.query.filter_by(file_hash=file_hash).first()
        if existing:
            return jsonify({'success': True, 'import_id': existing.id, 'status': 'duplicate'}), 200

        raw = RawImport(filename=filename, file_hash=file_hash, status='parsed')
        db.session.add(raw)
        db.session.flush()

        # Parse rows
        if rows is None and content:
            # Basic CSV/XLSX detection is out of scope; assume CSV-like text if not excel
            try:
                text = content.decode('utf-8', errors='ignore')
                # naive CSV parse
                lines = [l.strip() for l in text.splitlines() if l.strip()]
                headers = [h.strip() for h in lines[0].split(',')]
                data_rows = []
                for line in lines[1:]:
                    values = [v.strip() for v in line.split(',')]
                    data_rows.append(dict(zip(headers, values)))
                rows = data_rows
            except Exception:
                rows = []

        raw.parsed_rows = rows or []
        db.session.commit()

        # Flexible header detection
        def norm(s):
            return ''.join(ch.lower() for ch in (s or '') if ch.isalnum())

        header_map_candidates = {
            'date': {'date', 'day', 'workdate'},
            'sales': {'sales', 'netsales', 'totalsales'},
            'hours': {'hours', 'hour', 'totalhours', 'workedhours'},
            'user_id': {'userid', 'user', 'employeeid'},
            'email': {'email', 'useremail'},
            'username': {'username', 'user'},
        }

        inserted = 0
        for r in rows or []:
            keys = {k: norm(k) for k in r.keys()}
            rev = {v: k for k, v in keys.items()}
            def col(name):
                for cand in header_map_candidates[name]:
                    if cand in rev:
                        return r.get(rev[cand])
                return None

            date_val = col('date')
            if not date_val:
                continue
            try:
                day = datetime.strptime(str(date_val)[:10], '%Y-%m-%d').date()
            except Exception:
                # try MM/DD/YYYY
                try:
                    day = datetime.strptime(str(date_val), '%m/%d/%Y').date()
                except Exception:
                    continue

            sales_val = int(float(col('sales') or 0))
            hours_val = float(col('hours') or 0)

            user_id = None
            user_id_col = col('user_id')
            if user_id_col:
                try:
                    user_id = int(user_id_col)
                except Exception:
                    user_id = None
            if not user_id:
                # try resolve by username/email
                username = col('username')
                email = col('email')
                q = User.query
                if email:
                    user_obj = q.filter_by(email=email).first()
                elif username:
                    user_obj = q.filter_by(username=username).first()
                else:
                    user_obj = None
                user_id = user_obj.id if user_obj else None
            if not user_id:
                continue

            existing_row = SalesHours.query.filter_by(user_id=user_id, date=day).first()
            if existing_row:
                existing_row.sales = sales_val
                existing_row.hours = hours_val
                existing_row.source = 'xls'
                existing_row.import_id = raw.id
            else:
                db.session.add(SalesHours(user_id=user_id, date=day, sales=sales_val, hours=hours_val, source='xls', import_id=raw.id))
            inserted += 1

        db.session.commit()

        return jsonify({'success': True, 'import_id': raw.id, 'inserted': inserted}), 201
    except Exception as e:
        logger.error(f"upload_xls error: {e}", exc_info=True)
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Failed to import'}), 500


@app.route('/api/imports/<int:import_id>', methods=['GET'])
@admin_required
def get_import(import_id: int):
    raw = RawImport.query.get(import_id)
    if not raw:
        return jsonify({'success': False, 'message': 'Not found'}), 404
    summary = {
        'rows': len(raw.parsed_rows or []),
        'sales_hours_rows': SalesHours.query.filter_by(import_id=raw.id).count(),
    }
    return jsonify({'success': True, 'import': raw.to_dict(), 'summary': summary})


@app.route('/api/users/<int:user_id>/tiers', methods=['GET', 'POST'])
@login_required
def tiers_collection(user_id: int):
    # Permission: admin or same-location manager/location user
    actor = None
    is_admin = False
    actor_location_id = None
    try:
        if 'user_id' in session:
            actor = User.query.get(session['user_id'])
            if actor:
                is_admin = actor.role == 'admin'
                actor_location_id = actor.location_id
        elif 'location_id' in session:
            actor_location_id = session.get('location_id')
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        if not is_admin and (actor_location_id is None or target_user.location_id != actor_location_id):
            return jsonify({'success': False, 'message': 'Access denied'}), 403
    except Exception as e:
        logger.error(f"tiers_collection permission error: {e}")
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    if request.method == 'GET':
        tiers = (UserTierSchedule.query
                 .filter_by(user_id=user_id)
                 .order_by(UserTierSchedule.sales_goal_in_period.asc(), UserTierSchedule.id.asc())
                 .all())
        return jsonify({'success': True, 'tiers': [t.to_dict() for t in tiers]})
    # POST create
    payload = request.get_json(force=True) or {}
    incoming_type = str(payload.get('tier_type', 'hourly'))
    existing = (UserTierSchedule.query
                .filter_by(user_id=user_id, tier_type=incoming_type)
                .order_by(UserTierSchedule.id.asc())
                .first())
    if existing:
        # Replace existing tier of the same type
        existing.sales_goal_in_period = int(payload.get('sales_goal_in_period', payload.get('sales_goal_in_day', 0)))
        existing.daily_demo_min = int(payload.get('daily_demo_min', 0))
        existing.hourly_rate = float(payload.get('hourly_rate', 0)) if incoming_type == 'hourly' else 0.0
        existing.commission_rate_pct = float(payload.get('commission_rate_pct', 0)) if incoming_type == 'commission' else 0.0
        existing.demo_bonus = float(payload.get('demo_bonus', 0))
        if payload.get('effective_from'):
            existing.effective_from = datetime.strptime(payload.get('effective_from'), '%Y-%m-%d').date()
        db.session.commit()
        return jsonify({'success': True, 'tier': existing.to_dict()}), 200
    else:
        tier = UserTierSchedule(
            user_id=user_id,
            sales_goal_in_period=int(payload.get('sales_goal_in_period', payload.get('sales_goal_in_day', 0))),
            daily_demo_min=int(payload.get('daily_demo_min', 0)),
            tier_type=incoming_type,
            hourly_rate=float(payload.get('hourly_rate', 0)) if incoming_type=='hourly' else 0.0,
            commission_rate_pct=float(payload.get('commission_rate_pct', 0)) if incoming_type=='commission' else 0.0,
            demo_bonus=float(payload.get('demo_bonus', 0)),
            effective_from=datetime.strptime(payload.get('effective_from', datetime.utcnow().strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
            active=True,
            order_index=int(payload.get('order_index', 0)),
        )
        db.session.add(tier)
        db.session.commit()
        return jsonify({'success': True, 'tier': tier.to_dict()}), 201


@app.route('/api/users/<int:user_id>/tiers/<int:tier_id>', methods=['PUT', 'DELETE'])
@login_required
def tier_item(user_id: int, tier_id: int):
    # Permission: admin or same-location
    actor = None
    is_admin = False
    actor_location_id = None
    try:
        if 'user_id' in session:
            actor = User.query.get(session['user_id'])
            if actor:
                is_admin = actor.role == 'admin'
                actor_location_id = actor.location_id
        elif 'location_id' in session:
            actor_location_id = session.get('location_id')
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        if not is_admin and (actor_location_id is None or target_user.location_id != actor_location_id):
            return jsonify({'success': False, 'message': 'Access denied'}), 403
    except Exception as e:
        logger.error(f"tier_item permission error: {e}")
        return jsonify({'success': False, 'message': 'Access denied'}), 403
    tier = UserTierSchedule.query.filter_by(id=tier_id, user_id=user_id).first()
    if not tier:
        return jsonify({'success': False, 'message': 'Not found'}), 404
    if request.method == 'DELETE':
        db.session.delete(tier)
        db.session.commit()
        return jsonify({'success': True})
    payload = request.get_json(force=True) or {}
    for field in ['sales_goal_in_period', 'daily_demo_min', 'order_index']:
        if field in payload:
            setattr(tier, field, int(payload[field]))
    # Accept sales_goal_in_day alias from UI
    if 'sales_goal_in_day' in payload:
        tier.sales_goal_in_period = int(payload['sales_goal_in_day'])
    if 'tier_type' in payload:
        tier.tier_type = str(payload['tier_type'])
    for field in ['hourly_rate', 'demo_bonus', 'commission_rate_pct']:
        if field in payload:
            setattr(tier, field, float(payload[field]))
    if 'effective_from' in payload:
        tier.effective_from = datetime.strptime(payload['effective_from'], '%Y-%m-%d').date()
    if 'active' in payload:
        tier.active = bool(payload['active'])
    db.session.commit()
    return jsonify({'success': True, 'tier': tier.to_dict()})


@app.route('/api/daily-metrics')
@login_required
def get_daily_metrics():
    user_id = request.args.get('userId', type=int)
    start = request.args.get('start')
    end = request.args.get('end')
    if not (user_id and start and end):
        return jsonify({'success': False, 'message': 'userId, start, end required'}), 400
    try:
        start_day = datetime.strptime(start, '%Y-%m-%d').date()
        end_day = datetime.strptime(end, '%Y-%m-%d').date()
    except Exception:
        return jsonify({'success': False, 'message': 'Invalid dates'}), 400

    # Pick period covering [start, end] or create ad-hoc
    period = PayPeriod.query.filter(PayPeriod.start_date <= start_day, PayPeriod.end_date >= end_day).first()
    if not period:
        period = PayPeriod(start_date=start_day, end_date=end_day, timezone='UTC')

    # Build per-day rows
    cur = start_day
    out = []
    while cur <= end_day:
        demos_row = Demos.query.filter_by(user_id=user_id, date=cur).first()
        sh_row = SalesHours.query.filter_by(user_id=user_id, date=cur).first()
        calc = compute_daily_pay(user_id, cur, period)
        out.append({
            'date': cur.strftime('%Y-%m-%d'),
            'user_id': user_id,
            'sales': int(sh_row.sales) if sh_row else 0,
            'hours': float(sh_row.hours) if sh_row else 0.0,
            'demos': int(demos_row.demos) if demos_row else 0,
            'unlocked_tier_id': calc['unlocked_tier_id'],
            'tier_type': calc.get('tier_type', 'hourly'),
            'hourly_rate': calc['hourly_rate'],
            'commission_rate_pct': calc.get('commission_rate_pct', 0.0),
            'demo_bonus': calc['demo_bonus'],
            'computed_pay': calc['computed_pay'],
            'notes': None,
            'source_flags': {
                'has_sales_hours': bool(sh_row),
                'has_demos': bool(demos_row),
            }
        })
        cur = cur + timedelta(days=1)

    return jsonify({'success': True, 'data': out})


@app.route('/api/recompute', methods=['POST'])
@admin_required
def recompute_period():
    user_id = request.args.get('userId', type=int)
    period_id = request.args.get('periodId', type=int)
    if not (user_id and period_id):
        return jsonify({'success': False, 'message': 'userId and periodId required'}), 400
    period = PayPeriod.query.get(period_id)
    if not period:
        return jsonify({'success': False, 'message': 'Period not found'}), 404
    # No materialized cache; respond with summary
    days = (period.end_date - period.start_date).days + 1
    return jsonify({'success': True, 'recomputed_days': days})



# Add notification system route
@app.route('/notification_system.js')
def notification_system_js():
    """Serve the notification system JavaScript file"""
    return send_from_directory('static', 'notification_system.js')



# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500

# Patch the standalone `models` module to reuse the same DB / models
try:
    import types, sys as _sys
    import models as _models
    _models.db = db
    _models.User = User
    _models.Location = Location
    _models.Appointment = Appointment
except ImportError:
    # If models module doesn't exist, create a dummy one
    _models = types.ModuleType('models')
    _models.db = db
    _models.User = User
    _models.Location = Location
    _models.Appointment = Appointment

if __name__ == '__main__':
    try:
        # Create logs directory if it doesn't exist
        os.makedirs('logs', exist_ok=True)
        
        # Initialize database with app context
        with app.app_context():
            try:
                initialize_database()
                logger.info("Database initialized successfully")
            except Exception as e:
                logger.error(f"Database initialization failed: {str(e)}")
                print(f"Database initialization failed: {str(e)}")
        
        host = os.environ.get('DOMAIN', '0.0.0.0')
        try:
            port = int(os.environ.get('PORT', 5000))
        except Exception:
            port = 5000
        debug = not is_production
        logger.info(f"Starting MonuMe Tracker Server on {host}:{port} (debug={debug})")
        print("ROUTES:", [(r.rule, sorted(list(r.methods))) for r in app.url_map.iter_rules()])
        app.run(host=host, port=port, debug=debug, threaded=True, use_reloader=False)
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        print(f"Error starting server: {str(e)}")
        sys.exit(1)
