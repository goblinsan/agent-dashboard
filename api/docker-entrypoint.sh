#!/bin/sh
set -e

if [ "$#" -eq 0 ]; then
    set -- poetry run uvicorn app.main:app --host 0.0.0.0 --port "${API_PORT:-8080}"
fi

echo "Running Alembic migrations..."
poetry run alembic upgrade head

echo "Starting MADB API..."
exec "$@"
