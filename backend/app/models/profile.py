import uuid

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class Profile(Base):
    __tablename__ = "profiles"

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
        unique=True,
        index=True,
    )

    full_name = Column(String(255), nullable=True)

    # id of an entry in app.ml.skill_graph.CAREER_PATHS (e.g. "web_dev", "ai_ml")
    career_path = Column(String(64), nullable=True)

    # free-text goal statement, e.g. "become a backend developer in 6 months"
    goals = Column(Text, nullable=True)

    purpose = Column(String(120), nullable=True)  # e.g. "placement", "upskilling"

    experience_level = Column(String(20), nullable=False, default="Beginner")

    weekly_hours = Column(Integer, nullable=True)

    # list of skill ids (see app.ml.skill_graph.SKILLS) the learner already knows
    known_skills = Column(JSONB, nullable=False, default=list)

    onboarding_completed = Column(Boolean, nullable=False, default=False)

    user = relationship("User", back_populates="profile")
