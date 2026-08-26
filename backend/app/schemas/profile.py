from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProfileUpsert(BaseModel):
    full_name: str | None = None
    career_path: str | None = None  # id from GET /career-paths, or None for "other"
    goals: str | None = None  # free-text goal statement
    purpose: str | None = None  # e.g. "placement", "upskilling", "career switch"
    experience_level: str = Field(default="Beginner")  # Beginner|Intermediate|Advanced|Expert
    weekly_hours: int | None = None
    known_skills: list[str] = Field(default_factory=list)


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    full_name: str | None = None
    career_path: str | None = None
    goals: str | None = None
    purpose: str | None = None
    experience_level: str
    weekly_hours: int | None = None
    known_skills: list[str] = Field(default_factory=list)
    onboarding_completed: bool


class CareerPathOut(BaseModel):
    id: str
    label: str
    domain: str
    description: str
