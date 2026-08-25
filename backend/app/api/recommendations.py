from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.session import get_db
from app.ml.path_generator import GenerationParams, generate_path
from app.ml.recommender import catalog_stats
from app.models.learning_path import LearningPath
from app.models.profile import Profile
from app.models.user import User
from app.schemas.learning_path import GenerateLearningPathRequest, LearningPathResponse

router = APIRouter(tags=["Recommendations"])


@router.get("/recommendations/catalog-stats")
def get_catalog_stats():
    return catalog_stats()


@router.post(
    "/recommendations/generate",
    response_model=LearningPathResponse,
    status_code=201,
)
def generate_recommendation(
    data: GenerateLearningPathRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Runs the content-based recommendation model (TF-IDF goal matching +
    weighted course ranking + prerequisite-graph path building) and
    persists the result as a new LearningPath the user can track progress
    against. A user can call this multiple times to build multiple,
    independent, concurrently-active learning paths.
    """
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()

    known_skills = data.known_skills
    if known_skills is None:
        known_skills = profile.known_skills if profile else []

    experience_level = data.experience_level or (profile.experience_level if profile else "Beginner")
    purpose = data.purpose or (profile.purpose if profile else "personal growth") or "personal growth"

    result = generate_path(GenerationParams(
        goal_text=data.goal_text or (profile.goals if profile else "") or "",
        career_path=data.career_path or (profile.career_path if profile else None),
        experience_level=experience_level,
        purpose=purpose,
        days_available=data.days_available,
        free_only=data.free_only,
        known_skills=known_skills,
    ))

    learning_path = LearningPath(
        user_id=current_user.id,
        title=result["title"],
        description=result.get("subtitle"),
        goal=data.goal_text or None,
        career_path=result.get("career_path"),
        content=result,
        progress=0.0,
        status="active",
    )

    db.add(learning_path)
    db.commit()
    db.refresh(learning_path)

    return learning_path
