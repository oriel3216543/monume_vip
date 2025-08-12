#!/usr/bin/env python3
"""
Debug script for user creation
"""

import requests
import json

def debug_user_creation():
    """Debug the user creation process"""
    
    # Test data
    test_user = {
        "name": "Debug Test User",
        "email": "debug@example.com",
        "username": "debuguser",
        "password": "password123",
        "role": "user",
        "is_active": True
    }
    
    try:
        print("Testing server connection...")
        health_response = requests.get('http://localhost:5000/health')
        print(f"Health check status: {health_response.status_code}")
        print(f"Health check response: {health_response.json()}")
        
        print("\nTesting user creation...")
        response = requests.post(
            'http://localhost:5000/api/users',
            headers={'Content-Type': 'application/json'},
            data=json.dumps(test_user)
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response JSON: {response_data}")
        except Exception as e:
            print(f"Failed to parse JSON response: {e}")
            print(f"Raw response: {response.text}")
        
        if response.status_code == 201:
            print("✅ User creation successful")
        else:
            print("❌ User creation failed")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the server is running on localhost:5000")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")

if __name__ == "__main__":
    debug_user_creation() 