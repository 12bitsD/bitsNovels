from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Optional, cast

from server.services._base import _iso_z, _main_module, app


def _next_id(counter_key: str, prefix: str) -> str:
    return cast(str, _main_module()._next_id(counter_key, prefix))


def _now() -> datetime:
    return cast(datetime, _main_module()._now())


MANUAL_PRIORITY = 10
AUTO_PRIORITY = 5
BATCH_PRIORITY = 1
MAX_CONCURRENCY = 5
AUTO_DEBOUNCE_SECONDS = 60
PARSER_TIMEOUT_SECONDS = 60

LOCATION_PATTERN = re.compile(
    r"(?:来到|进入|走进|抵达|在)([\u4e00-\u9fff]{2,12}(?:城|镇|村|书院|山|宫|阁))"
)
ITEM_PATTERN = re.compile(r"([\u4e00-\u9fff]{2,12}(?:剑|刀|印|令|珠|鼎))")
FACTION_PATTERN = re.compile(r"([\u4e00-\u9fff]{2,12}(?:阁|门|宗|派|会|盟))")
CHARACTER_PATTERN = re.compile(
    r"([\u4e00-\u9fff]{2,3})(?:来到|走进|进入|遇见|加入|发现|得到)"
)


@dataclass
class DetectionResult:
    characters: list[str] = field(default_factory=list)
    locations: list[str] = field(default_factory=list)
    items: list[str] = field(default_factory=list)
    item_owners: dict[str, str] = field(default_factory=dict)
    factions: list[str] = field(default_factory=list)


def detect_entities(content: str) -> DetectionResult:
    return DetectionResult(
        characters=_detect_characters(content),
        locations=_detect_locations(content),
        items=_detect_items(content),
        item_owners={
            item_name: owner_name
            for owner_name, item_name in _detect_item_owners(content)
        },
        factions=_detect_factions(content),
    )


def ensure_parser_state() -> None:
    if not hasattr(app.state, "parser_queue"):
        app.state.parser_queue = []
    if not hasattr(app.state, "parser_tasks"):
        app.state.parser_tasks = {}
    if not hasattr(app.state, "parser_states"):
        app.state.parser_states = {}
    if not hasattr(app.state, "parser_jobs"):
        app.state.parser_jobs = {}
    if not hasattr(app.state, "parser_active_task_ids"):
        app.state.parser_active_task_ids = []
    if not hasattr(app.state, "parser_task_history"):
        app.state.parser_task_history = []
    if not hasattr(app.state, "parser_job_counter"):
        app.state.parser_job_counter = 0
    if not hasattr(app.state, "parser_task_counter"):
        app.state.parser_task_counter = 0


def _content_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _task_sort_key(task_id: str) -> tuple[int, str]:
    task = app.state.parser_tasks[task_id]
    return (-int(task["priority"]), str(task["createdAt"]))


def _queue_task_id(task_id: str) -> None:
    if task_id not in app.state.parser_queue:
        app.state.parser_queue.append(task_id)
    app.state.parser_queue.sort(key=_task_sort_key)


def _remove_from_queue(task_id: str) -> None:
    app.state.parser_queue = [
        queued_id for queued_id in app.state.parser_queue if queued_id != task_id
    ]


def _get_project(project_id: str) -> Optional[dict[str, Any]]:
    return cast(
        Optional[dict[str, Any]],
        next((p for p in app.state.fake_db.projects if p["id"] == project_id), None),
    )


def _get_chapter(project_id: str, chapter_id: str) -> Optional[dict[str, Any]]:
    return cast(
        Optional[dict[str, Any]],
        next(
            (
                chapter
                for chapter in app.state.fake_db.chapters
                if chapter["id"] == chapter_id and chapter["projectId"] == project_id
            ),
            None,
        ),
    )


