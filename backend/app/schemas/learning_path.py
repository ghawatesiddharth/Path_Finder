from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LearningPathCreate(BaseModel):
    title: str
    description: str | None = None
    goal: str | None = None


class LearningPathResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: str | None = None
    goal: str | None = None
    career_path: str | None = None
    content: dict[str, Any] = Field(default_factory=dict)
    progress: float = 0.0
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerateLearningPathRequest(BaseModel):
    """Body for POST /recommendations/generate."""

    goal_text: str = ""
    career_path: str | None = None  # id from GET /career-paths
    experience_level: str = "Beginner"
    purpose: str = "personal growth"
    days_available: int | None = None
    free_only: bool = False
    # if omitted, falls back to the caller's saved profile.known_skills
    known_skills: list[str] | None = None


class LearningPathContentUpdate(BaseModel):
    """Body for PUT /learning-paths/{id}/content -- used by the frontend to
    persist the final assembled stages (with YouTube video tasks filled in)
    after it enriches the ML-generated skeleton client-side."""

    content: dict[str, Any]


class TaskProgressUpdate(BaseModel):
    stage_id: str
    task_id: str
    completed: bool