from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Create database instance but don't initialize with app yet
db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128))
    email = db.Column(db.String(128), unique=True)
    username = db.Column(db.String(64), unique=True)
    password = db.Column(db.String(255))
    role = db.Column(db.String(32), default='user')
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
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
    address = db.Column(db.String(255))
    phone = db.Column(db.String(32))
    email = db.Column(db.String(128))
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
    type = db.Column(db.String(64))
    notes = db.Column(db.Text)
    host_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    location_id = db.Column(db.Integer, db.ForeignKey('location.id'))
    status = db.Column(db.String(32), default='scheduled')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    host = db.relationship('User', backref='appointments')
    location = db.relationship('Location', backref='appointments')
    
    def __repr__(self):
        return f'<Appointment {self.client_name} - {self.date} {self.time}>'
