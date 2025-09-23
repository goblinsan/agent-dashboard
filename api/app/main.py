import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import milestones, projects, tasks, well_known

app = FastAPI(title="MADB API", version="0.1.0")

raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "*")
if raw_origins == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(well_known.router)
app.include_router(projects.router)
app.include_router(milestones.router)
app.include_router(tasks.router)


def run() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("API_PORT", 8080)))
