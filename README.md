# PathFinder — personalized learning paths with a real recommendation model

PathFinder recommends a personalized, multi-platform learning path (Udemy +
Coursera courses, ranked by a real model, plus YouTube videos) for whatever
career track or goal a learner picks after signing up, tracks their progress
task-by-task, and gives them an AI tutor (powered by Groq) to ask for help
along the way.

## Architecture

```
frontend/   React + TypeScript + Vite + Tailwind (UI, YouTube enrichment)
backend/    FastAPI + PostgreSQL + scikit-learn (auth, ML recommender, AI tutor)
```

The backend owns the ML: goal matching, course ranking, and path sequencing.
The frontend owns rendering and pulling real YouTube videos client-side (so
a user's personal YouTube API key never has to touch the server).

## What's in the recommendation engine (`backend/app/ml/`)

1. `skill_graph.py` — a skill taxonomy with a prerequisite DAG, grouped into
   career paths (Web Dev, AI/ML, Data Science, Cybersecurity, Cloud/DevOps,
   Mobile, UI/UX, Business, or "something else").
2. `recommender.py` — TF-IDF + cosine similarity (scikit-learn) to map a
   learner's free-text goal onto the right skill, plus a weighted
   multi-factor course ranker over the bundled Udemy/Coursera dataset.
3. `path_generator.py` — walks the prerequisite graph backwards from the
   target skill to whatever the learner already knows, budgets stages
   across their available days, and attaches ranked courses + a sub-topic
   curriculum to every stage.

## End-to-end flow

1. **Sign up** — `POST /auth/register`, `/auth/login` — email/password + JWT.
2. **Onboarding** (`OnboardingPage.tsx` → `POST /profile`) — name,
   experience level, weekly hours, career path or free-text goal.
3. **Generate a path** (`POST /recommendations/generate`) — runs the ML
   model and persists a `LearningPath` row. The frontend enriches each
   stage with real YouTube videos client-side, then PUTs the enriched
   result back so it isn't re-fetched from YouTube on every reload.
4. **Track progress** — checking off a task recomputes completion % and
   auto-unlocks the next stage.
5. **Ask the AI tutor** — the chat panel calls `POST /tutor/chat`, which
   talks to Groq with the learner's current path/stage as context. With no
   `GROQ_API_KEY` set, it returns a clearly-labeled mock reply instead of
   failing, so the app still runs end-to-end without a key.

## Run it

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # fill in the values below
alembic upgrade head
uvicorn app.main:app --reload
```

You need a running PostgreSQL instance. In `.env`, set:
- `DATABASE_URL` — your Postgres connection string
- `SECRET_KEY` — any long random string, used to sign JWTs
- `GROQ_API_KEY` — free key from https://console.groq.com/keys (optional —
  the tutor runs in mock mode without it)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env               # VITE_API_URL, defaults to http://127.0.0.1:8000
npm run dev
```

Optionally paste a free [YouTube Data API v3
key](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
into the path-builder form to get real videos instead of placeholder
results. If you do, make sure in Google Cloud Console that:
- the **YouTube Data API v3** is enabled on that project, and
- the key has no "HTTP referrer" restriction (or it includes
  `http://localhost:5173/*`) — a mismatched restriction is the most common
  cause of the key silently failing and falling back to placeholder results.

Without a key, video tasks fall back to clearly-labeled mock results so the
app still runs end-to-end.

## Troubleshooting: "Could not reach the recommendation service"

This message means the frontend's `POST /recommendations/generate` call
never got a response. It is a **connection problem, not a bug in the
recommendation logic** — the ML code only runs after the request reaches
the backend.

Fastest path to the answer: from `backend/` (with your venv active), run

```bash
python check_setup.py
```

It checks `.env`, the DB connection, migrations, the course catalog, and
runs a sample path generation end-to-end, stopping at the first thing
that's actually broken. Or work through it manually in this order:

1. **Is the backend actually running?** Open
   `http://127.0.0.1:8000/health` in your browser. If it doesn't load,
   your `uvicorn app.main:app --reload` process either isn't running or
   crashed on startup — check that terminal for a Python traceback. The
   two most common startup crashes are a missing `.env` (see step 2) and
   Postgres not being reachable (see step 3).
2. **Does `backend/.env` exist and have real values?** `.env.example` is
   just a template — copy it to `.env` and fill in `DATABASE_URL` and
   `SECRET_KEY`. If `.env` is missing entirely, the backend raises
   `RuntimeError: DATABASE_URL is not set` on startup and never starts
   listening, which is exactly what produces this error on the frontend.
3. **Is PostgreSQL running and migrated?** This app requires a real
   Postgres instance (it uses `UUID`/`JSONB` column types, not SQLite).
   Confirm you can connect with the same credentials in `DATABASE_URL`,
   then run `alembic upgrade head` from `backend/` to create the tables.
   A connection refused / auth failed here also crashes the backend on
   startup.
4. **Is `VITE_API_URL` (frontend/.env) pointing at the right place?** It
   should match wherever uvicorn is actually listening (default
   `http://127.0.0.1:8000`). If you deployed the backend elsewhere, update
   this and restart `npm run dev` (Vite only reads `.env` at startup).
5. **Are you logged in?** `/recommendations/generate` requires a valid JWT.
   If your token expired, log out and back in. As of this update, this
   specific case now shows "Your session has expired" instead of the
   generic message, so if you still see the generic message it's steps
   1-4 (the backend is unreachable), not auth.
6. **CORS**: `main.py` only allows `http://localhost:5173` by default. If
   you run the frontend on a different port/host, add it to
   `allow_origins` in `backend/app/main.py` or the browser will silently
   block the response (visible as a CORS error in the browser console,
   distinct from a connection failure).

## Known scope limits

- Course dataset is static (bundled as JSON) rather than live-scraped — the
  ranking model itself is real, but it ranks a fixed catalog.
- Course "popularity" is a proxy for views/enrollment, since the source
  data only exposes one aggregate popularity number per course.
- The AI tutor has no long-term memory — it's given the last few chat turns
  plus the learner's current path/stage as context on every call.