def _project_chapters(project_id: str) -> list[dict[str, Any]]:
    return sorted(
        [
            chapter
            for chapter in app.state.fake_db.chapters
            if chapter["projectId"] == project_id
        ],
        key=lambda chapter: (int(chapter.get("order", 0)), str(chapter["id"])),
    )


def _default_status_for_chapter(chapter: dict[str, Any]) -> str:
    content = app.state.chapter_contents.get(chapter["id"], {}).get("content", "")
    if not content.strip() and not chapter.get("chars"):
        return "no_content"
    existing = cast(Optional[str], chapter.get("parserStatus"))
    if existing in {"pending", "queued", "parsing", "parsed", "failed", "cancelled"}:
        return existing
    return "pending"


def _ensure_state_record(project_id: str, chapter_id: str) -> dict[str, Any]:
    ensure_parser_state()
    existing = cast(Optional[dict[str, Any]], app.state.parser_states.get(chapter_id))
    if existing is not None:
        return existing
    chapter = _get_chapter(project_id, chapter_id)
    status = "no_content"
    if chapter is not None:
        status = _default_status_for_chapter(chapter)
    state = {
        "chapterId": chapter_id,
        "status": status,
        "lastParsedAt": None,
        "lastQueuedAt": None,
        "lastContentHash": None,
        "retryCount": 0,
        "failureReason": None,
        "trigger": "manual",
        "batchJobId": None,
        "resultSummary": None,
    }
    app.state.parser_states[chapter_id] = state
    return state


def _notification_body(
    chapter_id: str,
    result_summary: Optional[dict[str, int]] = None,
    failure_reason: Optional[str] = None,
) -> str:
    if result_summary is not None:
        return (
            f"章节 {chapter_id} 解析完成：新增角色 {result_summary['newCharacters']}，"
            f"地点 {result_summary['newLocations']}，道具 {result_summary['newItems']}。"
        )
    return f"章节 {chapter_id} 解析失败：{failure_reason or '未知错误'}"


def _create_notification(
    user_id: str,
    project_id: str,
    chapter_id: str,
    notification_type: str,
    result_summary: Optional[dict[str, int]] = None,
    failure_reason: Optional[str] = None,
) -> None:
    notification = {
        "id": _next_id("notification_counter", "notif"),
        "userId": user_id,
        "type": notification_type,
        "title": "解析完成" if notification_type == "parse_done" else "解析失败",
        "body": _notification_body(chapter_id, result_summary, failure_reason),
        "projectId": project_id,
        "read": False,
        "createdAt": _iso_z(_now()),
        "actionTarget": {
            "kind": "chapter_parser",
            "projectId": project_id,
            "chapterId": chapter_id,
        },
    }
    app.state.fake_db.notifications.append(notification)


def _detect_characters(content: str) -> list[str]:
    matches = [match.group(1) for match in CHARACTER_PATTERN.finditer(content)]
    fallback = re.findall(
        r"[张李王赵钱孙周吴郑冯陈褚卫蒋沈韩杨朱秦许何吕施孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝安常乐于时傅皮卞齐康伍余元顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘斜厉戎祖武符刘景詹束龙叶幸司黎乔苍双闻莘逄姬冉桂牛燕尚温庄晏瞿习容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公仉督岳帅缑亢况郈有琴归海墨哈][\u4e00-\u9fff]",
        content,
    )
    seen: list[str] = []
    for name in matches + fallback:
        if name not in seen:
            seen.append(name)
    return seen


def _detect_locations(content: str) -> list[str]:
    return list(
        dict.fromkeys(match.group(1) for match in LOCATION_PATTERN.finditer(content))
    )


def _detect_items(content: str) -> list[str]:
    return list(
        dict.fromkeys(match.group(1) for match in ITEM_PATTERN.finditer(content))
    )


