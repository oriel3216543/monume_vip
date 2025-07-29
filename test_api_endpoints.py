#!/usr/bin/env python3
"""
MonuMe VIP API Endpoint Testing Script
Tests all API endpoints to ensure they work correctly
"""

import requests
import json
import time

BASE_URL = "http://localhost:5000"

def test_endpoint(method, endpoint, data=None, expected_status=200):
    """Test a single API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        elif method == "OPTIONS":
            response = requests.options(url, timeout=10)
        
        print(f"✓ {method} {endpoint}: {response.status_code} - {response.reason}")
        
        if response.status_code == expected_status:
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    json_response = response.json()
                    print(f"  Response: {json.dumps(json_response, indent=2)}")
                except:
                    print(f"  Response: {response.text[:100]}...")
            else:
                print(f"  Response: {response.text[:100]}...")
            return True
        else:
            print(f"  ❌ Expected {expected_status}, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ {method} {endpoint}: ERROR - {str(e)}")
        return False

def main():
    print("🚀 Testing MonuMe VIP API Endpoints\n")
    
    # Wait for server to be ready
    print("Waiting for server to be ready...")
    time.sleep(3)
    
    test_results = []
    
    # Test health endpoint
    print("=== Health Check ===")
    test_results.append(test_endpoint("GET", "/api/health"))
    test_results.append(test_endpoint("OPTIONS", "/api/health"))
    
    # Test login endpoint
    print("\n=== Login API ===")
    test_results.append(test_endpoint("OPTIONS", "/api/login"))
    
    # Test admin login
    admin_data = {"username": "admin", "password": "admin123"}
    print(f"\nTesting admin login with {admin_data}")
    test_results.append(test_endpoint("POST", "/api/login", admin_data))
    
    # Test location login
    location_data = {"username": "test_location", "password": "test_location123"}
    print(f"\nTesting location login with {location_data}")
    test_results.append(test_endpoint("POST", "/api/login", location_data))
    
    # Test queens login
    queens_data = {"username": "queens", "password": "queens123"}
    print(f"\nTesting queens login with {queens_data}")
    test_results.append(test_endpoint("POST", "/api/login", queens_data))
    
    # Test invalid login
    invalid_data = {"username": "invalid", "password": "invalid"}
    print(f"\nTesting invalid login with {invalid_data}")
    test_results.append(test_endpoint("POST", "/api/login", invalid_data, expected_status=401))
    
    # Test static file serving
    print("\n=== Static Files ===")
    test_results.append(test_endpoint("GET", "/static/login.html"))
    test_results.append(test_endpoint("GET", "/static/js/login.js"))
    test_results.append(test_endpoint("GET", "/icon.JPG"))
    
    # Test main routes
    print("\n=== Main Routes ===")
    test_results.append(test_endpoint("GET", "/"))
    
    # Summary
    print(f"\n📊 Test Results: {sum(test_results)}/{len(test_results)} passed")
    
    if all(test_results):
        print("🎉 All API endpoints are working correctly!")
    else:
        print("⚠️  Some endpoints need attention")

if __name__ == "__main__":
    main() 