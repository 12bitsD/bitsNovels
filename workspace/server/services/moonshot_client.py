import json
import os
from collections.abc import AsyncIterator
from typing import Any, Optional

import httpx

from server.config import get_moonshot_base_url


class MoonshotError(RuntimeError):
    pass


def _api_key() -> str:
    # Per Kimi docs, use Authorization: Bearer $MOONSHOT_API_KEY
    key = os.getenv("MOONSHOT_API_KEY")
    if not key:
        raise MoonshotError("MOONSHOT_API_KEY is not configured")
    return key


def _headers() -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {_api_key()}",
    }


def _extract_error_message(payload: Any) -> str:
    if not isinstance(payload, dict):
        return "Moonshot request failed"
    err = payload.get("error")
    if isinstance(err, dict):
        message = err.get("message")
        if isinstance(message, str) and message.strip():
            return message
        err_type = err.get("type")
        if isinstance(err_type, str) and err_type.strip():
            return err_type
    return "Moonshot request failed"


async def chat_completion(
    *,
    model: str,
    messages: list[dict[str, str]],
    temperature: float,
    max_tokens: int,
) -> str:
    async with httpx.AsyncClient(base_url=get_moonshot_base_url(), timeout=60.0) as client:
        response = await client.post(
            "/chat/completions",
            headers=_headers(),
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
        )
        if response.status_code >= 400:
            try:
                payload = response.json()
            except Exception:
                payload = None
            raise MoonshotError(_extract_error_message(payload))
        payload = response.json()

    try:
        choices = payload["choices"]
        content = choices[0]["message"]["content"]
    except Exception as exc:  # pragma: no cover
        raise MoonshotError("Moonshot response shape unexpected") from exc

    if not isinstance(content, str):
        raise MoonshotError("Moonshot response content invalid")
    return content


async def stream_chat_completion(
    *,
    model: str,
    messages: list[dict[str, str]],
    temperature: float,
    max_tokens: int,
) -> AsyncIterator[str]:
    async with httpx.AsyncClient(base_url=get_moonshot_base_url(), timeout=None) as client:
        async with client.stream(
            "POST",
            "/chat/completions",
            headers=_headers(),
            json={
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
            },
        ) as response:
            if response.status_code >= 400:
                try:
                    payload = await response.json()
                except Exception:
                    payload = None
                raise MoonshotError(_extract_error_message(payload))

            async for line in response.aiter_lines():
                if not line:
                    continue
                if not line.startswith("data: "):
                    continue
                data = line[len("data: ") :].strip()
                if data == "[DONE]":
                    break
                try:
                    event = json.loads(data)
                except Exception:
                    continue

                # OpenAI compatible delta shape:
                # choices[0].delta.content
                delta: Optional[str] = None
                try:
                    choices = event.get("choices")
                    if isinstance(choices, list) and choices:
                        delta_obj = choices[0].get("delta")
                        if isinstance(delta_obj, dict):
                            content = delta_obj.get("content")
                            if isinstance(content, str):
                                delta = content
                except Exception:
                    delta = None

                if delta:
                    yield delta
