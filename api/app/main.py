import os

from fastapi import FastAPI

from .routes import milestones, projects, tasks, well_known

app = FastAPI(title="MADB API", version="0.1.0")
app.include_router(well_known.router)
app.include_router(projects.router)
app.include_router(milestones.router)
app.include_router(tasks.router)


def run() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("API_PORT", 8080)))
