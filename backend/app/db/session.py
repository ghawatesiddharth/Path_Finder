from collections.abc import Generator

from sqlalchemy.orm import Session

from app.db.database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    Provide a database session for one API request.

    The session is automatically closed after
    the request finishes.
    """
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()