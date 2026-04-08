export type KBSource = 'ai' | 'manual';

export interface KBEntityBase {
  id: string;
  projectId: string;
  source: KBSource;
  confirmed: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type ForeshadowStatus = 'unresolved' | 'partially_resolved' | 'resolved' | 'abandoned';
export type ForeshadowStatusFilter = ForeshadowStatus | 'all';

export interface KBForeshadowSuggestion {
  chapterId: string;
  message: string;
  confidence: 'high' | 'medium' | 'low';
  createdAt: string;
  confirmedAt?: string;
}

export interface ForeshadowNotifyState {
  reminded: boolean;
  warned: boolean;
}

export interface KBForeshadow extends KBEntityBase {
  type: 'foreshadow';
  name: string;
  summary: string;
  plantedChapterId: string;
  quote: string;
  status: ForeshadowStatus;
  expectedResolveChapterId?: string;
  resolvedChapterId?: string;
  resolveNote?: string;
  aiSuggestions: KBForeshadowSuggestion[];
  notifyState: ForeshadowNotifyState;
  rawAI?: {
    summary?: string;
    quote?: string;
  };
}

export interface CreateKBForeshadowInput {
  name: string;
  summary: string;
  plantedChapterId: string;
  quote: string;
  expectedResolveChapterId?: string;
}

export interface UpdateKBForeshadowInput {
  name?: string;
  summary?: string;
  quote?: string;
  status?: ForeshadowStatus;
  expectedResolveChapterId?: string;
  resolvedChapterId?: string;
  resolveNote?: string;
}

export const FORESHADOW_STATUS_ORDER: ForeshadowStatus[] = [
  'unresolved',
  'partially_resolved',
  'resolved',
  'abandoned',
];

export const FORESHADOW_STATUS_LABELS: Record<ForeshadowStatus, string> = {
  unresolved: '未回收',
  partially_resolved: '部分回收',
  resolved: '已回收',
  abandoned: '已放弃',
};
