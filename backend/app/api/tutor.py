import httpx
from fastapi import APIRouter, Depends

from app.api.auth import get_current_user
from app.core.config import (
    ANTHROPIC_API_KEY,
    GROQ_API_KEY,
    OPENAI_API_KEY,
    resolve_tutor_model,
    resolve_tutor_provider,
)
from app.models.user import User
from app.schemas.tutor import TutorChatRequest, TutorChatResponse

router = APIRouter(prefix="/tutor", tags=["AI Tutor"])

SYSTEM_PROMPT = (
    "You are the AI tutor inside PathFinder, a personalized learning-path app. "
    "You help the learner understand concepts, unblock them on the course/video "
    "they're currently working through, and keep them motivated. Be concise "
    "(a few short paragraphs at most), concrete, and encouraging. If the learner "
    "asks something unrelated to their learning path, still help, but gently "
    "steer back to their goal when natural."
)


def _build_context_line(context) -> str:
    if not context:
        return ""
    parts = []
    if context.learning_path_title:
        parts.append(f"learning path: {context.learning_path_title}")
    if context.stage_title:
        parts.append(f"current stage: {context.stage_title}")
    if context.skill:
        parts.append(f"skill focus: {context.skill}")
    if not parts:
        return ""
    return "Context — " + "; ".join(parts) + "."


def _mock_reply(data: TutorChatRequest) -> str:
    ctx = _build_context_line(data.context)
    prefix = f"({ctx}) " if ctx else ""
    return (
        f"{prefix}I don't have a live AI connection configured right now "
        f"(no ANTHROPIC_API_KEY / GROQ_API_KEY / OPENAI_API_KEY set on the "
        f"backend), so here's a placeholder response instead of a real answer "
        f"to: \"{data.message.strip()}\". Set one of those environment "
        f"variables and restart the API to get real tutoring."
    )


async def _call_anthropic(data: TutorChatRequest, model: str) -> str:
    messages = [{"role": m.role, "content": m.text} for m in data.history]
    messages.append({"role": "user", "content": data.message})
    system = SYSTEM_PROMPT
    ctx = _build_context_line(data.context)
    if ctx:
        system += " " + ctx

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 600,
                "system": system,
                "messages": messages,
            },
        )
        resp.raise_for_status()
        payload = resp.json()
        return "".join(
            block.get("text", "") for block in payload.get("content", []) if block.get("type") == "text"
        ).strip()


async def _call_openai_compatible(data: TutorChatRequest, model: str, base_url: str, api_key: str) -> str:
    system = SYSTEM_PROMPT
    ctx = _build_context_line(data.context)
    if ctx:
        system += " " + ctx

    messages = [{"role": "system", "content": system}]
    for m in data.history:
        role = "assistant" if m.role == "assistant" else "user"
        messages.append({"role": role, "content": m.text})
    messages.append({"role": "user", "content": data.message})

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "messages": messages, "max_tokens": 600},
        )
        resp.raise_for_status()
        payload = resp.json()
        return payload["choices"][0]["message"]["content"].strip()


@router.post("/chat", response_model=TutorChatResponse)
async def tutor_chat(
    data: TutorChatRequest,
    current_user: User = Depends(get_current_user),
):
    provider = resolve_tutor_provider()

    if provider == "none":
        return TutorChatResponse(reply=_mock_reply(data), provider="none", mocked=True)

    model = resolve_tutor_model(provider)

    try:
        if provider == "anthropic":
            reply = await _call_anthropic(data, model)
        elif provider == "groq":
            reply = await _call_openai_compatible(
                data, model, "https://api.groq.com/openai/v1", GROQ_API_KEY,
            )
        else:  # openai
            reply = await _call_openai_compatible(
                data, model, "https://api.openai.com/v1", OPENAI_API_KEY,
            )
        return TutorChatResponse(reply=reply, provider=provider, mocked=False)
    except Exception as exc:  # noqa: BLE001 - surface a friendly fallback, never 500 the chat UI
        return TutorChatResponse(
            reply=(
                f"I hit an error reaching the {provider} API ({exc.__class__.__name__}). "
                f"Here's a placeholder answer instead: for \"{data.message.strip()}\", "
                f"try breaking it into smaller sub-questions and check the course/video "
                f"for this stage — I'll be back once the connection is fixed."
            ),
            provider=provider,
            mocked=True,
        )
