from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
# Make sure you have the correct config for your database here
db = SQLAlchemy(app)

# --- MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128))
    email = db.Column(db.String(128), unique=True)
    username = db.Column(db.String(64), unique=True)
    # ...other fields...

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

class Employee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128))
    email = db.Column(db.String(128), unique=True)
    role = db.Column(db.String(32), default='employee')
    phone = db.Column(db.String(20))

# Create tables
with app.app_context():
    db.create_all()

# --- API ENDPOINTS ---
@app.route('/api/hello', methods=['GET'])
def hello():
    return jsonify({'message': 'Hello from the Employee Management API!'})

@app.route('/api/test-db', methods=['GET'])
def test_db():
    try:
        # Test database connection by creating a test user
        test_user = User(name='Test User', email='test@example.com', username='testuser')
        db.session.add(test_user)
        db.session.commit()
        
        # Clean up test user
        db.session.delete(test_user)
        db.session.commit()
        
        return jsonify({'status': 'success', 'message': 'Database connection working!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

if __name__ == '__main__':
    print("Starting Employee Management Server...")
    print("Database setup complete!")
    app.run(debug=True, host='0.0.0.0', port=5001) 