"""
Orchestrator: turns a profile + goal into a full personalized learning path.

Flow:
  1. Resolve a target skill from the chosen career path (if any) and/or the
     free-text goal (TF-IDF match via recommender.parse_goal).
  2. Walk backwards through the prerequisite DAG from the target skill to
     whatever the learner says they already know (shortest_learning_order).
  3. For every skill in that order, rank the best courses (recommender.
     recommend_courses) and expand the skill into its sub-topic curriculum
     (skill_graph.get_subtopics) -- the frontend fills each sub-topic with a
     real YouTube video client-side.
  4. Budget stages across the learner's available days/weeks and return a
     JSON-serializable structure that's persisted verbatim as the
     LearningPath.content JSONB blob.
"""
from __future__ import annotations

import re
import time
from dataclasses import dataclass

from app.ml.recommender import parse_goal, recommend_courses
from app.ml.skill_graph import SKILLS, CAREER_PATH_BY_ID, get_subtopics, shortest_learning_order

LEVEL_TO_STAGE = {"Beginner": 0, "Intermediate": 1, "Advanced": 2, "Expert": 2}
STAGE_ORDER = ["foundation", "core", "advanced"]

DOMAIN_COLOR = {
    "programming": "iris", "data_science": "sage", "web_dev": "amber",
    "cloud": "iris", "cybersecurity": "iris", "business": "amber",
    "design": "sage", "custom": "iris",
}
DOMAIN_ICON = {
    "programming": "Code2", "data_science": "BarChart3", "web_dev": "Atom",
    "cloud": "Cloud", "cybersecurity": "ShieldCheck", "business": "Compass",
    "design": "Palette", "custom": "Sparkles",
}


def _infer_known_skills(experience_level: str, domain_hint: str | None) -> list[str]:
    stage_idx = LEVEL_TO_STAGE.get(experience_level, 0)
    if stage_idx == 0 or not domain_hint:
        return []
    allowed = set(STAGE_ORDER[:stage_idx])
    return [sid for sid, node in SKILLS.items() if node.domain == domain_hint and node.level in allowed]


def _clean_topic_phrase(goal_text: str) -> str:
    filler = re.compile(
        r"\b(i want to|i wanna|learn|study|become a|get a|placement|for|the|please|help me)\b",
        re.IGNORECASE,
    )
    cleaned = re.sub(r"\s+", " ", filler.sub(" ", goal_text)).strip()
    phrase = cleaned or goal_text
    return " ".join(w[:1].upper() + w[1:] if w else w for w in phrase.split())


@dataclass
class GenerationParams:
    goal_text: str
    career_path: str | None
    experience_level: str = "Beginner"
    purpose: str = "personal growth"
    days_available: int | None = None
    free_only: bool = False
    known_skills: list[str] | None = None


def generate_path(params: GenerationParams) -> dict:
    known_skills = list(params.known_skills or [])
    career = CAREER_PATH_BY_ID.get(params.career_path) if params.career_path else None

    goal_skill_id: str | None = None
    match_confidence = 0.0

    if career and career.get("goal_skill"):
        goal_skill_id = career["goal_skill"]
        match_confidence = 1.0  # explicit choice, no ambiguity

    matches = parse_goal(params.goal_text) if params.goal_text else []

    if not goal_skill_id and matches:
        goal_skill_id, match_confidence = matches[0]

    difficulty = "Advanced" if params.experience_level == "Expert" else params.experience_level
    path_id_seed = f"gen_{int(time.time() * 1000)}"

    if not goal_skill_id:
        # Generic fallback -- no taxonomy overlap. Still build something real
        # instead of refusing: a 4-part basics->applied progression that the
        # frontend fills with YouTube search results directly.
        topic = _clean_topic_phrase(params.goal_text or (career["label"] if career else "your goal"))
        subtopics = [
            f"{topic} Basics", f"{topic} Core Concepts",
            f"{topic} Intermediate Concepts", f"{topic} Real-World Applications",
        ]
        weeks = max(1, (params.days_available or 28) // 7)
        stage = {
            "id": "custom", "index": 1, "title": topic,
            "description": f'A generic basics -> core -> intermediate -> applied progression for "{topic}".',
            "status": "active", "duration_weeks": weeks,
            "prerequisites": [],
            "why": f'"{topic}" isn\'t in our curated skill catalog yet, so this stage is built '
                   f"directly from YouTube search rather than our ranked course dataset.",
            "skill_id": "gen_custom",
            "subtopics": subtopics,
            "courses": [],
        }
        return {
            "title": f"{topic} — Personalized Path",
            "subtitle": (params.goal_text or topic)[:120],
            "domain": "custom",
            "difficulty": difficulty,
            "career_path": params.career_path,
            "match_confidence": 0.0,
            "color": DOMAIN_COLOR["custom"],
            "stages": [stage],
            "note": (
                f'No exact catalog match for "{params.goal_text}" — generated a generic '
                f"YouTube-based path instead of blocking. Try mentioning a closer domain "
                f"(Python, Java, web development, data science, cybersecurity...) for a "
                f"richer, course-backed path."
            ),
        }

    meta = SKILLS[goal_skill_id]
    domain = meta.domain
    inferred_known = _infer_known_skills(params.experience_level, domain)
    known_all = sorted(set(known_skills) | set(inferred_known))

    order = shortest_learning_order(known_all, goal_skill_id)
    if not order:
        order = [goal_skill_id]

    n = len(order)
    days_per_skill = max(1, (params.days_available or 0) // n) if params.days_available else None

    stages = []
    for i, sid in enumerate(order):
        smeta = SKILLS[sid]
        courses = recommend_courses(
            sid, level=params.experience_level, free_only=params.free_only, top_n=3,
        )
        subtopics = get_subtopics(sid, smeta.label)

        prereq_labels = [
            SKILLS[p].label for p in smeta.prereqs if p in order or p in known_all
        ]
        if sid == goal_skill_id:
            why = (
                f"This is your target skill for the "
                f"{career['label'] if career else meta.label} path"
                + (f", matched with {round(match_confidence * 100)}% confidence." if match_confidence else ".")
            )
        else:
            builds_on = f"it builds on {', '.join(prereq_labels)} and " if prereq_labels else ""
            why = (
                f"'{smeta.label}' is needed because {builds_on}"
                f"is a direct prerequisite on the path to your goal ('{meta.label}')."
            )

        weeks = max(1, -(-days_per_skill // 7)) if days_per_skill else 2

        stages.append({
            "id": sid,
            "index": i + 1,
            "title": smeta.label,
            "description": why,
            "status": "active" if i == 0 else "locked",
            "duration_weeks": weeks,
            "prerequisites": prereq_labels,
            "why": why,
            "skill_id": sid,
            "domain": smeta.domain,
            "subtopics": subtopics,
            "courses": courses,
        })

    total_weeks = sum(s["duration_weeks"] for s in stages)
    goal_lower = (params.purpose or "").lower()
    path_type = "career" if ("placement" in goal_lower or "job" in goal_lower) else (
        "beginner" if params.experience_level == "Beginner" else "skill"
    )

    return {
        "title": f"{meta.label} — Personalized Path",
        "subtitle": (params.goal_text or meta.label)[:120],
        "domain": domain,
        "type": path_type,
        "difficulty": difficulty,
        "career_path": params.career_path,
        "match_confidence": round(match_confidence, 4),
        "color": DOMAIN_COLOR.get(domain, "iris"),
        "duration_weeks": total_weeks,
        "stages": stages,
        "note": None,
        "_path_id_seed": path_id_seed,
    }
