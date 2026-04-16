from __future__ import annotations

import asyncio
import difflib
import json
from collections.abc import AsyncIterator
from typing import Any, Optional, cast

from server.config import get_ai_system_defaults, get_llm_provider
from server.models.ai_models import (
    AIContextBlock,
    AIDiffChange,
    AIDiffPayload,
    AINamesPayload,
    AIProjectConfig,
    AIResult,
    AIResultStatus,
    AISuggestionsPayload,
    AITaskResponse,
    AITaskType,
    AITextPayload,
)
from server.services._base import _iso_z, _main_module, app
from server.services.mimo_client import (
    MimoError,
)
from server.services.mimo_client import (
    chat_completion as mimo_chat_completion,
)
from server.services.mimo_client import (
    stream_chat_completion as mimo_stream_chat_completion,
)
from server.services.moonshot_client import (
    MoonshotError,
    chat_completion,
    stream_chat_completion,
)

TEXT_TASK_TYPES = {"continue", "dialogue", "parse"}
DIFF_TASK_TYPES = {"polish", "expand", "summarize"}
SUGGESTION_TASK_TYPES = {"outline", "advice"}


def ensure_ai_state() -> None:
    if not hasattr(app.state, "ai_system_defaults"):
        app.state.ai_system_defaults = dict(get_ai_system_defaults())
    if not hasattr(app.state, "ai_user_defaults"):
        app.state.ai_user_defaults = {}
    if not hasattr(app.state, "ai_project_configs"):
        app.state.ai_project_configs = {}
    if not hasattr(app.state, "ai_tasks"):
        app.state.ai_tasks = {}
    if not hasattr(app.state, "ai_task_counter"):
        app.state.ai_task_counter = 0
    if not hasattr(app.state, "ai_stream_queues"):
        app.state.ai_stream_queues = {}
    if not hasattr(app.state, "ai_runner_tasks"):
        app.state.ai_runner_tasks = {}


async def _llm_chat_completion(
    *,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float,
    max_tokens: int,
) -> str:
    provider = get_llm_provider()
    if provider == "mimo":
        return await mimo_chat_completion(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
    return await chat_completion(
        model=model,
        messages=cast(list[dict[str, str]], messages),
        temperature=temperature,
        max_tokens=max_tokens,
    )


async def _llm_stream_chat_completion(
    *,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float,
    max_tokens: int,
) -> AsyncIterator[str]:
    provider = get_llm_provider()
    if provider == "mimo":
        async for chunk in mimo_stream_chat_completion(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        ):
            yield chunk
        return
    async for chunk in stream_chat_completion(
        model=model,
        messages=cast(list[dict[str, str]], messages),
        temperature=temperature,
        max_tokens=max_tokens,
    ):
        yield chunk


def _now_iso() -> str:
    return _iso_z(_main_module()._now())


def _estimate_tokens(text: str) -> int:
    if not text:
        return 0
    return max(1, (len(text) + 3) // 4)


def _preview(text: str, limit: int = 60) -> str:
    compact = " ".join(text.split())
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit]}..."


def _next_task_id() -> str:
    ensure_ai_state()
    app.state.ai_task_counter = cast(int, app.state.ai_task_counter) + 1
    return f"ai-task-{app.state.ai_task_counter}"


def _get_project_config_record(project_id: str) -> dict[str, Any]:
    ensure_ai_state()
    stored = cast(dict[str, Any], app.state.ai_project_configs.get(project_id, {}))
    return {
        "projectId": project_id,
        "model": stored.get("model"),
        "temperature": stored.get("temperature"),
        "maxLength": stored.get("maxLength"),
        "parseDepth": stored.get("parseDepth"),
        "useGlobalAsDefault": bool(stored.get("useGlobalAsDefault", True)),
        "updatedAt": cast(str, stored.get("updatedAt", _now_iso())),
    }


def get_project_ai_config(project_id: str) -> dict[str, Any]:
    return AIProjectConfig(**_get_project_config_record(project_id)).model_dump()


