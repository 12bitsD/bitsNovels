from __future__ import annotations

import json
from typing import Any, Optional, cast

from server.services import ai_service
from server.services._base import app


def _extract_json(text: str) -> Optional[dict[str, Any]]:
    candidate = text.strip()
    if not candidate:
        return None
    try:
        parsed = json.loads(candidate)
        if isinstance(parsed, dict):
            return cast(dict[str, Any], parsed)
    except json.JSONDecodeError:
        pass
    # Best-effort: extract first {...} block.
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start >= 0 and end > start:
        try:
            parsed = json.loads(candidate[start : end + 1])
            if isinstance(parsed, dict):
                return cast(dict[str, Any], parsed)
        except json.JSONDecodeError:
            return None
    return None


async def generate_turn(
    *,
    mode: str,
    project_id: str,
    user_id: str,
    content: str,
    chapter_id: Optional[str] = None,
) -> tuple[str, list[dict[str, Any]]]:
    """
    Returns (assistant_message, cards[]). Each card is:
      { kind, title, summary, payload }
    """
    failpoints = getattr(getattr(app.state, "fake_db", None), "failpoints", set())
    if "copilot_turn_stub" in failpoints:
        if mode == "worldbuild":
            return (
                "我整理了 2 条可确认写入的设定草稿。",
                [
                    {
                        "kind": "draft",
                        "title": "帝国纪年体系",
                        "summary": "确立纪年分段与命名规则。",
                        "payload": {
                            "category": "历史",
                            "content": "奠基纪/扩张纪/裂变纪。",
                        },
                    },
                    {
                        "kind": "draft",
                        "title": "帝国核心地理分区",
                        "summary": "按气候与交通拆分 3 个核心区域。",
                        "payload": {
                            "category": "地理",
                            "content": "北境(矿产)/中州(行政)/南海(贸易)。",
                        },
                    },
                ],
            )
        if mode == "plot_derive_lite":
            chapter_ref = chapter_id or ""
            return (
                "我给出 3 个大纲方向卡片（可采纳写入章节备注），并补充 1 条冲突升级提示。",
                [
                    {
                        "kind": "result",
                        "title": "大纲方向 A：先胜后败",
                        "summary": "主角先获得阶段性胜利，再被制度性反扑打回原形。",
                        "payload": {
                            "writeTarget": "chapter_note",
                            "chapterId": chapter_ref,
                            "content": "方向A：先给主角一场小胜利，再用制度打回原形。",
                        },
                    },
                    {
                        "kind": "result",
                        "title": "大纲方向 B：误会引爆",
                        "summary": "关键情报被错译，导致盟友反目，矛盾升级。",
                        "payload": {
                            "writeTarget": "chapter_note",
                            "chapterId": chapter_ref,
                            "content": "方向B：让情报被误读，盟友反目，形成不可逆裂痕。",
                        },
                    },
                    {
                        "kind": "result",
                        "title": "大纲方向 C：代价交换",
                        "summary": "用一次必须付出代价的交易，推动情节转向。",
                        "payload": {
                            "writeTarget": "chapter_note",
                            "chapterId": chapter_ref,
                            "content": "方向C：用一次必须付代价的交易推动转向，代价埋伏笔。",
                        },
                    },
                    {
                        "kind": "result",
                        "title": "冲突提示",
                        "summary": "主角的目标与帝国制度产生硬冲突（建议具体化到一条法规）。",
                        "payload": {"dimension": "plot", "severity": "high"},
                    },
                ],
            )
        return (
            "我给出了 4 条写作建议，覆盖节奏/人物/描写/情节，并提供段落定位。",
            [
                {
                    "kind": "result",
                    "title": "节奏建议",
                    "summary": "把信息披露拆成 2 段，留一个钩子到下一段。",
                    "payload": {"dimension": "pace", "paragraphIndex": 0},
                },
                {
                    "kind": "result",
                    "title": "人物建议",
                    "summary": "给主角一个微表情或小动作，让情绪更可见。",
                    "payload": {"dimension": "character", "paragraphIndex": 1},
                },
                {
                    "kind": "result",
                    "title": "描写建议",
                    "summary": "用一个具体的环境细节承接转场，减少跳切感。",
                    "payload": {"dimension": "description", "paragraphIndex": 2},
                },
                {
                    "kind": "result",
                    "title": "情节建议",
                    "summary": "把冲突落到一次可执行的行动选择上，而不是抽象争论。",
                    "payload": {"dimension": "plot", "paragraphIndex": 3},
                },
            ],
        )

    # LLM path (best-effort). If anything fails, return a safe fallback.
    try:
        config = ai_service.get_effective_ai_config(project_id, user_id)[1]
        model = cast(str, config.get("model"))
        temperature = float(config.get("temperature", 0.7))
        max_tokens = int(config.get("maxLength", 1024))

        system_prompt = (
            "You are Story Copilot. Respond ONLY with JSON.\n"
            "Schema: {\"assistant\":\"...\",\"cards\":[{\"kind\":\"draft|result\",\"title\":\"...\","
            "\"summary\":\"...\",\"payload\":{...}}]}\n"
            "Mode: "
            + mode
        )
        user_prompt = content
        if chapter_id:
            chapter_text = ai_service._chapter_content(chapter_id)
            if chapter_text:
                user_prompt += "\n\n[CHAPTER]\n" + chapter_text[:4000]

        raw = await ai_service._llm_chat_completion(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        parsed = _extract_json(raw) or {}
        assistant = cast(str, parsed.get("assistant") or "").strip()
        cards = cast(list[dict[str, Any]], parsed.get("cards") or [])
        normalized: list[dict[str, Any]] = []
        for card in cards:
            if not isinstance(card, dict):
                continue
            kind = cast(str, card.get("kind") or "result")
            title = cast(str, card.get("title") or "").strip()
            summary = cast(str, card.get("summary") or "").strip()
            if not title or not summary:
                continue
            normalized.append(
                {
                    "kind": "draft" if kind == "draft" else "result",
                    "title": title,
                    "summary": summary,
                    "payload": card.get("payload") if isinstance(card.get("payload"), dict) else {},
                }
            )
        if not assistant:
            assistant = "已生成结果卡片，请确认或继续补充。"
        return assistant, normalized
    except Exception:
        return "暂时无法生成，请稍后再试。", []
