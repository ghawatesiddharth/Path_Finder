from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.ml.skill_graph import CAREER_PATHS, SKILLS
from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import CareerPathOut, ProfileResponse, ProfileUpsert

router = APIRouter(tags=["Profile"])


@router.get("/career-paths", response_model=list[CareerPathOut])
def list_career_paths():
    """Choices shown on the onboarding screen (Web Dev, AI/ML, Cybersecurity, ...)."""
    return CAREER_PATHS


@router.get("/skills")
def list_skills():
    """Full skill taxonomy, for a 'skills you already know' picker on onboarding."""
    return [
        {"id": sid, "label": node.label, "domain": node.domain, "level": node.level}
        for sid, node in SKILLS.items()
    ]


@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not created yet. POST /profile to complete onboarding.",
        )
    return profile


@router.post("/profile", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_or_complete_profile(
    data: ProfileUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()

    if profile is None:
        profile = Profile(user_id=current_user.id)
        db.add(profile)

    profile.full_name = data.full_name
    profile.career_path = data.career_path
    profile.goals = data.goals
    profile.purpose = data.purpose
    profile.experience_level = data.experience_level
    profile.weekly_hours = data.weekly_hours
    profile.known_skills = data.known_skills
    profile.onboarding_completed = True

    db.commit()
    db.refresh(profile)
    return profile


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    data: ProfileUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_or_complete_profile(data, db, current_user)
