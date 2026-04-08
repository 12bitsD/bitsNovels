from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

KBEntityType = Literal[
    "character",
    "location",
    "item",
    "faction",
    "foreshadow",
    "setting",
]
KBSource = Literal["ai", "manual"]


class KBEntityBase(BaseModel):
    id: str
    projectId: str
    source: KBSource
    confirmed: bool
    remark: Optional[str] = None
    createdAt: str
    updatedAt: str
    deletedAt: Optional[str] = None
    restoreUntil: Optional[str] = None


class KBListResponse(BaseModel):
    items: list[dict[str, Any]]
    total: int
    page: int = 1
    limit: int = 20


class KBSearchParams(BaseModel):
    query: str = Field(min_length=2)
    entityTypes: Optional[list[KBEntityType]] = None
    limit: int = Field(default=20, ge=1, le=100)


class KBBulkActionRequest(BaseModel):
    entityIds: list[str] = Field(min_length=1)
