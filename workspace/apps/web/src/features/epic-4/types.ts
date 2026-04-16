export type AITaskType =
  | 'continue'
  | 'polish'
  | 'expand'
  | 'summarize'
  | 'dialogue'
  | 'outline'
  | 'name_gen'
  | 'advice'
  | 'parse';

export type AIConfigSource = 'project' | 'global' | 'system';
export type ParseDepth = 'fast' | 'standard' | 'deep';
export type StoryCopilotMode = 'worldbuild' | 'plot_derive_lite' | 'story_diagnose';
export type AIResultStatus = 'draft' | 'generating' | 'awaiting_confirmation' | 'done' | 'stopped' | 'failed';
export type AIResultPayloadType =
  | 'text'
  | 'diff'
  | 'suggestions'
  | 'names'
  | 'copilot_worldbuild'
  | 'copilot_plot';

export interface AIProjectConfig {
  projectId: string;
  model?: string;
  temperature?: number;
  maxLength?: number;
  parseDepth?: ParseDepth;
  useGlobalAsDefault: boolean;
  updatedAt: string;
}

export interface AIDiffChange {
  type: 'insert' | 'delete';
  content: string;
}

export interface AITextPayload {
  content: string;
}

export interface AIDiffPayload {
  diff: AIDiffChange[];
  revisedText?: string;
}

export interface AISuggestionsPayload {
  suggestions: string[];
}

export interface AINamesPayload {
  names: string[];
}

export type AIResultPayload =
  | AITextPayload
  | AIDiffPayload
  | AISuggestionsPayload
  | AINamesPayload
  | Record<string, unknown>;

export interface AIResult {
  taskId: string;
  type: AITaskType;
  status: AIResultStatus;
  payloadType: AIResultPayloadType;
  payload: AIResultPayload;
  error?: string;
  createdAt: string;
}

export interface AIResolvedField<T> {
  value: T;
  source: AIConfigSource;
  fallbackValue?: T;
  fallbackSource?: AIConfigSource;
}

export interface AIProjectConfigFields {
  model: AIResolvedField<string>;
  temperature: AIResolvedField<number>;
  maxLength: AIResolvedField<number>;
  parseDepth: AIResolvedField<ParseDepth>;
}

export interface AIProjectConfigResponse {
  projectConfig: AIProjectConfig;
  resolvedConfig: AIProjectConfigFields;
}

export type AIProjectConfigKey = keyof AIProjectConfigFields;

export interface StoryCopilotSession {
  id: string;
  projectId: string;
  mode: StoryCopilotMode;
  title?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export type StoryCopilotMessageRole = 'user' | 'assistant' | 'system';
export type StoryCopilotEventType = 'message' | 'card' | 'card_action';
export type StoryCopilotCardKind = 'draft' | 'result';
export type StoryCopilotCardStatus = 'pending' | 'adopted' | 'dismissed';
export type StoryCopilotCardActionType = 'adopt' | 'dismiss' | 'regenerate';

export interface StoryCopilotMessage {
  id: string;
  role: StoryCopilotMessageRole;
  content: string;
}

export interface StoryCopilotCard {
  id: string;
  kind: StoryCopilotCardKind;
  title: string;
  summary: string;
  status: StoryCopilotCardStatus;
  payload?: Record<string, unknown>;
}

export interface StoryCopilotCardAction {
  id: string;
  cardId: string;
  action: StoryCopilotCardActionType;
}

export interface StoryCopilotEvent {
  id: string;
  type: StoryCopilotEventType;
  createdAt: string;
  message?: StoryCopilotMessage;
  card?: StoryCopilotCard;
  cardAction?: StoryCopilotCardAction;
}

export interface StoryCopilotDraftCard {
  id: string;
  title: string;
  summary: string;
  actionLabel: string;
}

export interface StoryCopilotScaffoldState {
  headline: string;
  description: string;
  cards: StoryCopilotDraftCard[];
}
