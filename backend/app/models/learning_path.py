import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, String, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title = Column(
        String(255),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    # free-text goal that produced this path, e.g. "become a backend developer"
    goal = Column(
        Text,
        nullable=True,
    )

    # id of the career path chosen on the profile (see app.ml.skill_graph),
    # nullable because a path can also be generated purely from free-text goal
    career_path = Column(
        String(64),
        nullable=True,
    )

    # full generated structure: stages, subtopics, ranked courses, and the
    # per-task completion state the frontend renders + updates. Kept as a
    # flexible JSON blob rather than a fully normalized schema so the ML
    # model's output shape can evolve without a migration every time.
    content = Column(
        JSONB,
        nullable=False,
        default=dict,
    )

    # 0-100, recomputed whenever a task's completion state changes
    progress = Column(
        Float,
        nullable=False,
        default=0.0,
        server_default="0",
    )

    status = Column(
        String(50),
        nullable=False,
        default="active",
        server_default="active",
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="learning_paths",
    )