"""
Content-based recommendation engine.

Two jobs:

1. parse_goal(text)      -- maps a learner's free-text goal (plus their
                             chosen career path / known skills) onto the
                             skill taxonomy using TF-IDF + cosine similarity
                             over the skill keyword corpus. This is the
                             "which skill are they actually asking for"
                             classifier.

2. recommend_courses(...)-- ranks the courses tagged with a given skill using
                             a weighted score over rating, popularity
                             (proxy for enrollments/views/likes), price, and
                             level match. This is the "which of the matching
                             courses is actually worth taking" ranker.

Both are cached at import time since the course catalog and skill corpus are
static for the lifetime of the process.
"""
from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass, asdict
from functools import lru_cache
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.ml.skill_graph import SKILLS

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "courses.json"

STOPWORDS = {
    "i", "want", "to", "a", "the", "for", "and", "of", "in", "on", "get", "become",
    "learn", "study", "my", "me", "is", "am", "be", "with", "an", "as", "at", "so",
    "that", "this", "it", "or", "from", "about", "wanna", "gonna", "please", "help",
}

_TOKEN_RE = re.compile(r"[^a-z0-9+#.]+")


def _tokenize(text: str) -> list[str]:
    return [t for t in _TOKEN_RE.split(text.lower()) if len(t) > 1 and t not in STOPWORDS]


@dataclass
class CourseRecord:
    title: str
    provider: str
    level: str
    rating: float | None
    popularity: int
    is_paid: bool
    price: float | None
    duration_hours: float | None
    url: str
    skills: list[str]

    def to_dict(self) -> dict:
        return asdict(self)


@lru_cache(maxsize=1)
def load_courses() -> list[CourseRecord]:
    with open(DATA_PATH, encoding="utf-8") as f:
        raw = json.load(f)
    return [CourseRecord(**c) for c in raw]


@lru_cache(maxsize=1)
def _skill_corpus() -> tuple[list[str], list[str]]:
    """Returns (skill_ids, documents) -- one 'document' per skill built from
    its label + keywords, used to fit the TF-IDF vectorizer."""
    ids, docs = [], []
    for sid, node in SKILLS.items():
        ids.append(sid)
        docs.append(" ".join([node.label] + node.keywords * 2))  # upweight keywords
    return ids, docs


@lru_cache(maxsize=1)
def _vectorizer_and_matrix():
    ids, docs = _skill_corpus()
    vectorizer = TfidfVectorizer(
        tokenizer=_tokenize,
        preprocessor=lambda x: x,
        token_pattern=None,
        lowercase=True,
    )
    matrix = vectorizer.fit_transform(docs)
    return vectorizer, matrix, ids


def parse_goal(goal_text: str, top_k: int = 3) -> list[tuple[str, float]]:
    """
    TF-IDF cosine-similarity goal -> skill matcher, with an exact
    keyword-phrase bonus layered on top so short/ambiguous goals (e.g. just
    "java") still resolve correctly even though TF-IDF alone is noisy on
    very short documents.
    """
    if not goal_text or not goal_text.strip():
        return []

    vectorizer, matrix, ids = _vectorizer_and_matrix()
    goal_vec = vectorizer.transform([goal_text])
    sims = cosine_similarity(goal_vec, matrix).flatten()

    goal_lower = f" {goal_text.lower()} "
    scored: list[tuple[str, float]] = []
    for idx, sid in enumerate(ids):
        node = SKILLS[sid]
        score = float(sims[idx]) * 2.0  # TF-IDF similarity, weighted

        for kw in node.keywords:
            kw_lower = kw.strip().lower()
            if not kw_lower:
                continue
            if re.match(r"^[a-z0-9+#. ]+$", kw_lower):
                pattern = r"\b" + re.escape(kw_lower) + r"\b"
                hit = re.search(pattern, goal_lower) is not None
            else:
                hit = kw_lower in goal_lower
            if hit:
                score += 1.0 + len(kw_lower.split()) * 0.25

        if score > 0:
            scored.append((sid, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    if not scored:
        return []
    max_score = scored[0][1] or 1.0
    return [(sid, min(1.0, s / max_score)) for sid, s in scored[:top_k]]


def _normalize(value: float, lo: float, hi: float) -> float:
    if hi <= lo:
        return 0.0
    return max(0.0, min(1.0, (value - lo) / (hi - lo)))


def score_course(course: CourseRecord, *, level: str | None, free_only: bool,
                  max_popularity: float) -> float:
    """
    Weighted multi-factor score combining:
      - rating          (quality signal, 0-5 scale)
      - popularity       (proxy for enrollments / views / likes)
      - price            (cheaper / free scores higher, only matters if not free_only)
      - level match       (exact learner-level match is rewarded)
    Weights sum to 1.0 so the final score is comparable across courses.
    """
    rating_norm = _normalize(course.rating or 0.0, 0.0, 5.0)
    pop_norm = _normalize(math.log1p(course.popularity or 0), 0.0, math.log1p(max_popularity or 1))

    if course.is_paid and course.price:
        price_norm = 1.0 - _normalize(course.price, 0.0, 250.0)
    else:
        price_norm = 1.0  # free courses score best on the price axis

    if level and level != "All Levels":
        level_norm = 1.0 if course.level == level else (0.5 if course.level == "All Levels" else 0.2)
    else:
        level_norm = 0.7

    weights = {"rating": 0.4, "popularity": 0.3, "price": 0.15, "level": 0.15}
    return (
        weights["rating"] * rating_norm
        + weights["popularity"] * pop_norm
        + weights["price"] * price_norm
        + weights["level"] * level_norm
    )


def recommend_courses(skill_id: str, *, level: str | None = None,
                       free_only: bool = False, top_n: int = 4) -> list[dict]:
    courses = load_courses()
    pool = [c for c in courses if skill_id in c.skills]

    def apply_filters(lst: list[CourseRecord]) -> list[CourseRecord]:
        out = lst
        if free_only:
            out = [c for c in out if not c.is_paid]
        if level and level != "All Levels":
            out = [c for c in out if c.level == level or c.level == "All Levels"]
        return out

    filtered = apply_filters(pool)
    if not filtered:
        filtered = [c for c in pool if not c.is_paid] if free_only else pool
    if not filtered:
        return []

    max_pop = max((c.popularity or 0) for c in filtered) or 1

    scored = [
        (c, score_course(c, level=level, free_only=free_only, max_popularity=max_pop))
        for c in filtered
    ]
    scored.sort(key=lambda x: x[1], reverse=True)

    results = []
    for course, s in scored[:top_n]:
        d = course.to_dict()
        d["match_score"] = round(s, 4)
        results.append(d)
    return results


def catalog_stats() -> dict:
    courses = load_courses()
    providers = sorted({c.provider for c in courses})
    return {
        "total_courses": len(courses),
        "providers": providers,
        "total_skills_tagged": len({s for c in courses for s in c.skills}),
    }
