from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LearningPathCreate(BaseModel):
    title: str
    description: str | None = None


class LearningPathResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: str | None = None
    status: str

    model_config = ConfigDict(from_attributes=True)