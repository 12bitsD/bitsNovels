import json
import os
from collections.abc import AsyncIterator
from typing import Any, Optional

import httpx

from server.config import get_mimo_base_url


class MimoError(RuntimeError):
    pass


def _api_key() -> str:
    key = os.getenv("MIMO_API_KEY")
    if not key:
        raise MimoError("MIMO_API_KEY is not configured")
    return key


def _headers() -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {_api_key()}",
    }


def _extract_error_message(payload: Any) -> str:
    if not isinstance(payload, dict):
        return "MiMo request failed"
    err = payload.get("error")
    if isinstance(err, dict):
        message = err.get("message")
        if isinstance(message, str) and message.strip():
            return message
        err_type = err.get("type")
        if isinstance(err_type, str) and err_type.strip():
            return err_type
    return "MiMo request failed"


def _extra_body() -> dict[str, Any]:
    # User-provided docs recommend disabling thinking by default.
    thinking = os.getenv("MIMO_THINKING", "disabled").strip().lower()
    return {
        "thinking": {"type": thinking},
    }


async def chat_completion(
    *,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float,
    max_tokens: int,
) -> str:
    async with httpx.AsyncClient(base_url=get_mimo_base_url(), timeout=60.0) as client:
        response = await client.post(
            "/chat/completions",
            headers=_headers(),
            json={
                "model": model,
                "messages": messages,
                # MiMo expects max_completion_tokens per docs
                "max_completion_tokens": max_tokens,
                "temperature": temperature,
                "top_p": float(os.getenv("MIMO_TOP_P", "0.95")),
                "frequency_penalty": float(os.getenv("MIMO_FREQUENCY_PENALTY", "0")),
                "presence_penalty": float(os.getenv("MIMO_PRESENCE_PENALTY", "0")),
                "stream": False,
                "stop": None,
                "extra_body": _extra_body(),
            },
        )
        if response.status_code >= 400:
            try:
                payload = response.json()
            except Exception:
                payload = None
            raise MimoError(_extract_error_message(payload))
        payload = response.json()

    try:
        choices = payload["choices"]
        content = choices[0]["message"]["content"]
    except Exception as exc:  # pragma: no cover
        raise MimoError("MiMo response shape unexpected") from exc

    if not isinstance(content, str):
        raise MimoError("MiMo response content invalid")
    return content


async def stream_chat_completion(
    *,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float,
    max_tokens: int,
) -> AsyncIterator[str]:
    async with httpx.AsyncClient(base_url=get_mimo_base_url(), timeout=None) as client:
        async with client.stream(
            "POST",
            "/chat/completions",
            headers=_headers(),
            json={
                "model": model,
                "messages": messages,
                "max_completion_tokens": max_tokens,
                "temperature": temperature,
                "top_p": float(os.getenv("MIMO_TOP_P", "0.95")),
                "frequency_penalty": float(os.getenv("MIMO_FREQUENCY_PENALTY", "0")),
                "presence_penalty": float(os.getenv("MIMO_PRESENCE_PENALTY", "0")),
                "stream": True,
                "extra_body": _extra_body(),
            },
        ) as response:
            if response.status_code >= 400:
                try:
                    payload = await response.json()
                except Exception:
                    payload = None
                raise MimoError(_extract_error_message(payload))

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

                delta: Optional[str] = None
                try:
                    choices = event.get("choices")
                    if isinstance(choices, list) and choices:
                        delta_obj = choices[0].get("delta")
                        if isinstance(delta_obj, dict):
                            # Stream only the user-visible content. MiMo may also emit
                            # `reasoning_content`; we intentionally ignore it.
                            content = delta_obj.get("content")
                            if isinstance(content, str) and content:
                                delta = content
                except Exception:
                    delta = None

                if delta:
                    yield delta
