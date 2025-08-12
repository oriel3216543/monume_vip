# syntax=docker/dockerfile:1

# 🛠️ Builder stage
FROM python:3.12.3-slim-bullseye AS builder

# Environment
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 🧪 Final image
FROM python:3.12.3-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    wkhtmltopdf \
    sudo \
    curl \
    bash \
    ca-certificates \
    tzdata \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create user and temp dir
RUN groupadd -r monume && adduser --system --ingroup monume --home /app --shell /bin/bash --disabled-password monume && \
    mkdir -p /app/temp

COPY monume_sudo /etc/sudoers.d/monume
RUN chmod 440 /etc/sudoers.d/monume && chown root:root /etc/sudoers.d/monume

WORKDIR /app

# Copy Python packages
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Nginx config
COPY nginx_monumevip.conf /etc/nginx/conf.d/default.conf

# App directories
RUN mkdir -p /app/config /app/src /app/static

# Copy app files
COPY --chown=monume:monume server.py init_db.py email_sender.py pdf_generator.py start.sh requirements.txt /app/
COPY --chown=monume:monume config/. /app/config/
COPY --chown=monume:monume src/. /app/src/
COPY --chown=monume:monume static/. /app/static/

# Create environment file
RUN set -e; \
    echo "SECRET_KEY=$(head -c 32 /dev/urandom | base64 | tr -d '\n')" > /app/.env; \
    echo "DOMAIN=0.0.0.0" >> /app/.env; \
    echo "PORT=5000" >> /app/.env; \
    echo "FLASK_ENV=production" >> /app/.env; \
    chown monume:monume /app/.env; chmod 600 /app/.env

# Permissions
RUN chmod +x /app/start.sh && \
    chown -R monume:monume /app && \
    find /app -type f -name "*.py" -exec chmod 644 {} \; && \
    find /app -type d -exec chmod 755 {} \; && \
    find /app -type f -name "*.sh" -exec chmod 750 {} \;

RUN mkdir -p /app/logs && chown monume:monume /app/logs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

LABEL org.opencontainers.image.vendor="MonuMe" \
      org.opencontainers.image.title="MonuMe Tracker" \
      org.opencontainers.image.description="MonuMe Tracker Application" \
      org.opencontainers.image.version="1.0"

USER monume

CMD ["/bin/bash", "/app/start.sh"]
