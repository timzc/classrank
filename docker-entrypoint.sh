#!/bin/bash
set -e

# If the volume is empty, seed it with the bundled database
if [ ! -f /app/data/db.sqlite3 ] && [ -f /app/db.sqlite3 ]; then
    echo "Copying existing database to data volume..."
    mkdir -p /app/data
    cp /app/db.sqlite3 /app/data/db.sqlite3
fi

echo "Running database migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

echo "Starting server on port 8000..."
exec gunicorn classrank.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --timeout 240
