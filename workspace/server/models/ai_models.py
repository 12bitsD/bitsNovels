from __future__ import annotations

from typing import Any, Literal, Optional, TypeAlias

from pydantic import BaseModel, Field

AITaskType = Literal[
    "continue",
    "polish",
    "expand",
    "summarize",
    "dialogue",
    "outline",
    "name_gen",
    "advice",
    "parse",
]
ParseDepth = Literal["fast", "standard", "deep"]
AIResultStatus = Literal[
    "draft",
    "generating",
    "awaiting_confirmation",
    "done",
    "stopped",
    "failed",
]
AIResultPayloadType = Literal[
    "text",
    "diff",
    "suggestions",
    "names",
    "copilot_worldbuild",
    "copilot_plot",
]
StoryCopilotMode = Literal["worldbuild", "plot_derive_lite", "story_diagnose"]


class AIProjectConfig(BaseModel):
    projectId: str
    model: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0.1, le=1.0)
    maxLength: Optional[int] = Field(default=None, ge=100, le=5000)
    parseDepth: Optional[ParseDepth] = None
    useGlobalAsDefault: bool = True
    updatedAt: str


class AIDiffChange(BaseModel):
    type: Literal["insert", "delete"]
    content: str


class AITextPayload(BaseModel):
    content: str


class AIDiffPayload(BaseModel):
    diff: list[AIDiffChange]
    revisedText: Optional[str] = None


class AISuggestionsPayload(BaseModel):
    suggestions: list[str]


class AINamesPayload(BaseModel):
    names: list[str]


class WorldbuildEntityRef(BaseModel):
    entityType: str
    entityId: str


class WorldbuildEntryDraft(BaseModel):
    title: str
    category: str
    content: str
    relatedEntityRefs: Optional[list[WorldbuildEntityRef]] = None
    confidence: Literal["high", "medium", "low"]


class CopilotWorldbuildPayload(BaseModel):
    reply: Optional[str] = None
    entries: list[WorldbuildEntryDraft]


class PlotImpact(BaseModel):
    characterId: str
    impact: str


class PlotFactionImpact(BaseModel):
    factionId: str
    impact: str


class PlotForeshadowTrigger(BaseModel):
    foreshadowId: str
    reason: str


class PlotConflict(BaseModel):
    description: str
    severity: Literal["high", "medium", "low"]


class PlotBranch(BaseModel):
    title: str
    summary: str
    plotPoints: list[str]


class PlotDeriveLiteResult(BaseModel):
    impactedCharacters: list[PlotImpact]
    impactedFactions: list[PlotFactionImpact]
    triggeredForeshadows: list[PlotForeshadowTrigger]
    conflicts: list[PlotConflict]
    branches: list[PlotBranch]


class CopilotPlotPayload(BaseModel):
    derivation: PlotDeriveLiteResult


AIResultPayload: TypeAlias = (
    AITextPayload
    | AIDiffPayload
    | AISuggestionsPayload
    | AINamesPayload
    | CopilotWorldbuildPayload
    | CopilotPlotPayload
)


class AIResult(BaseModel):
    taskId: str
    type: AITaskType
    status: AIResultStatus
    payloadType: AIResultPayloadType
    payload: AIResultPayload
    error: Optional[str] = None
    createdAt: str


class StoryCopilotSession(BaseModel):
    id: str
    projectId: str
    mode: StoryCopilotMode
    title: Optional[str] = None
    status: Literal["active", "completed", "archived"]
    createdAt: str
    updatedAt: str


class AIContextBlock(BaseModel):
    source: str
    priority: int
    estimatedTokens: int = Field(ge=0)
    required: bool
    included: bool
    preview: str


class AITaskResponse(BaseModel):
    id: str
    projectId: str
    type: AITaskType
    status: AIResultStatus
    chapterId: Optional[str] = None
    configSnapshot: dict[str, Any]
    contextBlocks: list[AIContextBlock]
    createdAt: str
    updatedAt: str


class CreateAITaskRequest(BaseModel):
    projectId: str
    type: AITaskType
    chapterId: Optional[str] = None
    selectionText: Optional[str] = None
    cursorOffset: Optional[int] = Field(default=None, ge=0)
    parameters: dict[str, Any] = Field(default_factory=dict)

    model_config = {"extra": "forbid"}


class UpdateAIProjectConfigRequest(BaseModel):
    model: Optional[str] = None
    temperature: Optional[float] = Field(default=None, ge=0.1, le=1.0)
    maxLength: Optional[int] = Field(default=None, ge=100, le=5000)
    parseDepth: Optional[ParseDepth] = None
    useGlobalAsDefault: Optional[bool] = None

    model_config = {"extra": "forbid"}