def _detect_item_owners(content: str) -> list[tuple[str, str]]:
    pattern = re.compile(
        r"([\u4e00-\u9fff]{2,3})(?:得到|获得|拾起|夺走|持有)([\u4e00-\u9fff]{2,12}(?:剑|刀|印|令|珠|鼎))"
    )
    return list(
        dict.fromkeys(
            (match.group(1), match.group(2)) for match in pattern.finditer(content)
        )
    )


def _detect_factions(content: str) -> list[str]:
    return list(
        dict.fromkeys(match.group(1) for match in FACTION_PATTERN.finditer(content))
    )


def _detect_foreshadows(content: str) -> list[str]:
    markers = [
        marker
        for marker in ["似乎", "隐约", "也许", "注定", "伏笔"]
        if marker in content
    ]
    return markers[:1]


def _parse_content(content: str) -> dict[str, int]:
    return {
        "newCharacters": len(_detect_characters(content)),
        "newLocations": len(_detect_locations(content)),
        "newItems": len(_detect_items(content)),
        "newFactions": len(_detect_factions(content)),
        "newForeshadows": len(_detect_foreshadows(content)),
        "newRelations": 0,
        "consistencyIssues": 0,
    }


def _materialize_kb_entities(
    project_id: str,
    chapter_id: str,
    content: str,
    detection: DetectionResult,
) -> dict[str, int]:
    from importlib import import_module

    kb_item_service = import_module("server.services.kb_item_service")
    kb_location_service = import_module("server.services.kb_location_service")
    upsert_parser_entity = import_module(
        "server.services.kb_core_service"
    ).upsert_parser_entity
    process_parser_findings = import_module(
        "server.services.kb_foreshadow_service"
    ).process_parser_findings

    created = {
        "newCharacters": 0,
        "newLocations": 0,
        "newItems": 0,
        "newFactions": 0,
        "newForeshadows": 0,
        "newRelations": 0,
        "consistencyIssues": 0,
    }
    for name in detection.characters:
        _, is_new = upsert_parser_entity(
            project_id,
            "character",
            {"name": name, "source": "ai", "chapterIds": [chapter_id]},
        )
        if is_new:
            created["newCharacters"] += 1
    for name in detection.locations:
        _, is_new = kb_location_service.upsert_location_from_parser(
            project_id,
            {
                "name": name,
                "chapterIds": [chapter_id],
                "locationType": "other",
            },
            return_is_new=True,
        )
        if is_new:
            created["newLocations"] += 1
    for name in detection.items:
        _, is_new = kb_item_service.upsert_item_from_parser(
            project_id,
            {
                "name": name,
                "chapterIds": [chapter_id],
                "itemType": "other",
                "ownerCharacterId": detection.item_owners.get(name),
            },
            return_is_new=True,
        )
        if is_new:
            created["newItems"] += 1
    for name in detection.factions:
        _, is_new = upsert_parser_entity(
            project_id,
            "faction",
            {
                "name": name,
                "source": "ai",
                "chapterIds": [chapter_id],
                "factionType": "other",
            },
        )
        if is_new:
            created["newFactions"] += 1
    foreshadow_result = process_parser_findings(project_id, chapter_id, content)
    created["newForeshadows"] += foreshadow_result["created"]
    return created


def _current_time_iso() -> str:
    return _iso_z(_now())


def _priority_for_trigger(trigger: str) -> int:
    if trigger == "manual":
        return MANUAL_PRIORITY
    if trigger == "auto":
        return AUTO_PRIORITY
    return BATCH_PRIORITY


def _existing_queued_task_for_chapter(chapter_id: str) -> Optional[dict[str, Any]]:
    for task_id in app.state.parser_queue:
        task = app.state.parser_tasks[task_id]
        if task["chapterId"] == chapter_id and task["status"] == "queued":
            return cast(dict[str, Any], task)
    return None


