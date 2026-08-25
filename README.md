# PathFinder — personalized learning paths, backed by a real recommendation model

PathFinder recommends a personalized, multi-platform learning path (Udemy +
Coursera courses, ranked by a real model, plus YouTube videos) for whatever
career track or goal a learner picks after signing up, tracks their progress
task-by-task, and gives them an AI tutor to ask for help along the way.

## Architecture

```
frontend/   React + TypeScript + Vite + Tailwind (UI, YouTube enrichment)
backend/    FastAPI + PostgreSQL + scikit-learn (auth, ML recommender, AI tutor)
```

The backend owns the ML: **goal matching, course ranking, and path
sequencing**. The frontend owns two things the backend shouldn't: rendering,
and pulling real YouTube videos client-side (so a user's personal YouTube API
key never has to touch the server).

## What's in the recommendation engine (`backend/app/ml/`)

1. **`skill_graph.py`** — a 28-skill taxonomy with a prerequisite DAG (e.g.
   `deep_learning` requires `machine_learning` requires
   `stats_foundations` + `data_analysis`), grouped into 9 career paths (Web
   Dev, AI/ML, Data Science, Cybersecurity, Cloud/DevOps, Mobile,
   UI/UX, Business, or "something else").
2. **`recommender.py`** — real TF-IDF + cosine similarity (scikit-learn)
   over the skill-keyword corpus to map a learner's free-text goal onto the
   right skill, plus a weighted multi-factor course ranker over the bundled
   1,349-course Udemy/Coursera dataset (rating 40%, popularity/enrollment
   30%, price 15%, level-match 15%).
3. **`path_generator.py`** — walks the prerequisite graph backwards from the
   target skill to whatever the learner already knows, budgets stages across
   their available days/weeks, and attaches the top-ranked courses + a
   sub-topic curriculum to every stage.

## What happens end to end

1. **Sign up** (`POST /auth/register`, `/auth/login`) — plain email/password
   + JWT, nothing new here.
2. **Onboarding** (`OnboardingPage.tsx` -> `POST /profile`) — name,
   experience level, weekly hours, a career path pick (or free-text goal),
   and any skills already known. This is required before the rest of the
   app unlocks (`App.tsx` gates on `GET /profile`).
3. **Generate a path** (`POST /recommendations/generate`) — runs the ML
   model above and persists a `LearningPath` row (stages + ranked courses +
   sub-topics, as a JSONB blob). The frontend then enriches each stage's
   sub-topics with real YouTube videos client-side
   (`lib/backendPathAdapter.ts` + the existing `lib/youtube.ts`) and PUTs
   the enriched result back so it doesn't re-hit YouTube on reload.
   **A user can call this as many times as they want** — every call creates
   an independent path, so someone can be working through a Web Dev path
   and a Data Science path at the same time (`PathPage.tsx` -> "browse" view
   lists all of them; only one is "active"/shown on the dashboard).
4. **Track progress** — checking off a task (`PATCH
   /learning-paths/{id}/progress`) recomputes the path's completion % and
   auto-unlocks the next stage once every task in the current one is done.
5. **Ask the AI tutor** — the floating chat panel now calls `POST
   /tutor/chat`, which talks to a real LLM (Anthropic, Groq, or OpenAI —
   whichever key you set) with the learner's current path/stage as context.
   With no key set, it returns a clearly-labeled mock reply instead of
   failing, so the app still runs end-to-end for a demo.

## Run it

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # or your preferred env tool
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL, SECRET_KEY, and (optionally) an LLM key
alembic upgrade head
uvicorn app.main:app --reload
```

Needs a running PostgreSQL instance matching `DATABASE_URL`. To power the AI
tutor with real replies, set **one** of `ANTHROPIC_API_KEY`, `GROQ_API_KEY`,
or `OPENAI_API_KEY` in `.env`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL, defaults to http://127.0.0.1:8000
npm run dev
```

Optionally paste a free [YouTube Data API v3
key](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
into the path-builder form — without one, video tasks fall back to
clearly-labeled mock results so the app still runs.

## Known scope limits (useful for a report/viva)

- **Course dataset is static** (1,349 Udemy/Coursera courses bundled as
  JSON, cleaned from `coursea_data.csv`/`udemy_course_data.csv`) rather than
  live-scraped — the ranking model itself is real, but it's ranking a fixed
  catalog. Swapping in a live API per-platform is the natural next step and
  wouldn't require changing `recommender.py`'s scoring logic.
- **Course "popularity" is used as a proxy for views/enrollments/likes**
  since the source CSVs only expose one aggregate popularity number per
  course, not separate views/likes/enrollment counts.
- **Task IDs are namespaced per generated path** (`{pathId}__{skillId}_...`)
  so the same skill appearing in two different paths (e.g. `python_basics`
  in both a Data Science path and an AI/ML path) tracks completion
  independently.
- **The AI tutor has no long-term memory** — it's given the last ~8 chat
  turns plus the learner's current path/stage as context on every call, not
  a persisted conversation thread.
- Java's sub-topic breakdown is the most exhaustive (24 topics); a few
  others (Python, DSA, JS, ML) are expanded but not as deeply — see
  `SUBTOPICS` in `backend/app/ml/skill_graph.py` to extend any skill.
- `npm run build` reports one bundle-size warning (`courses.json` pushes the
  main chunk to ~590KB) — not an error, just a Vite suggestion to
  code-split later.