def get_effective_ai_config(
    project_id: str,
    user_id: str,
) -> tuple[dict[str, Any], dict[str, str], dict[str, Any]]:
    ensure_ai_state()
    project_config = _get_project_config_record(project_id)
    user_defaults = cast(
        dict[str, Any],
        cast(dict[str, Any], app.state.ai_user_defaults).get(user_id, {}),
    )
    system_defaults = cast(dict[str, Any], app.state.ai_system_defaults)

    effective: dict[str, Any] = {}
    sources: dict[str, str] = {}
    for field in ("model", "temperature", "maxLength", "parseDepth"):
        project_value = project_config.get(field)
        user_value = user_defaults.get(field)
        if project_value is not None:
            effective[field] = project_value
            sources[field] = "project"
        elif user_value is not None:
            effective[field] = user_value
            sources[field] = "global"
        else:
            effective[field] = system_defaults[field]
            sources[field] = "system"
    return project_config, effective, sources


def update_project_ai_config(
    project_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    ensure_ai_state()
    existing = _get_project_config_record(project_id)
    updated = {
        **existing,
        "updatedAt": _now_iso(),
    }
    for field in ("model", "temperature", "maxLength", "parseDepth"):
        if field in payload:
            updated[field] = payload[field]
    if "useGlobalAsDefault" in payload:
        updated["useGlobalAsDefault"] = bool(payload["useGlobalAsDefault"])
    cast(dict[str, Any], app.state.ai_project_configs)[project_id] = updated
    return AIProjectConfig(**updated).model_dump()


def build_ai_config_response(project_id: str, user_id: str) -> dict[str, Any]:
    project_config, effective, sources = get_effective_ai_config(project_id, user_id)
    user_defaults = cast(
        dict[str, Any],
        cast(dict[str, Any], app.state.ai_user_defaults).get(user_id, {}),
    )
    system_defaults = cast(dict[str, Any], app.state.ai_system_defaults)
    resolved_config: dict[str, dict[str, Any]] = {}
    for field in ("model", "temperature", "maxLength", "parseDepth"):
        project_value = project_config.get(field)
        global_value = user_defaults.get(field)
        system_value = system_defaults.get(field)

        if project_value is not None:
            resolved: dict[str, Any] = {
                "value": project_value,
                "source": "project",
            }
            if global_value is not None:
                resolved["fallbackValue"] = global_value
                resolved["fallbackSource"] = "global"
            else:
                resolved["fallbackValue"] = system_value
                resolved["fallbackSource"] = "system"
        elif global_value is not None:
            resolved = {
                "value": global_value,
                "source": "global",
                "fallbackValue": system_value,
                "fallbackSource": "system",
            }
        else:
            resolved = {
                "value": system_value,
                "source": "system",
            }
        resolved_config[field] = resolved

    return {
        "projectConfig": AIProjectConfig(**project_config).model_dump(),
        "resolvedConfig": resolved_config,
        # Backward-compatible fields for existing tests / callers.
        "config": AIProjectConfig(**project_config).model_dump(),
        "effectiveConfig": effective,
        "sources": sources,
    }


def _chapter_content(chapter_id: Optional[str]) -> str:
    if chapter_id is None:
        return ""
    chapter_state = cast(dict[str, Any], getattr(app.state, "chapter_contents", {})).get(
        chapter_id, {}
    )
    content = chapter_state.get("content")
    if isinstance(content, str):
        return content
    chapter = next(
        (c for c in app.state.fake_db.chapters if c["id"] == chapter_id),
        None,
    )
    if chapter is None:
        return ""
    chars = int(chapter.get("chars", 0))
    if chars <= 0:
        return ""
    return f"{chapter.get('title', '当前章节')}正文" * max(1, chars // 8)


def _ordered_project_chapters(project_id: str) -> list[dict[str, Any]]:
    return sorted(
        [
            chapter
            for chapter in app.state.fake_db.chapters
            if chapter["projectId"] == project_id
        ],
        key=lambda item: int(item.get("order", 0)),
    )


def _previous_chapter_tail(project_id: str, chapter_id: Optional[str]) -> str:
    if chapter_id is None:
        return ""
    ordered = _ordered_project_chapters(project_id)
    current_index = next(
        (index for index, chapter in enumerate(ordered) if chapter["id"] == chapter_id),
        None,
    )
    if current_index in {None, 0}:
        return ""
    previous = ordered[cast(int, current_index) - 1]
    content = _chapter_content(cast(Optional[str], previous.get("id")))
    if len(content) <= 2000:
        return content
    return content[-2000:]


def _truncate_around_cursor(text: str, cursor_offset: Optional[int], token_limit: int) -> str:
    if token_limit <= 0:
        return ""
    char_limit = max(16, token_limit * 4)
    if len(text) <= char_limit:
        return text
    if cursor_offset is None:
        return text[:char_limit]
    start = max(0, min(len(text) - char_limit, cursor_offset - char_limit // 2))
    end = min(len(text), start + char_limit)
    return text[start:end]


def _kb_context_entries(project_id: str) -> list[tuple[str, int, str]]:
    blocks: list[tuple[str, int, str]] = []
    for entity in cast(dict[str, Any], getattr(app.state, "kb_characters", {})).values():
        if entity.get("projectId") == project_id:
            name = cast(str, entity.get("name", "未命名角色"))
            summary = cast(str, entity.get("summary", ""))
            blocks.append((f"kb:character:{name}", 80, f"角色 {name}：{summary}"))
    for entity in cast(dict[str, Any], getattr(app.state, "kb_settings", {})).values():
        if entity.get("projectId") == project_id:
            title = cast(str, entity.get("title", "世界观"))
            content = cast(str, entity.get("content", ""))
            blocks.append((f"kb:setting:{title}", 75, f"设定 {title}：{content}"))
    return blocks


def assemble_context_blocks(
    project_id: str,
    task_type: AITaskType,
    chapter_id: Optional[str],
    selection_text: Optional[str],
    cursor_offset: Optional[int],
    config_snapshot: dict[str, Any],
    parameters: dict[str, Any],
) -> list[dict[str, Any]]:
    raw_blocks: list[dict[str, Any]] = []

    def add_block(source: str, priority: int, required: bool, content: str) -> None:
        raw_blocks.append(
            {
                "source": source,
                "priority": priority,
                "required": required,
                "content": content,
                "estimatedTokens": _estimate_tokens(content),
                "included": False,
                "preview": _preview(content),
            }
        )

    add_block("system_instruction", 100, True, "你是审慎、稳定、契约优先的小说写作 AI 助手。")
    add_block("task_instruction", 99, True, f"当前任务类型：{task_type}")
    add_block("ai_config", 98, True, str(config_snapshot))

    chapter_text = _chapter_content(chapter_id)
    if selection_text:
        add_block("selection", 97, task_type in DIFF_TASK_TYPES, selection_text)
    if chapter_text:
        add_block("current_chapter", 95, False, chapter_text)
    if task_type in {"continue", "dialogue"}:
        for source, priority, content in _kb_context_entries(project_id):
            add_block(source, priority, False, content)
        previous_tail = _previous_chapter_tail(project_id, chapter_id)
        if previous_tail:
            add_block("previous_chapter_tail", 30, False, previous_tail)

    budget = parameters.get("contextTokenLimit")
    if not isinstance(budget, int) or budget <= 0:
        max_length = parameters.get("maxLength")
        if not isinstance(max_length, int) or max_length <= 0:
            system_defaults = cast(dict[str, Any], app.state.ai_system_defaults)
            max_length = int(config_snapshot.get("maxLength", system_defaults.get("maxLength", 1200)))
        budget = max(240, min(800, max_length))

    remaining = budget
    for block in raw_blocks:
        if not block["required"]:
            continue
        if block["estimatedTokens"] > remaining and block["source"] == "selection":
            block["content"] = _truncate_around_cursor(block["content"], None, remaining)
            block["estimatedTokens"] = _estimate_tokens(block["content"])
            block["preview"] = _preview(block["content"])
        block["included"] = bool(block["content"]) and block["estimatedTokens"] <= remaining
        if block["included"]:
            remaining -= block["estimatedTokens"]

    remaining = max(0, remaining)
    current_block = next(
        (block for block in raw_blocks if block["source"] == "current_chapter"),
        None,
    )
    kb_blocks = [block for block in raw_blocks if block["source"].startswith("kb:")]
    previous_tail_block = next(
        (block for block in raw_blocks if block["source"] == "previous_chapter_tail"),
        None,
    )

    if current_block is not None and not current_block["included"] and remaining > 0:
        reserve_for_kb = min(80, remaining // 3) if kb_blocks else 0
        reserve_for_previous = min(40, remaining // 6) if previous_tail_block else 0
        current_budget = max(1, remaining - reserve_for_kb - reserve_for_previous)
        if current_block["estimatedTokens"] > current_budget:
            current_block["content"] = _truncate_around_cursor(
                cast(str, current_block["content"]), cursor_offset, current_budget
            )
            current_block["estimatedTokens"] = _estimate_tokens(
                cast(str, current_block["content"])
            )
            current_block["preview"] = _preview(cast(str, current_block["content"]))
        if current_block["estimatedTokens"] <= remaining:
            current_block["included"] = True
            remaining -= current_block["estimatedTokens"]

    for block in raw_blocks:
        if block["required"] or block["included"]:
            continue
        if block["estimatedTokens"] <= remaining:
            block["included"] = True
            remaining -= block["estimatedTokens"]

    return [
        {
            "source": cast(str, block["source"]),
            "priority": cast(int, block["priority"]),
            "estimatedTokens": cast(int, block["estimatedTokens"]),
            "required": cast(bool, block["required"]),
            "included": cast(bool, block["included"]),
            "preview": cast(str, block["preview"]),
        }
        for block in raw_blocks
    ]


def _simple_diff(original: str, revised: str) -> list[AIDiffChange]:
    changes: list[AIDiffChange] = []
    matcher = difflib.SequenceMatcher(a=original, b=revised)
    for opcode, a0, a1, b0, b1 in matcher.get_opcodes():
        if opcode in {"replace", "delete"} and a0 != a1:
            changes.append(AIDiffChange(type="delete", content=original[a0:a1]))
        if opcode in {"replace", "insert"} and b0 != b1:
            changes.append(AIDiffChange(type="insert", content=revised[b0:b1]))
    return changes


def _target_length(parameters: dict[str, Any], config_snapshot: dict[str, Any]) -> int:
    raw = parameters.get("maxLength")
    if isinstance(raw, int) and raw > 0:
        return raw
    fallback = config_snapshot.get("maxLength")
    if isinstance(fallback, int) and fallback > 0:
        return fallback
    system_defaults = cast(dict[str, Any], app.state.ai_system_defaults)
    return int(system_defaults.get("maxLength", 1200))


def _safe_json_loads(text: str) -> Optional[Any]:
    try:
        return json.loads(text)
    except Exception:
        return None


def _chunk_text(text: str, chunk_size: int = 24) -> list[str]:
    if not text:
        return []
    if chunk_size <= 0:
        return [text]
    return [text[index : index + chunk_size] for index in range(0, len(text), chunk_size)]


def _strip_list_marker(value: str) -> str:
    stripped = value.strip().lstrip("-*").strip()
    if not stripped:
        return ""
    prefix_end = 0
    while prefix_end < len(stripped) and (
        stripped[prefix_end].isdigit() or stripped[prefix_end] in {".", ")", "、"}
    ):
        prefix_end += 1
    normalized = stripped[prefix_end:].strip() if prefix_end > 0 else stripped
    return normalized.strip().strip('"').strip("'")


def _extract_list_items(text: str, limit: int) -> list[str]:
    if not text.strip():
        return []
    raw_lines = [
        _strip_list_marker(line)
        for line in text.replace("\r", "\n").split("\n")
    ]
    items = [line for line in raw_lines if line]
    if not items:
        candidates = [
            _strip_list_marker(part)
            for part in text.replace("，", ",").replace("、", ",").split(",")
        ]
        items = [candidate for candidate in candidates if candidate]

    deduped: list[str] = []
    for item in items:
        if item not in deduped:
            deduped.append(item)
        if len(deduped) >= limit:
            break
    return deduped


def _coerce_nonempty_text(value: str, fallback: str) -> str:
    candidate = value.strip()
    return candidate if candidate else fallback


def _build_task_result(
    task_id: str,
    task_type: AITaskType,
    created_at: str,
    selection_text: Optional[str],
    parameters: dict[str, Any],
    chapter_id: Optional[str],
    config_snapshot: dict[str, Any],
) -> tuple[dict[str, Any], list[str]]:
    # This helper is only used for non-streaming tasks. Streaming text tasks are
    # generated by the background runner and saved into task["result"].
    if task_type in TEXT_TASK_TYPES:
        result = AIResult(
            taskId=task_id,
            type=task_type,
            status="failed",
            payloadType="text",
            payload=AITextPayload(content=""),
            error="Text tasks are generated via stream runner",
            createdAt=created_at,
        )
        return result.model_dump(), []

    if task_type in DIFF_TASK_TYPES:
        original = selection_text or ""
        revised = original
        result = AIResult(
            taskId=task_id,
            type=task_type,
            status="done",
            payloadType="diff",
            payload=AIDiffPayload(diff=_simple_diff(original, revised), revisedText=revised),
            createdAt=created_at,
        )
        return result.model_dump(), []

    if task_type in SUGGESTION_TASK_TYPES:
        suggestions = (
            [
                "补强当前章节的情绪递进。",
                "让冲突转折更具体。",
                "收束结尾钩子，便于下一章承接。",
            ]
            if task_type == "outline"
            else [
                "节奏：前两段铺垫稍长，可提前抛出冲突。",
                "人物：主角动机可以更明确。",
                "描写：环境描写可再压缩。",
                "情节：结尾埋钩可再加强。",
            ]
        )
        result = AIResult(
            taskId=task_id,
            type=task_type,
            status="done",
            payloadType="suggestions",
            payload=AISuggestionsPayload(suggestions=suggestions),
            createdAt=created_at,
        )
        return result.model_dump(), []

    names = [
        "沈砚",
        "陆沉",
        "顾昭",
        "闻川",
        "谢临",
        "程越",
        "裴青",
        "周叙",
        "苏衡",
        "秦昼",
    ]
    result = AIResult(
        taskId=task_id,
        type=task_type,
        status="done",
        payloadType="names",
        payload=AINamesPayload(names=names),
        createdAt=created_at,
    )
    return result.model_dump(), []


def _task_response_payload(task: dict[str, Any]) -> dict[str, Any]:
    status = cast(AIResultStatus, task["status"])
    return AITaskResponse(
        id=cast(str, task["id"]),
        projectId=cast(str, task["projectId"]),
        type=cast(AITaskType, task["type"]),
        status=status,
        chapterId=cast(Optional[str], task.get("chapterId")),
        configSnapshot=cast(dict[str, Any], task["configSnapshot"]),
        contextBlocks=[
            AIContextBlock(**block)
            for block in cast(list[dict[str, Any]], task["contextBlocks"])
        ],
        createdAt=cast(str, task["createdAt"]),
        updatedAt=cast(str, task["updatedAt"]),
    ).model_dump()


def create_ai_task(
    project_id: str,
    user_id: str,
    task_type: AITaskType,
    chapter_id: Optional[str],
    selection_text: Optional[str],
    cursor_offset: Optional[int],
    parameters: dict[str, Any],
) -> dict[str, Any]:
    ensure_ai_state()
    _, effective_config, _ = get_effective_ai_config(project_id, user_id)
    created_at = _now_iso()
    task_id = _next_task_id()
    context_blocks = assemble_context_blocks(
        project_id,
        task_type,
        chapter_id,
        selection_text,
        cursor_offset,
        effective_config,
        parameters,
    )
    status: AIResultStatus = "generating"
    task = {
        "id": task_id,
        "projectId": project_id,
        "userId": user_id,
        "type": task_type,
        "status": status,
        "chapterId": chapter_id,
        "selectionText": selection_text,
        "parameters": parameters,
        "configSnapshot": effective_config,
        "contextBlocks": context_blocks,
        "createdAt": created_at,
        "updatedAt": created_at,
        "result": None,
        "partialText": "",
        "stopRequested": False,
    }
    cast(dict[str, Any], app.state.ai_tasks)[task_id] = task
    return _task_response_payload(task)


def get_ai_task(task_id: str) -> Optional[dict[str, Any]]:
    ensure_ai_state()
    task = cast(Optional[dict[str, Any]], cast(dict[str, Any], app.state.ai_tasks).get(task_id))
    if task is None:
        return None
    return task


def stop_ai_task(task_id: str) -> Optional[dict[str, Any]]:
    task = get_ai_task(task_id)
    if task is None:
        return None
    if task["status"] == "stopped" and task.get("result") is not None:
        return {
            "task": _task_response_payload(task),
            "result": task["result"],
        }
    task["stopRequested"] = True
    partial_content = cast(str, task.get("partialText", ""))

    result = AIResult(
        taskId=cast(str, task["id"]),
        type=cast(AITaskType, task["type"]),
        status="stopped",
        payloadType="text",
        payload=AITextPayload(content=partial_content),
        createdAt=cast(str, task["createdAt"]),
    ).model_dump()

    task["status"] = "stopped"
    task["updatedAt"] = _now_iso()
    task["result"] = result

    # Cancel background runner if present.
    ensure_ai_state()
    runner = cast(dict[str, Any], app.state.ai_runner_tasks).get(task_id)
    if runner is not None:
        try:
            cast(asyncio.Task[object], runner).cancel()
        except Exception:
            pass

    queue = cast(dict[str, Any], app.state.ai_stream_queues).get(task_id)
    if queue is not None:
        try:
            cast(asyncio.Queue[object], queue).put_nowait({"type": "task.stopped", "taskId": task_id, "result": result})
            cast(asyncio.Queue[object], queue).put_nowait(None)
        except Exception:
            pass

    return {"task": _task_response_payload(task), "result": result}


def _build_messages_for_task(task: dict[str, Any]) -> list[dict[str, str]]:
    task_type = cast(AITaskType, task["type"])
    selection_text = cast(Optional[str], task.get("selectionText"))
    parameters = cast(dict[str, Any], task.get("parameters", {}))
    context_blocks = cast(list[dict[str, Any]], task.get("contextBlocks", []))

    context_text = "\n\n".join(
        f"[{block.get('source')}|p{block.get('priority')}] {block.get('content','')}"
        for block in context_blocks
        if block.get("included")
    )
    if task_type == "continue":
        instruction = "请基于上下文续写小说正文，保持原有叙事风格与人称，不要解释过程。只输出正文。"
    elif task_type == "dialogue":
        character = parameters.get("characterName") or "角色"
        scene = parameters.get("scene") or ""
        instruction = (
            f"请生成一段对话，主说话人是“{character}”。"
            f"{' 场景：' + str(scene) if scene else ''}"
            "不要解释过程。只输出对话正文。"
        )
    elif task_type in {"polish", "expand", "summarize"}:
        if task_type == "polish":
            instruction = "请润色下面的选中文本，使语序更自然、措辞更凝练，含义不变。只输出修改后的全文。"
        elif task_type == "expand":
            instruction = "请扩写下面的选中文本，补充动作、环境与心理描写，保持风格一致。只输出修改后的全文。"
        else:
            instruction = "请将下面的选中文本压缩为更短版本，保留关键信息与风格。只输出修改后的全文。"
    elif task_type == "outline":
        instruction = "请给出3-6条改进建议（每条一行）。不要解释过程。"
    elif task_type == "advice":
        instruction = "请给出3-6条具体写作建议（每条一行）。不要解释过程。"
    elif task_type == "name_gen":
        instruction = "请生成10个适合该风格的中文人名，每行一个。不要解释过程。"
    else:
        instruction = "请基于上下文完成任务。不要解释过程。"

    user_payload = "\n\n".join(
        part
        for part in [
            f"任务：{task_type}",
            f"指令：{instruction}",
            f"上下文：\n{context_text}" if context_text else "",
            f"选中文本：\n{selection_text}" if selection_text else "",
        ]
        if part
    )

    return [
        {"role": "system", "content": "你是一个严谨的小说写作助手。"},
        {"role": "user", "content": user_payload},
    ]


def _build_messages_for_task_mimo(task: dict[str, Any]) -> list[dict[str, Any]]:
    task_type = cast(AITaskType, task["type"])
    selection_text = cast(Optional[str], task.get("selectionText")) or ""
    parameters = cast(dict[str, Any], task.get("parameters", {}))
    context_blocks = cast(list[dict[str, Any]], task.get("contextBlocks", []))

    context_text = "\n\n".join(
        f"[{block.get('source')}|p{block.get('priority')}] {block.get('content','')}"
        for block in context_blocks
        if block.get("included")
    )

    if task_type == "continue":
        instruction = (
            "请基于上下文续写小说正文，保持原有叙事风格与人称。"
            "如果上下文较少，请直接写出一个自然起势的小说段落。"
            "只输出正文，不要解释。"
        )
    elif task_type == "dialogue":
        character = parameters.get("characterName") or "角色"
        scene = parameters.get("scene") or ""
        instruction = (
            f"请生成一段对话，主说话人是“{character}”。"
            f"{' 场景：' + str(scene) if scene else ''}"
            "只输出对话正文，不要解释。"
        )
    elif task_type == "polish":
        instruction = "请润色下面的选中文本，使语序更自然、措辞更凝练，含义不变。只输出修改后的全文。"
    elif task_type == "expand":
        instruction = "请扩写下面的选中文本，补充动作、环境与心理描写，保持风格一致。只输出修改后的全文。"
    elif task_type == "summarize":
        instruction = "请将下面的选中文本压缩为更短版本，保留关键信息与风格。只输出修改后的全文。"
    elif task_type == "outline":
        instruction = "请给出 3 到 6 条小说大纲/推进建议，每条单独一行，只输出建议列表。"
    elif task_type == "advice":
        instruction = "请给出 3 到 6 条具体写作建议，每条单独一行，只输出建议列表。"
    elif task_type == "name_gen":
        instruction = "请生成 10 个适合当前风格的中文名字，每行一个，只输出名字列表。"
    else:
        instruction = "请基于上下文完成任务。只输出结果，不要解释。"

    parts: list[str] = [instruction]
    if context_text:
        parts.append(f"上下文：\n{context_text}")
    if selection_text:
        parts.append(f"选中文本：\n{selection_text}")

    text = "\n\n".join(parts)

    # MiMo docs: user content can be a list of content blocks for streaming.
    return [
        {
            "role": "system",
            "content": "You are MiMo, an AI assistant developed by Xiaomi.",
        },
        {
            "role": "user",
            "content": [{"type": "text", "text": text}],
        },
    ]


async def _run_task(task_id: str) -> None:
    ensure_ai_state()
    queue = cast(dict[str, Any], app.state.ai_stream_queues).get(task_id)
    if queue is None:
        return

    task = get_ai_task(task_id)
    if task is None:
        cast(asyncio.Queue[object], queue).put_nowait(None)
        return

    await cast(asyncio.Queue[object], queue).put({"type": "task.started", "taskId": task_id})

    try:
        config = cast(dict[str, Any], task.get("configSnapshot", {}))
        system_defaults = cast(dict[str, Any], app.state.ai_system_defaults)
        model = cast(str, config.get("model") or system_defaults.get("model") or "kimi2.5")
        raw_temp: object = config.get("temperature", system_defaults.get("temperature", 0.7))
        if isinstance(raw_temp, (int, float)):
            temperature = float(raw_temp)
        elif isinstance(raw_temp, str):
            temperature = float(raw_temp)
        else:
            temperature = float(cast(float, system_defaults.get("temperature", 0.7)))
        max_tokens = int(_target_length(cast(dict[str, Any], task.get("parameters", {})), config))
        provider = get_llm_provider()
        messages: list[dict[str, Any]]
        if provider == "mimo":
            messages = _build_messages_for_task_mimo(task)
        else:
            messages = cast(list[dict[str, Any]], _build_messages_for_task(task))

        task_type = cast(AITaskType, task["type"])
        created_at = cast(str, task["createdAt"])
        if task_type in DIFF_TASK_TYPES:
            revised = await _llm_chat_completion(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            original = cast(Optional[str], task.get("selectionText")) or ""
            result = AIResult(
                taskId=task_id,
                type=task_type,
                status="done",
                payloadType="diff",
                payload=AIDiffPayload(
                    diff=_simple_diff(original, revised),
                    revisedText=_coerce_nonempty_text(revised, original),
                ),
                createdAt=created_at,
            ).model_dump()
            task["status"] = "done"
            task["updatedAt"] = _now_iso()
            task["result"] = result
            await cast(asyncio.Queue[object], queue).put({"type": "task.completed", "taskId": task_id, "result": result})
            await cast(asyncio.Queue[object], queue).put(None)
            return

        if task_type in SUGGESTION_TASK_TYPES:
            raw_text = await _llm_chat_completion(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            suggestions = _extract_list_items(raw_text, limit=6)
            result = AIResult(
                taskId=task_id,
                type=task_type,
                status="done",
                payloadType="suggestions",
                payload=AISuggestionsPayload(
                    suggestions=suggestions or [_coerce_nonempty_text(raw_text, "未生成建议")]
                ),
                createdAt=created_at,
            ).model_dump()
            task["status"] = "done"
            task["updatedAt"] = _now_iso()
            task["result"] = result
            await cast(asyncio.Queue[object], queue).put({"type": "task.completed", "taskId": task_id, "result": result})
            await cast(asyncio.Queue[object], queue).put(None)
            return

        if task_type == "name_gen":
            raw_text = await _llm_chat_completion(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            names = _extract_list_items(raw_text, limit=10)
            result = AIResult(
                taskId=task_id,
                type=task_type,
                status="done",
                payloadType="names",
                payload=AINamesPayload(names=names or ["沈砚"]),
                createdAt=created_at,
            ).model_dump()
            task["status"] = "done"
            task["updatedAt"] = _now_iso()
            task["result"] = result
            await cast(asyncio.Queue[object], queue).put({"type": "task.completed", "taskId": task_id, "result": result})
            await cast(asyncio.Queue[object], queue).put(None)
            return

        # Text-like tasks stream
        partial = ""
        async for delta in _llm_stream_chat_completion(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        ):
            if cast(bool, task.get("stopRequested")) or task.get("status") == "stopped":
                raise asyncio.CancelledError
            partial += delta
            task["partialText"] = partial
            await cast(asyncio.Queue[object], queue).put({"type": "task.delta", "taskId": task_id, "content": delta})

        if not partial.strip():
            fallback_text = await _llm_chat_completion(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            partial = fallback_text.strip()
            task["partialText"] = partial
            for chunk in _chunk_text(partial):
                await cast(asyncio.Queue[object], queue).put({"type": "task.delta", "taskId": task_id, "content": chunk})

        result = AIResult(
            taskId=task_id,
            type=cast(AITaskType, task["type"]),
            status="done",
            payloadType="text",
            payload=AITextPayload(content=partial),
            createdAt=created_at,
        ).model_dump()
        task["status"] = "done"
        task["updatedAt"] = _now_iso()
        task["result"] = result
        await cast(asyncio.Queue[object], queue).put({"type": "task.completed", "taskId": task_id, "result": result})
        await cast(asyncio.Queue[object], queue).put(None)
    except asyncio.CancelledError:
        # Stop endpoint will emit task.stopped event.
        try:
            await cast(asyncio.Queue[object], queue).put(None)
        except Exception:
            pass
    except (MoonshotError, MimoError) as exc:
        result = AIResult(
            taskId=task_id,
            type=cast(AITaskType, task["type"]),
            status="failed",
            payloadType="text",
            payload=AITextPayload(content=cast(str, task.get("partialText", ""))),
            error=str(exc),
            createdAt=cast(str, task["createdAt"]),
        ).model_dump()
        task["status"] = "failed"
        task["updatedAt"] = _now_iso()
        task["result"] = result
        await cast(asyncio.Queue[object], queue).put({"type": "task.failed", "taskId": task_id, "error": str(exc)})
        await cast(asyncio.Queue[object], queue).put(None)
    except Exception as exc:  # pragma: no cover
        result = AIResult(
            taskId=task_id,
            type=cast(AITaskType, task["type"]),
            status="failed",
            payloadType="text",
            payload=AITextPayload(content=cast(str, task.get("partialText", ""))),
            error="AI task failed",
            createdAt=cast(str, task["createdAt"]),
        ).model_dump()
        task["status"] = "failed"
        task["updatedAt"] = _now_iso()
        task["result"] = result
        await cast(asyncio.Queue[object], queue).put({"type": "task.failed", "taskId": task_id, "error": str(exc)})
        await cast(asyncio.Queue[object], queue).put(None)
    finally:
        cast(dict[str, Any], app.state.ai_runner_tasks).pop(task_id, None)


async def start_task_runner(task_id: str) -> None:
    ensure_ai_state()
    qmap = cast(dict[str, Any], app.state.ai_stream_queues)
    if task_id not in qmap:
        qmap[task_id] = asyncio.Queue()
    tmap = cast(dict[str, Any], app.state.ai_runner_tasks)
    if task_id in tmap:
        return
    tmap[task_id] = asyncio.create_task(_run_task(task_id))


async def stream_ai_task_events(task_id: str) -> AsyncIterator[dict[str, Any]]:
    ensure_ai_state()
    task = get_ai_task(task_id)
    if task is None:
        return
    if task.get("result") is not None and task.get("status") in {"done", "stopped", "failed"}:
        yield {"type": "task.started", "taskId": task_id}
        status = cast(str, task["status"])
        if status == "failed":
            error_message = cast(dict[str, Any], task["result"]).get("error") or "AI task failed"
            yield {"type": "task.failed", "taskId": task_id, "error": cast(str, error_message)}
        elif status == "stopped":
            yield {"type": "task.stopped", "taskId": task_id, "result": task["result"]}
        else:
            yield {"type": "task.completed", "taskId": task_id, "result": task["result"]}
        return
    queue = cast(dict[str, Any], app.state.ai_stream_queues).get(task_id)
    if queue is None:
        return

    while True:
        event = await cast(asyncio.Queue[object], queue).get()
        if event is None:
            break
        yield cast(dict[str, Any], event)
