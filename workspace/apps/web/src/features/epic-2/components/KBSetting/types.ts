export type KBSettingSource = 'manual' | 'ai';

export interface KBEntityRef {
  entityType: string;
  entityId: string;
}

export interface KBSetting {
  id: string;
  projectId: string;
  type: 'setting';
  source: KBSettingSource;
  confirmed: boolean;
  isRejected?: boolean;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  restoreUntil?: string | null;
  title: string;
  category: string;
  content: string;
  order: number;
  relatedEntityRefs: KBEntityRef[];
  rawAI?: unknown;
}

export interface KBSettingListResponse {
  items: KBSetting[];
  total: number;
}

