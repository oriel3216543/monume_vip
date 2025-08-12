# MonuMe Tracker Environment Checker
# This script checks if everything is properly configured for both local and production environments

import os
import sys
import sqlite3
import socket
import json
from pathlib import Path

def check_local_environment():
    """Check local development environment (port 5000)"""
    print("🔍 Checking Local Environment (Port 5000)...")
    
    issues = []
    success = []
    
    # 1. Check database exists
    if os.path.exists('monume.db'):
        success.append("✅ Database file exists")
        
        # Test database connection
        try:
            conn = sqlite3.connect('monume.db')
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            conn.close()
            success.append(f"✅ Database connection works ({len(tables)} tables found)")
        except Exception as e:
            issues.append(f"❌ Database connection failed: {e}")
    else:
        issues.append("❌ Database file (monume.db) not found")
    
    # 2. Check static files
    static_files = [
        'static/dashboard.html',
        'static/team_chat.html', 
        'static/emails.html',
        'static/style.css',
        'static/script.js'
    ]
    
    for file_path in static_files:
        if os.path.exists(file_path):
            success.append(f"✅ {file_path} exists")
        else:
            issues.append(f"❌ {file_path} missing")
    
    # 3. Check recent changes (mark read functionality)
    mark_read_files = [
        'test_mark_read.html',
        'test_dashboard_changes.html'
    ]
    
    for file_path in mark_read_files:
        if os.path.exists(file_path):
            success.append(f"✅ {file_path} exists (recent changes)")
        else:
            issues.append(f"⚠️ {file_path} missing (recent test file)")
    
    # 4. Check configuration files
    config_files = [
        'requirements.txt',
        'server.py',
        'static_config.js'
    ]
    
    for file_path in config_files:
        if os.path.exists(file_path):
            success.append(f"✅ {file_path} exists")
        else:
            issues.append(f"❌ {file_path} missing")
    
    return success, issues

def check_production_environment():
    """Check production environment configuration (www.monumevip.com)"""
    print("🌐 Checking Production Environment Configuration...")
    
    issues = []
    success = []
    
    # 1. Check nginx configuration
    if os.path.exists('nginx_monumevip.conf'):
        success.append("✅ Nginx configuration file exists")
        
        # Check nginx config content
        with open('nginx_monumevip.conf', 'r') as f:
            content = f.read()
            
        if 'monumevip.com' in content:
            success.append("✅ Domain configured in nginx")
        else:
            issues.append("❌ Domain not properly configured in nginx")
            
        if 'localhost:8080' in content:
            success.append("✅ Backend proxy configured (port 8080)")
        else:
            issues.append("❌ Backend proxy not configured properly")
    else:
        issues.append("❌ Nginx configuration file missing")
    
    # 2. Check deployment scripts
    deployment_files = [
        'deploy.py',
        'domain_config.sh',
        'domain_config.bat'
    ]
    
    for file_path in deployment_files:
        if os.path.exists(file_path):
            success.append(f"✅ {file_path} exists")
        else:
            issues.append(f"❌ {file_path} missing")
    
    # 3. Check static_config.js for production API
    if os.path.exists('static_config.js'):
        with open('static_config.js', 'r') as f:
            content = f.read()
        
        if 'monumevip.com' in content:
            success.append("✅ Production API URL configured in static_config.js")
        else:
            issues.append("❌ Production API URL not configured in static_config.js")
    
    # 4. Check CNAME file for GitHub Pages
    if os.path.exists('CNAME'):
        with open('CNAME', 'r') as f:
            domain = f.read().strip()
        
        if domain == 'www.monumevip.com':
            success.append("✅ CNAME file properly configured")
        else:
            issues.append(f"❌ CNAME file has wrong domain: {domain}")
    else:
        issues.append("⚠️ CNAME file missing (needed for GitHub Pages)")
    
    return success, issues