def enqueue_parse_task(
    project_id: str,
    chapter_id: str,
    trigger: str,
    content: str,
    batch_job_id: Optional[str] = None,
) -> dict[str, Any]:
    ensure_parser_state()
    state = _ensure_state_record(project_id, chapter_id)
    now = _now()
    content_hash = _content_hash(content)
    if not content.strip():
        state.update(
            {
                "status": "no_content",
                "trigger": trigger,
                "failureReason": None,
                "resultSummary": None,
            }
        )
        return {
            "id": _next_id("parser_task_counter", "parser-task"),
            "projectId": project_id,
            "chapterId": chapter_id,
            "trigger": trigger,
            "priority": _priority_for_trigger(trigger),
            "batchJobId": batch_job_id,
            "contentHash": content_hash,
            "contentSnapshot": content,
            "status": "no_content",
            "retryCount": 0,
            "failureReason": None,
            "resultSummary": None,
            "createdAt": _current_time_iso(),
        }

    queued_task = _existing_queued_task_for_chapter(chapter_id)
    if (
        trigger == "auto"
        and queued_task is not None
        and queued_task["trigger"] == "auto"
    ):
        queued_at = state.get("lastQueuedAt")
        if queued_at is not None:
            queued_time = datetime.fromisoformat(queued_at.replace("Z", "+00:00"))
            if now - queued_time <= timedelta(seconds=AUTO_DEBOUNCE_SECONDS):
                queued_task["contentHash"] = content_hash
                queued_task["contentSnapshot"] = content
                queued_task["createdAt"] = _current_time_iso()
                state["lastContentHash"] = content_hash
                return queued_task

    if queued_task is not None and _priority_for_trigger(trigger) > int(
        queued_task["priority"]
    ):
        _remove_from_queue(str(queued_task["id"]))
        queued_task["status"] = "cancelled"
        app.state.parser_task_history.append(queued_task)

    task = {
        "id": _next_id("parser_task_counter", "parser-task"),
        "projectId": project_id,
        "chapterId": chapter_id,
        "trigger": trigger,
        "priority": _priority_for_trigger(trigger),
        "batchJobId": batch_job_id,
        "contentHash": content_hash,
        "contentSnapshot": content,
        "status": "queued",
        "retryCount": int(state.get("retryCount") or 0),
        "failureReason": None,
        "resultSummary": None,
        "createdAt": _current_time_iso(),
        "startedAt": None,
        "completedAt": None,
    }
    app.state.parser_tasks[task["id"]] = task
    _queue_task_id(str(task["id"]))
    state.update(
        {
            "status": "queued",
            "lastQueuedAt": _current_time_iso(),
            "lastContentHash": content_hash,
            "retryCount": task["retryCount"],
            "failureReason": None,
            "trigger": trigger,
            "batchJobId": batch_job_id,
            "resultSummary": None,
        }
    )
    chapter = _get_chapter(project_id, chapter_id)
    if chapter is not None:
        chapter["parserStatus"] = "queued"
    return task


def create_batch_job(
    project_id: str,
    scope: str,
    volume_id: Optional[str],
    chapter_ids: Optional[list[str]],
    user_id: str,
) -> dict[str, Any]:
    ensure_parser_state()
    if scope == "all":
        selected = _project_chapters(project_id)
    elif scope == "volume":
        selected = [
            chapter
            for chapter in _project_chapters(project_id)
            if chapter["volumeId"] == volume_id
        ]
    else:
        requested = set(chapter_ids or [])
        selected = [
            chapter
            for chapter in _project_chapters(project_id)
            if chapter["id"] in requested
        ]

    job = {
        "id": _next_id("parser_job_counter", "parser-job"),
        "projectId": project_id,
        "scope": scope,
        "volumeId": volume_id,
        "chapterIds": [chapter["id"] for chapter in selected],
        "totalChapters": len(selected),
        "completedChapters": 0,
        "failedChapters": 0,
        "cancelledChapters": 0,
        "status": "pending",
        "createdAt": _current_time_iso(),
        "startedAt": None,
        "completedAt": None,
        "createdBy": user_id,
    }
    app.state.parser_jobs[job["id"]] = job
    for chapter in selected:
        content = app.state.chapter_contents.get(chapter["id"], {}).get("content", "")
        enqueue_parse_task(
            project_id,
            chapter["id"],
            "batch",
            content,
            batch_job_id=cast(str, job["id"]),
        )
    return job


