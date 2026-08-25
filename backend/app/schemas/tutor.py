from pydantic import BaseModel, Field


class TutorMessage(BaseModel):
    role: str  # "user" | "assistant"
    text: str


class TutorContext(BaseModel):
    learning_path_title: str | None = None
    stage_title: str | None = None
    skill: str | None = None


class TutorChatRequest(BaseModel):
    message: str
    history: list[TutorMessage] = Field(default_factory=list)
    context: TutorContext | None = None


class TutorChatResponse(BaseModel):
    reply: str
    provider: str
    mocked: bool = False
