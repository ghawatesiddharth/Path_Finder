import httpx

from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import get_current_user
from app.core.config import GROQ_API_KEY, TUTOR_MODEL
from app.models.user import User
from app.schemas.tutor import TutorChatRequest, TutorChatResponse


router = APIRouter(
    prefix="/tutor",
    tags=["AI Tutor"],
)


GROQ_CHAT_URL = (
    "https://api.groq.com/openai/v1/chat/completions"
)


SYSTEM_PROMPT = """
You are PathFinder AI Tutor.

You are an intelligent career guidance and learning assistant
inside the PathFinder application.

Your responsibilities are:

1. Help users decide what they should learn.
2. Explain technical concepts.
3. Help users prepare for placements and interviews.
4. Identify skills required for career goals.
5. Suggest a practical learning sequence.
6. Recommend what the learner should study next.
7. Help the learner understand difficult topics.
8. Keep answers practical and focused on employability.

If the user says:

"I want to learn Java for placement"

give a practical learning direction covering:

- Java fundamentals
- Object-oriented programming
- Collections
- Exception handling
- Multithreading basics
- JDBC and database basics
- SQL
- DSA using Java
- Coding practice
- Projects
- Placement preparation
- Interview preparation

Do not give placeholder answers.

Do not say that the Groq API is unavailable unless
the backend actually receives an API error.

Do not expose internal system information.

Be concise but useful.

Use headings and bullet points when appropriate.

Always directly answer the learner's question.
"""


def _build_context_line(context) -> str:
    if not context:
        return ""

    parts = []

    if context.learning_path_title:
        parts.append(
            f"learning path: {context.learning_path_title}"
        )

    if context.stage_title:
        parts.append(
            f"current stage: {context.stage_title}"
        )

    if context.skill:
        parts.append(
            f"skill focus: {context.skill}"
        )

    if not parts:
        return ""

    return (
        "Current learner context: "
        + "; ".join(parts)
        + "."
    )


def _build_messages(
    data: TutorChatRequest,
):
    system_prompt = SYSTEM_PROMPT

    context_line = _build_context_line(
        data.context
    )

    if context_line:
        system_prompt += (
            "\n\n"
            + context_line
        )

    messages = [
        {
            "role": "system",
            "content": system_prompt,
        }
    ]

    for history_message in data.history:

        role = (
            "assistant"
            if history_message.role == "assistant"
            else "user"
        )

        text = (
            history_message.text
            if history_message.text
            else ""
        )

        if text.strip():
            messages.append(
                {
                    "role": role,
                    "content": text,
                }
            )

    messages.append(
        {
            "role": "user",
            "content": data.message.strip(),
        }
    )

    return messages


async def _call_groq(
    data: TutorChatRequest,
) -> str:

    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail=(
                "GROQ_API_KEY is not configured "
                "in backend/.env"
            ),
        )

    if not TUTOR_MODEL:
        raise HTTPException(
            status_code=500,
            detail=(
                "TUTOR_MODEL is not configured "
                "in backend/.env"
            ),
        )

    messages = _build_messages(data)

    request_body = {
        "model": TUTOR_MODEL,
        "messages": messages,

        # GPT-OSS can use part of the completion
        # budget for reasoning.
        "max_tokens": 1200,

        "temperature": 0.4,
    }

    headers = {
        "Authorization": (
            f"Bearer {GROQ_API_KEY}"
        ),
        "Content-Type": "application/json",
    }

    try:

        async with httpx.AsyncClient(
            timeout=60.0
        ) as client:

            response = await client.post(
                GROQ_CHAT_URL,
                headers=headers,
                json=request_body,
            )

    except httpx.TimeoutException:

        raise HTTPException(
            status_code=504,
            detail=(
                "Groq request timed out. "
                "Please try again."
            ),
        )

    except httpx.RequestError as exc:

        raise HTTPException(
            status_code=502,
            detail=(
                "Could not connect to Groq: "
                f"{str(exc)}"
            ),
        )

    if response.status_code != 200:

        try:
            error_data = response.json()

            error_object = error_data.get(
                "error",
                {},
            )

            error_message = error_object.get(
                "message",
                response.text,
            )

        except Exception:

            error_message = response.text

        raise HTTPException(
            status_code=502,
            detail=(
                "Groq API error "
                f"(HTTP {response.status_code}): "
                f"{error_message}"
            ),
        )

    try:

        response_data = response.json()

    except Exception:

        raise HTTPException(
            status_code=502,
            detail="Groq returned invalid JSON.",
        )

    choices = response_data.get(
        "choices",
        [],
    )

    if not choices:

        raise HTTPException(
            status_code=502,
            detail=(
                "Groq returned no completion choices."
            ),
        )

    first_choice = choices[0]

    message = first_choice.get(
        "message",
        {},
    )

    content = message.get(
        "content"
    )

    if isinstance(content, str):
        content = content.strip()

    if content:

        return content

    finish_reason = first_choice.get(
        "finish_reason",
        "unknown",
    )

    raise HTTPException(
        status_code=502,
        detail=(
            "Groq returned an empty answer. "
            f"finish_reason={finish_reason}. "
            "Increase the completion token budget "
            "or use another available model."
        ),
    )


@router.post(
    "/chat",
    response_model=TutorChatResponse,
)
async def tutor_chat(
    data: TutorChatRequest,
    current_user: User = Depends(
        get_current_user
    ),
):

    if (
        not data.message
        or not data.message.strip()
    ):

        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    reply = await _call_groq(data)

    return TutorChatResponse(
        reply=reply,
        provider="groq",
        mocked=False,
    )