def test_port_availability(port):
    """Test if a port is available or in use"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex(('localhost', port))
            if result == 0:
                return f"⚠️ Port {port} is in use (server might be running)"
            else:
                return f"✅ Port {port} is available"
    except Exception as e:
        return f"❌ Error testing port {port}: {e}"

def check_recent_changes():
    """Check if recent mark read functionality changes are present"""
    print("🔄 Checking Recent Mark Read Functionality Changes...")
    
    success = []
    issues = []
    
    # Check team chat changes
    team_chat_path = 'static/team_chat.html'
    if os.path.exists(team_chat_path):
        with open(team_chat_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for mark read functionality
        if 'markMessageAsRead' in content:
            success.append("✅ Mark read function present in team chat")
        else:
            issues.append("❌ Mark read function missing in team chat")
        
        if 'updateMessageReadStatus' in content:
            success.append("✅ Update message read status function present")
        else:
            issues.append("❌ Update message read status function missing")
    else:
        issues.append("❌ team_chat.html missing")
    
    # Check dashboard changes
    dashboard_path = 'static/dashboard.html'
    if os.path.exists(dashboard_path):
        with open(dashboard_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for mark all messages as read functionality
        if 'markAllMessagesAsRead' in content:
            success.append("✅ Mark all messages as read function present in dashboard")
        else:
            issues.append("❌ Mark all messages as read function missing in dashboard")
        
        if 'updateActiveUsersCountReal' in content:
            success.append("✅ Real active users count function present")
        else:
            issues.append("❌ Real active users count function missing")
    else:
        issues.append("❌ dashboard.html missing")
    
    return success, issues

def generate_startup_commands():
    """Generate startup commands for both environments"""
    print("\n📋 Startup Commands:")
    print("=" * 50)
    
    print("\n🔧 Local Development (Port 5000):")
    print("# Windows:")
    print("start_local.bat")
    print("# Or manually:")
    print("python server.py")
    print("# Then visit: http://localhost:5000")
    
    print("\n🚀 Production Deployment (Port 8080):")
    print("# Windows:")
    print("start_production.bat")
    print("# Or manually:")
    print("python deploy.py --production --domain www.monumevip.com --port 8080")
    print("# Make sure nginx is configured and running")
    print("# Then visit: https://www.monumevip.com")
    
    print("\n⚙️ Environment Variables for Production:")
    print("set DOMAIN=www.monumevip.com")
    print("set PRODUCTION=true")
    print("set PORT=8080")

def main():
    """Main function to run all checks"""
    print("🎯 MonuMe Tracker Environment Checker")
    print("=" * 50)
    
    all_success = []
    all_issues = []
    
    # Check local environment
    success, issues = check_local_environment()
    all_success.extend(success)
    all_issues.extend(issues)
    
    print()
    
    # Check production environment
    success, issues = check_production_environment()
    all_success.extend(success)
    all_issues.extend(issues)
    
    print()
    
    # Check recent changes
    success, issues = check_recent_changes()
    all_success.extend(success)
    all_issues.extend(issues)
    
    print()
    
    # Test port availability
    print("🧪 Testing Port Availability...")
    port_5000_status = test_port_availability(5000)
    port_8080_status = test_port_availability(8080)
    
    print(f"  {port_5000_status}")
    print(f"  {port_8080_status}")
    
    if "✅" in port_5000_status:
        all_success.append(port_5000_status)
    else:
        all_issues.append(port_5000_status)
        
    if "✅" in port_8080_status:
        all_success.append(port_8080_status)
    else:
        all_issues.append(port_8080_status)
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)
    
    print(f"\n✅ Success ({len(all_success)} items):")
    for item in all_success:
        print(f"  {item}")
    
    if all_issues:
        print(f"\n❌ Issues ({len(all_issues)} items):")
        for item in all_issues:
            print(f"  {item}")
    
    # Generate startup commands
    generate_startup_commands()
    
    print("\n🎉 Environment check complete!")
    
    critical_issues = [i for i in all_issues if i.startswith("❌")]
    
    if len(critical_issues) == 0:
        print("🌟 Everything looks perfect! Ready to deploy to both environments.")
        print("\n💡 Quick Start:")
        print("  - For local development: run 'start_local.bat' or 'python server.py'")
        print("  - For production: run 'start_production.bat' or use deploy.py")
    elif len(critical_issues) <= 2:
        print("⚠️ Minor issues found, but core functionality should work.")
        print("   You can proceed with testing, but consider fixing the issues.")
    else:
        print("🔧 Several issues need attention before deployment.")
        print("   Please fix the critical issues (❌) before proceeding.")

if __name__ == "__main__":
    main() 