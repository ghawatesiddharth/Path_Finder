from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.learning_paths import router as learning_paths_router


app = FastAPI(
    title="Path Finder API",
    description="Backend API for the Path Finder learning platform",
    version="1.0.0",
)


# Frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API routes
app.include_router(auth_router)
app.include_router(learning_paths_router)


@app.get("/")
def root():
    return {
        "message": "Path Finder API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }