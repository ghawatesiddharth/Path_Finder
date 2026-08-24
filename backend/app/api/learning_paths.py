from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.learning_path import LearningPath
from app.api.auth import get_current_user
from app.schemas.learning_path import (
    LearningPathCreate,
    LearningPathResponse,
)

router = APIRouter(
    prefix="/learning-paths",
    tags=["Learning Paths"],
)


@router.post(
    "",
    response_model=LearningPathResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_learning_path(
    data: LearningPathCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    learning_path = LearningPath(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        goal=getattr(data, "goal", None),
        status="active",
    )

    db.add(learning_path)
    db.commit()
    db.refresh(learning_path)

    return learning_path


@router.get(
    "",
    response_model=list[LearningPathResponse],
)
def get_learning_paths(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(LearningPath)
        .filter(LearningPath.user_id == current_user.id)
        .order_by(LearningPath.created_at.desc())
        .all()
    )


@router.get(
    "/{learning_path_id}",
    response_model=LearningPathResponse,
)
def get_learning_path(
    learning_path_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    learning_path = (
        db.query(LearningPath)
        .filter(
            LearningPath.id == learning_path_id,
            LearningPath.user_id == current_user.id,
        )
        .first()
    )

    if not learning_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning path not found",
        )

    return learning_path


@router.delete(
    "/{learning_path_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_learning_path(
    learning_path_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    learning_path = (
        db.query(LearningPath)
        .filter(
            LearningPath.id == learning_path_id,
            LearningPath.user_id == current_user.id,
        )
        .first()
    )

    if not learning_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Learning path not found",
        )

    db.delete(learning_path)
    db.commit()

    return None