from typing import Any, Dict, List, Optional, Tuple

from server.main import _iso_z, _now, app

EXPORT_VERSION = "1.0.0"

KB_ENTITY_TYPES = {
    "characters",
    "locations",
    "items",
    "factions",
    "foreshadows",
    "settings",
}

PLURAL_TO_SINGULAR = {
    "characters": "character",
    "locations": "location",
    "items": "item",
    "factions": "faction",
    "foreshadows": "foreshadow",
    "settings": "setting",
}

SINGULAR_TO_STORE = {
    "character": "kb_characters",
    "location": "kb_locations",
    "item": "kb_items",
    "faction": "kb_factions",
    "foreshadow": "kb_foreshadows",
    "setting": "kb_settings",
}

VALID_STRATEGIES = {"skip", "overwrite", "keep_both"}


def _get_project(
    project_id: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    project = next(
        (p for p in app.state.fake_db.projects if p["id"] == project_id), None
    )
    if project is None:
        return None, {"error": "PROJECT_NOT_FOUND", "message": "Project not found"}
    return project, None


def _build_export_kb(project_id: str, scope: Dict[str, Any]) -> Dict[str, Any]:
    kb: Dict[str, List[Dict[str, Any]]] = {
        "characters": [],
        "locations": [],
        "items": [],
        "factions": [],
        "foreshadows": [],
        "settings": [],
        "relations": [],
    }
    mode = scope.get("mode", "all")
    if mode == "all":
        for entity_type in KB_ENTITY_TYPES:
            kb[entity_type] = []
    elif mode == "types":
        types = scope.get("types", [])
        for entity_type in types:
            if entity_type in KB_ENTITY_TYPES:
                kb[entity_type] = []
    elif mode == "items":
        kb["items"] = []
    return kb


def create_kb_export(
    project_id: str,
    scope: Dict[str, Any],
    user_id: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    project, err = _get_project(project_id)
    if err is not None:
        return None, err

    export_id = f"kb_export-{getattr(app.state, 'kb_export_counter', 0) + 1}"
    app.state.kb_export_counter = getattr(app.state, "kb_export_counter", 0) + 1

    kb = _build_export_kb(project_id, scope)
    now_iso = _iso_z(_now())

    export_data: Dict[str, Any] = {
        "version": EXPORT_VERSION,
        "projectMeta": {
            "projectId": project_id,
            "projectName": project["name"],
        },
        "exportedAt": now_iso,
        "scope": scope,
        "knowledgeBase": kb,
    }
    app.state.kb_exports[export_id] = export_data

    return {
        "exportId": export_id,
        "projectId": project_id,
        "scope": scope,
        "createdAt": now_iso,
    }, None


def get_kb_export(
    export_id: str, project_id: str
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    export = app.state.kb_exports.get(export_id)
    if export is None:
        return None, {"error": "EXPORT_NOT_FOUND", "message": "Export not found"}
    if export["projectMeta"]["projectId"] != project_id:
        return None, {"error": "EXPORT_NOT_FOUND", "message": "Export not found"}
    return export, None


def _validate_kb_import_data(data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    if "version" not in data:
        return False, "INVALID_KB_SCHEMA"
    if "projectMeta" not in data:
        return False, "INVALID_KB_SCHEMA"
    if "knowledgeBase" not in data:
        return False, "INVALID_KB_SCHEMA"
    kb = data.get("knowledgeBase", {})
    if not isinstance(kb, dict):
        return False, "INVALID_KB_SCHEMA"
    for entity_type in KB_ENTITY_TYPES:
        if entity_type in kb and not isinstance(kb[entity_type], list):
            return False, "INVALID_KB_SCHEMA"
    return True, None


def _find_existing_entity(
    project_id: str,
    entity_type: str,
    name: str,
) -> Optional[Dict[str, Any]]:
    singular_type = PLURAL_TO_SINGULAR.get(entity_type, entity_type)
    if singular_type not in SINGULAR_TO_STORE:
        return None
    store_name = SINGULAR_TO_STORE[singular_type]
    entity_store = getattr(app.state, store_name, {})
    if not entity_store:
        return None
    for entity in entity_store.values():
        if entity.get("projectId") == project_id and entity.get("name") == name:
            return entity
    return None


def _generate_unique_name(project_id: str, entity_type: str, original_name: str) -> str:
    counter = 1
    new_name = f"{original_name} ({counter})"
    while _find_existing_entity(project_id, entity_type, new_name) is not None:
        counter += 1
        new_name = f"{original_name} ({counter})"
    return new_name


def import_kb_data(
    project_id: str,
    data: Dict[str, Any],
    strategy: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    valid, error_code = _validate_kb_import_data(data)
    if not valid:
        return None, {"error": error_code, "message": "Invalid KB schema"}

    if strategy not in VALID_STRATEGIES:
        return None, {
            "error": "INVALID_STRATEGY",
            "message": f"Invalid strategy: {strategy}",
        }

    kb = data.get("knowledgeBase", {})
    imported = 0
    skipped = 0
    overwritten = 0
    renamed = 0

    for entity_type in KB_ENTITY_TYPES:
        entities = kb.get(entity_type, [])
        for entity in entities:
            name = entity.get("name", "")
            if not name:
                continue
            existing = _find_existing_entity(project_id, entity_type, name)
            if existing is not None:
                if strategy == "skip":
                    skipped += 1
                    continue
                elif strategy == "overwrite":
                    for key, value in entity.items():
                        if key not in ("id", "projectId", "createdAt"):
                            existing[key] = value
                    overwritten += 1
                    imported += 1
                elif strategy == "keep_both":
                    new_name = _generate_unique_name(project_id, entity_type, name)
                    entity_copy = dict(entity)
                    entity_copy["name"] = new_name
                    new_id = f"kb{entity_type}-{getattr(app.state, 'kb_import_counter', 0) + 1}"
                    app.state.kb_import_counter = (
                        getattr(app.state, "kb_import_counter", 0) + 1
                    )
                    entity_copy["id"] = new_id
                    entity_copy["projectId"] = project_id
                    _store_imported_entity(entity_type, entity_copy)
                    renamed += 1
                    imported += 1
            else:
                new_id = (
                    f"kb{entity_type}-{getattr(app.state, 'kb_import_counter', 0) + 1}"
                )
                app.state.kb_import_counter = (
                    getattr(app.state, "kb_import_counter", 0) + 1
                )
                entity_copy = dict(entity)
                entity_copy["id"] = new_id
                entity_copy["projectId"] = project_id
                _store_imported_entity(entity_type, entity_copy)
                imported += 1

    return {
        "imported": imported,
        "skipped": skipped,
        "overwritten": overwritten,
        "renamed": renamed,
    }, None


def _store_imported_entity(entity_type: str, entity: Dict[str, Any]) -> None:
    singular_type = PLURAL_TO_SINGULAR.get(entity_type, entity_type)
    store_name = SINGULAR_TO_STORE.get(singular_type)
    if store_name is None:
        return
    entity_store = getattr(app.state, store_name, None)
    if entity_store is None:
        entity_store = {}
        setattr(app.state, store_name, entity_store)
    entity_store[entity["id"]] = entity