def cancel_batch_job(project_id: str, job_id: str) -> Optional[dict[str, Any]]:
    ensure_parser_state()
    job = cast(Optional[dict[str, Any]], app.state.parser_jobs.get(job_id))
    if job is None or job["projectId"] != project_id:
        return None
    for task_id in list(app.state.parser_queue):
        task = app.state.parser_tasks[task_id]
        if task.get("batchJobId") != job_id:
            continue
        task["status"] = "cancelled"
        task["completedAt"] = _current_time_iso()
        state = _ensure_state_record(project_id, task["chapterId"])
        state["status"] = "cancelled"
        state["batchJobId"] = job_id
        chapter = _get_chapter(project_id, task["chapterId"])
        if chapter is not None:
            chapter["parserStatus"] = "cancelled"
        job["cancelledChapters"] += 1
        _remove_from_queue(task_id)
    job["status"] = "cancelled"
    job["completedAt"] = _current_time_iso()
    return job


def dispatch_parser_tasks() -> list[str]:
    ensure_parser_state()
    available_slots = MAX_CONCURRENCY - len(app.state.parser_active_task_ids)
    if available_slots <= 0:
        return []
    started: list[str] = []
    for task_id in list(app.state.parser_queue):
        if available_slots <= 0:
            break
        task = app.state.parser_tasks[task_id]
        if task["status"] != "queued":
            _remove_from_queue(task_id)
            continue
        _remove_from_queue(task_id)
        task["status"] = "parsing"
        task["startedAt"] = _current_time_iso()
        state = _ensure_state_record(task["projectId"], task["chapterId"])
        state["status"] = "parsing"
        chapter = _get_chapter(task["projectId"], task["chapterId"])
        if chapter is not None:
            chapter["parserStatus"] = "parsing"
        app.state.parser_active_task_ids.append(task_id)
        if task.get("batchJobId"):
            job = app.state.parser_jobs.get(task["batchJobId"])
            if job is not None and job["startedAt"] is None:
                job["startedAt"] = _current_time_iso()
                job["status"] = "running"
        started.append(task_id)
        available_slots -= 1
    return started


def _handle_task_success(task: dict[str, Any], result_summary: dict[str, int]) -> None:
    task["status"] = "parsed"
    task["resultSummary"] = result_summary
    task["completedAt"] = _current_time_iso()
    state = _ensure_state_record(task["projectId"], task["chapterId"])
    state.update(
        {
            "status": "parsed",
            "lastParsedAt": task["completedAt"],
            "retryCount": task["retryCount"],
            "failureReason": None,
            "resultSummary": result_summary,
            "trigger": task["trigger"],
            "batchJobId": task.get("batchJobId"),
        }
    )
    chapter = _get_chapter(task["projectId"], task["chapterId"])
    if chapter is not None:
        chapter["parserStatus"] = "parsed"
    project = _get_project(task["projectId"])
    if project is not None:
        _create_notification(
            project["ownerId"],
            task["projectId"],
            task["chapterId"],
            "parse_done",
            result_summary=result_summary,
        )
    if task.get("batchJobId"):
        job = app.state.parser_jobs.get(task["batchJobId"])
        if job is not None:
            job["completedChapters"] += 1
            if (
                job["completedChapters"]
                + job["failedChapters"]
                + job["cancelledChapters"]
                >= job["totalChapters"]
            ):
                job["status"] = "completed"
                job["completedAt"] = _current_time_iso()


