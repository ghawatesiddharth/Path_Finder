import os

from dotenv import load_dotenv

load_dotenv()

# --- AI Tutor LLM provider ---
# Supported: "anthropic" | "groq" | "openai" | "none"
# "none" (default when no key is set) makes the tutor endpoint fall back to a
# rule-based mock reply so the app still runs end-to-end without an API key.
TUTOR_PROVIDER = os.getenv("TUTOR_PROVIDER", "").strip().lower()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

TUTOR_MODEL = os.getenv("TUTOR_MODEL", "").strip()

DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-4-6",
    "groq": "llama-3.3-70b-versatile",
    "openai": "gpt-4o-mini",
}


def resolve_tutor_provider() -> str:
    if TUTOR_PROVIDER in ("anthropic", "groq", "openai"):
        return TUTOR_PROVIDER
    if ANTHROPIC_API_KEY:
        return "anthropic"
    if GROQ_API_KEY:
        return "groq"
    if OPENAI_API_KEY:
        return "openai"
    return "none"


def resolve_tutor_model(provider: str) -> str:
    return TUTOR_MODEL or DEFAULT_MODELS.get(provider, "")
