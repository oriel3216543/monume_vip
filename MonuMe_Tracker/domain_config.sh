#!/bin/bash

# MonuMe Tracker Domain Deployment Configuration
# Use this script to easily deploy on your domain

echo "🚀 Setting up MonuMe Tracker for domain deployment..."

# Default configuration - modify these for your domain
export DOMAIN="monumevip.com"
export PRODUCTION="true"
export PORT="5000"

# Optional: Set these if you have SSL certificates
# export SSL_CERT="/path/to/your/certificate.crt"
# export SSL_KEY="/path/to/your/private.key"

# Generate a secure secret key for production
export SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")

echo "✅ Configuration set:"
echo "   DOMAIN: $DOMAIN"
echo "   PRODUCTION: $PRODUCTION"
echo "   PORT: $PORT"
echo "   SECRET_KEY: [Generated securely]"

echo ""
echo "🔧 To customize for your domain:"
echo "   1. Edit this file and change DOMAIN to your domain"
echo "   2. Run: source domain_config.sh"
echo "   3. Run: python server.py"
echo ""
echo "📱 Your appointment system will be available at:"
echo "   http://$DOMAIN:$PORT"
echo "   http://$DOMAIN:$PORT/appointment.html"
echo ""
echo "🔒 For HTTPS (recommended for production):"
echo "   1. Get SSL certificates"
echo "   2. Uncomment and set SSL_CERT and SSL_KEY above"
echo "   3. Use a reverse proxy like nginx"
echo ""

# Start server if requested
if [ "$1" = "start" ]; then
    echo "🚀 Starting server..."
    python server.py
fi 