def _handle_task_failure(task: dict[str, Any], failure_reason: str) -> None:
    state = _ensure_state_record(task["projectId"], task["chapterId"])
    if task["retryCount"] < 1:
        task["retryCount"] += 1
        task["status"] = "queued"
        task["failureReason"] = failure_reason
        state.update(
            {
                "status": "queued",
                "retryCount": task["retryCount"],
                "failureReason": failure_reason,
            }
        )
        _queue_task_id(str(task["id"]))
        return

    task["status"] = "failed"
    task["failureReason"] = failure_reason
    task["completedAt"] = _current_time_iso()
    state.update(
        {
            "status": "failed",
            "retryCount": task["retryCount"],
            "failureReason": failure_reason,
            "resultSummary": None,
        }
    )
    chapter = _get_chapter(task["projectId"], task["chapterId"])
    if chapter is not None:
        chapter["parserStatus"] = "failed"
    project = _get_project(task["projectId"])
    if project is not None:
        _create_notification(
            project["ownerId"],
            task["projectId"],
            task["chapterId"],
            "parse_failed",
            failure_reason=failure_reason,
        )
    if task.get("batchJobId"):
        job = app.state.parser_jobs.get(task["batchJobId"])
        if job is not None:
            job["failedChapters"] += 1
            if (
                job["completedChapters"]
                + job["failedChapters"]
                + job["cancelledChapters"]
                >= job["totalChapters"]
            ):
                job["status"] = "failed"
                job["completedAt"] = _current_time_iso()


def process_running_parser_tasks() -> None:
    ensure_parser_state()
    for task_id in list(app.state.parser_active_task_ids):
        task = app.state.parser_tasks[task_id]
        app.state.parser_active_task_ids.remove(task_id)
        failpoint = f"parser_timeout:{task['chapterId']}"
        if failpoint in app.state.fake_db.failpoints:
            _handle_task_failure(
                task, f"Parser timed out after {PARSER_TIMEOUT_SECONDS} seconds"
            )
            continue
        detection = detect_entities(task["contentSnapshot"])
        result_summary = _materialize_kb_entities(
            task["projectId"],
            task["chapterId"],
            task["contentSnapshot"],
            detection,
        )
        _handle_task_success(task, result_summary)


def process_parser_queue() -> None:
    ensure_parser_state()
    while app.state.parser_queue or app.state.parser_active_task_ids:
        dispatch_parser_tasks()
        process_running_parser_tasks()


def get_project_status(project_id: str) -> dict[str, Any]:
    ensure_parser_state()
    summary = {
        "noContentCount": 0,
        "pendingCount": 0,
        "queuedCount": 0,
        "parsingCount": 0,
        "parsedCount": 0,
        "failedCount": 0,
        "cancelledCount": 0,
    }
    states: list[dict[str, Any]] = []
    for chapter in _project_chapters(project_id):
        state = _ensure_state_record(project_id, chapter["id"])
        states.append(state)
        if state["status"] == "no_content":
            summary["noContentCount"] += 1
        elif state["status"] == "pending":
            summary["pendingCount"] += 1
        elif state["status"] == "queued":
            summary["queuedCount"] += 1
        elif state["status"] == "parsing":
            summary["parsingCount"] += 1
        elif state["status"] == "parsed":
            summary["parsedCount"] += 1
        elif state["status"] == "failed":
            summary["failedCount"] += 1
        elif state["status"] == "cancelled":
            summary["cancelledCount"] += 1
    active_jobs = [
        job
        for job in app.state.parser_jobs.values()
        if job["projectId"] == project_id
        and job["status"] in {"pending", "running", "cancelled", "completed", "failed"}
    ]
    return {
        "projectId": project_id,
        "summary": summary,
        "pendingCount": summary["pendingCount"]
        + summary["queuedCount"]
        + summary["failedCount"],
        "activeBatchJobs": active_jobs,
        "chapters": states,
    }


def get_chapter_status(project_id: str, chapter_id: str) -> dict[str, Any]:
    return _ensure_state_record(project_id, chapter_id)
