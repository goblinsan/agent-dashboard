# Multi-Agent Project Dashboard (Starter)

## Running with Docker Compose

1. Copy `.env.example` to `.env` and adjust as needed.
2. Start the stack: `docker-compose up --build`.
   - Postgres, Redis, API, and Web containers will start together.
   - The API container now runs Alembic migrations automatically before launching Uvicorn.
3. The API is available at `http://localhost:8080`; the web client runs at `http://localhost:5173`.

## Manually rerunning migrations

If you need to apply migrations again, use `docker-compose exec api poetry run alembic upgrade head`.
