"""
Run this from backend/ (with your venv active) to diagnose why the
frontend shows "Could not reach the recommendation service":

    python check_setup.py

It checks, in order: .env present -> required vars set -> DB reachable ->
tables migrated -> course catalog loads -> ML model imports cleanly. It
stops at the first failure and tells you exactly what to fix, instead of
making you dig through a stack trace.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))


def fail(msg: str) -> None:
    print(f"\n[FAIL] {msg}\n")
    sys.exit(1)


def ok(msg: str) -> None:
    print(f"[OK]   {msg}")


def main() -> None:
    print("PathFinder backend setup check\n" + "-" * 40)

    # 1. .env present
    env_path = BACKEND_DIR / ".env"
    if not env_path.exists():
        fail(
            ".env file not found at backend/.env.\n"
            "       Fix: cp .env.example .env, then fill in DATABASE_URL and SECRET_KEY."
        )
    ok(".env file found")

    from dotenv import load_dotenv
    load_dotenv(env_path)

    # 2. required vars set
    db_url = os.getenv("DATABASE_URL")
    secret = os.getenv("SECRET_KEY")
    if not db_url:
        fail("DATABASE_URL is empty in .env.\n       Fix: set it to your Postgres connection string.")
    if not secret:
        fail("SECRET_KEY is empty in .env.\n       Fix: set it to any long random string.")
    ok("DATABASE_URL and SECRET_KEY are set")

    # 3. DB reachable
    try:
        from sqlalchemy import create_engine, text
        engine = create_engine(db_url, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:  # noqa: BLE001
        fail(
            f"Could not connect to the database at DATABASE_URL.\n"
            f"       Error: {e}\n"
            f"       Fix: make sure PostgreSQL is running, the database in DATABASE_URL "
            f"exists, and the credentials are correct."
        )
    ok("Database connection succeeded")

    # 4. tables migrated
    try:
        from sqlalchemy import inspect
        insp = inspect(engine)
        tables = set(insp.get_table_names())
        required = {"users", "learning_paths", "profiles"}
        missing = required - tables
        if missing:
            fail(
                f"Missing tables: {sorted(missing)}.\n"
                f"       Fix: run `alembic upgrade head` from backend/ to apply migrations."
            )
    except Exception as e:  # noqa: BLE001
        fail(f"Could not inspect database tables.\n       Error: {e}")
    ok("Required tables exist (migrations applied)")

    # 5. course catalog loads
    try:
        from app.ml.recommender import load_courses, catalog_stats
        courses = load_courses()
        stats = catalog_stats()
        if not courses:
            fail("Course catalog (app/data/courses.json) loaded but is empty.")
    except Exception as e:  # noqa: BLE001
        fail(f"Failed to load the course catalog.\n       Error: {e}")
    ok(f"Course catalog loaded: {stats['total_courses']} courses "
       f"({', '.join(stats['providers'])}), {stats['total_skills_tagged']} skills tagged")

    # 6. ML model imports / runs end-to-end on a sample goal
    try:
        from app.ml.path_generator import GenerationParams, generate_path
        result = generate_path(GenerationParams(
            goal_text="learn python for data science",
            career_path=None,
            experience_level="Beginner",
        ))
        n_stages = len(result["stages"])
        n_subtopics = sum(len(s["subtopics"]) for s in result["stages"])
        n_courses = sum(len(s["courses"]) for s in result["stages"])
    except Exception as e:  # noqa: BLE001
        fail(f"generate_path() raised an exception on a sample goal.\n       Error: {e}")
    ok(
        f"Sample path generation succeeded: {n_stages} stage(s), "
        f"{n_subtopics} subtopic(s) total, {n_courses} ranked course(s) total"
    )

    print("\nAll checks passed. If the frontend still can't reach the service:")
    print("  - Confirm uvicorn is actually running: uvicorn app.main:app --reload")
    print("  - Confirm frontend/.env VITE_API_URL matches where uvicorn is listening")
    print("  - Confirm you're logged in (a valid JWT) when clicking 'Generate path'")


if __name__ == "__main__":
    main()
