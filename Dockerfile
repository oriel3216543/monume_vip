FROM python:3.12-slim

# Prevent Python from writing .pyc files and ensure stdout/stderr are unbuffered
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       wkhtmltopdf \
       curl \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt ./
RUN python -m pip install --upgrade pip \
    && pip install -r requirements.txt

# Project files
COPY . .

# Expose port (optional; some platforms ignore this)
EXPOSE 5000

# Start the web server
CMD ["sh","-c","gunicorn server:app --workers=2 --threads=2 --bind 0.0.0.0:${PORT:-5000}"]


