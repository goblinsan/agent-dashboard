from fastapi import FastAPI
from .routes import well_known, projects, tasks
import os

app = FastAPI(title="MADB API")
app.include_router(well_known.router)
app.include_router(projects.router)
app.include_router(tasks.router)

def run():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("API_PORT", 8080)))
