from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.learning_path import LearningPath
from app.api.auth import get_current_user
from app.schemas.learning_path import (
    LearningPathContentUpdate,
    LearningPathCreate,
    LearningPathResponse,
    TaskProgressUpdate,
)

router = APIRouter(
    prefix="/learning-paths",
    tags=["Learning Paths"],
)


def _recompute_progress(content: dict) -> float:
    """Walks every task in every stage and returns overall completion %."""
    total = 0
    done = 0
    for stage in content.get("stages", []):
        for task in stage.get("tasks", []):
            total += 1
            if task.get("completed"):
                done += 1
    if total == 0:
        return 0.0
    return round(100 * done / total, 2)


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
    """Manual/blank path creation. For ML-recommended paths, use
    POST /recommendations/generate instead."""
    learning_path = LearningPath(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        goal=data.goal,
        content={},
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


def _get_owned_path(learning_path_id: UUID, db: Session, current_user: User) -> LearningPath:
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


@router.put(
    "/{learning_path_id}/content",
    response_model=LearningPathResponse,
)
def update_learning_path_content(
    learning_path_id: UUID,
    data: LearningPathContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Used by the frontend after it enriches the ML-generated stage skeleton
    with real YouTube video tasks (title/url/thumbnail per sub-topic).
    Persists the full stage/task structure and recomputes progress.
    """
    learning_path = _get_owned_path(learning_path_id, db, current_user)

    learning_path.content = data.content
    learning_path.progress = _recompute_progress(data.content)

    db.commit()
    db.refresh(learning_path)

    return learning_path


@router.patch(
    "/{learning_path_id}/progress",
    response_model=LearningPathResponse,
)
def update_task_progress(
    learning_path_id: UUID,
    data: TaskProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marks a single task (course/video/project) done or not-done and
    recomputes the path's overall progress percentage."""
    learning_path = _get_owned_path(learning_path_id, db, current_user)

    content = dict(learning_path.content or {})
    stages = content.get("stages", [])

    found = False
    for stage in stages:
        if stage.get("id") != data.stage_id:
            continue
        for task in stage.get("tasks", []):
            if task.get("id") == data.task_id:
                task["completed"] = data.completed
                found = True
                break

    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage or task not found in this learning path",
        )

    content["stages"] = stages
    learning_path.content = content
    learning_path.progress = _recompute_progress(content)

    # unlock the next stage once every task in the current one is done
    for i, stage in enumerate(stages):
        tasks = stage.get("tasks", [])
        if tasks and all(t.get("completed") for t in tasks) and stage.get("status") != "completed":
            stage["status"] = "completed"
            if i + 1 < len(stages) and stages[i + 1].get("status") == "locked":
                stages[i + 1]["status"] = "active"
    content["stages"] = stages
    learning_path.content = content

    db.commit()
    db.refresh(learning_path)

    return learning_path