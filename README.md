# PathFinder — with the real recommender model wired in

This is your PathFinder UI with the LearnPath AI recommendation model (goal
matching, skill-prerequisite graph, real Coursera/Udemy course data, YouTube
integration) ported from Python into TypeScript and wired directly into the
existing pages — not a separate app bolted on the side.

## What changed vs. the original UI

**New files (the ported model):**
- `src/lib/skillGraph.ts` — 28-skill taxonomy + prerequisite DAG + sub-topic
  breakdowns per skill. **Java is now a full 24-topic curriculum** (JDK setup
  through JDBC, multithreading, Streams API, JUnit) instead of the old 6-video
  version — same fix applies to DSA, Python, JS, ML, etc.
- `src/lib/recommender.ts` — goal-text → skill matcher (keyword/token overlap
  scoring, a lightweight browser port of the Python TF-IDF matcher) + course
  ranking. Reads `src/data/courses.json` — your actual coursea_data.csv /
  udemy_course_data.csv, cleaned, tagged, and bundled (1,349 courses).
- `src/lib/youtube.ts` — YouTube Data API v3 client: single-playlist mode,
  same-channel mode, and mixed mode, with mock fallback (placeholder banners)
  when no API key is set so the app still runs for a demo.
- `src/lib/pathGenerator.ts` — orchestrator: goal → matched skill → ancestor
  prerequisites (topologically sorted) → day-budgeted stages → per-stage task
  checklist (course + one video per sub-topic + project).

**Zero dummy data (this revision):**
- `src/data.ts` no longer ships a fake persona ("Maya", a hardcoded streak,
  fabricated skill percentages, canned courses). It now only exports UI
  taxonomy (filter chip labels/icons, derived live from the real skill graph)
  and an `emptyUser` starting profile — everything else starts empty and is
  populated only by what you actually generate.
- Skills, courses, and paths in the store all start as `[]`. The chat's
  canned replies were rewritten to only state things that are actually true
  of the current app state (no more fake "I re-ranked your path" that didn't
  do anything).
- Topic/domain filter chips on the Courses and Path pages are now derived
  live from whatever you've actually generated, not a static list tied to a
  persona's skillset.

**Homepage is now the path builder:**
- The "Build your learning path" filter section (goal, day constraint,
  experience level, purpose, free-only toggle, video-source filter, YouTube
  key) now lives on **Home** (`DashboardPage.tsx`) as the primary, top-level
  section — not buried in Profile. It's in `src/components/PathBuilderForm.tsx`
  so it's shared/reusable. Once a path exists, the form collapses to a
  "+ Build another path" toggle and Home shows real progress instead.
- `ProfilePage.tsx` no longer duplicates the generator — it's just Basics +
  real generated skills + real completed courses now, each with an honest
  empty state when there's nothing yet.

**Chat is now a floating window, not a docked sidebar:**
- `src/components/ChatPanel.tsx` is a rewrite: it's `position: fixed`,
  **draggable** by its header (grab the grip icon), **resizable** from the
  bottom-right corner handle, and has three states — open (full panel),
  **minimized** (collapses to a slim draggable header bar, distinct from
  closing), and closed (floating launcher bubble bottom-right). It stays
  mounted across route changes so position/size don't reset when you
  navigate.
- `src/components/AppShell.tsx` no longer reserves a docked column for chat —
  main content is full-width and the chat floats on top.

**Modified existing files (additive, nothing removed):**
- `src/types.ts` — added `PathTask`, `GenerationParams`, `ResourceMode`;
  extended `PathStage` with optional `tasks`/`dayRange` fields.
- `src/store.tsx` — `generateFromProfile()`, task-completion tracking, a
  persisted YouTube API key, `chatMinimized` state, and "I want to learn X"
  intent detection in chat that triggers real path generation.
- `src/pages/PathPage.tsx` — stages with real tasks render a checklist with
  video thumbnails and live progress; proper empty states when there's no
  path yet, both in "browse" and "active" views.
- `src/pages/CoursesPage.tsx` / `src/pages/AssessmentPage.tsx` — honest empty
  states instead of always showing (now-removed) mock content.

## Run it

```bash
npm install
npm run dev
```

Then either:
- Go to **Home** → fill in the "Build your learning path" card → click
  Generate, or
- Type "I want to learn Java for placement" (or any goal) into the chat —
  it detects the intent and generates the path directly.

Paste a YouTube Data API v3 key into the form's key field (or the chat will
use mock results) — get one free at
https://console.cloud.google.com/apis/library/youtube.googleapis.com.
**Playlist and same-channel modes need a real key** to actually pull real
data; without one they fall back to mixed mock results (flagged in the UI).

## Known scope limits (for your report/viva)

- The Java sub-topic list is deliberately exhaustive; a few other skills
  (Python, DSA, JS, ML) are expanded but not to the same depth — the pattern
  in `SUBTOPICS` in `skillGraph.ts` is easy to extend for any other skill.
- Goal matching is a lightweight keyword/token overlap scorer, not real
  TF-IDF/embeddings (no ML library available client-side) — good enough for
  demo purposes, but a fuzzier LLM-based matcher (e.g. your Groq setup from
  the chatbot project) would be a natural upgrade for the chat's Q&A.
- Streak tracking and Assessments were never wired to real logic in either
  version of this app — rather than fake them, Assessments now shows an
  honest empty state and the streak badge was removed in favor of real
  task-completion percentage.
- `npm run build` reports one bundle-size warning (courses.json pushes the
  main chunk to ~590KB) — not an error, just a Vite suggestion to code-split
  if you want to optimize load time later.
