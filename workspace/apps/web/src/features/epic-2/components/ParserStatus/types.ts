export type ParserChapterStatusValue =
  | 'no_content'
  | 'none'
  | 'empty'
  | 'pending'
  | 'queued'
  | 'parsing'
  | 'parsed'
  | 'failed'
  | 'cancelled';

export type ParserTrigger = 'auto' | 'manual' | 'batch';

export interface ParserResultSummary {
  newCharacters: number;
  newLocations: number;
  newItems: number;
  newFactions: number;
  newForeshadows: number;
  newRelations: number;
  consistencyIssues: number;
}

export interface ParserChapterState {
  chapterId: string;
  status: ParserChapterStatusValue;
  lastParsedAt?: string;
  lastQueuedAt?: string;
  retryCount: number;
  failureReason?: string | null;
  trigger?: ParserTrigger;
  batchJobId?: string;
  resultSummary?: ParserResultSummary | null;
  fallback?: {
    used: boolean;
    strategy?: 'cache' | 'snapshot' | 'rule_based';
    reason?: 'upstream_timeout' | 'upstream_unavailable' | 'partial_data' | 'degraded_mode' | string;
    staleSeconds?: number;
  };
  queuePosition?: number | null;
  isActive?: boolean;
  activeTaskId?: string | null;
  updatedAt?: string;
}

export interface ParserBatchJob {
  id: string;
  projectId: string;
  scope: 'all' | 'volume' | 'selected';
  volumeId?: string;
  chapterIds?: string[];
  totalChapters: number;
  completedChapters: number;
  failedChapters: number;
  cancelledChapters?: number;
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
  progress?: number;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ParserProjectSummary {
  noContentCount: number;
  pendingCount: number;
  queuedCount: number;
  parsingCount: number;
  parsedCount: number;
  failedCount: number;
  cancelledCount: number;
}

export interface ParserProjectStatus {
  projectId: string;
  summary: ParserProjectSummary;
  pendingCount: number;
  activeBatchJobs: ParserBatchJob[];
  chapters: ParserChapterState[];
}

export interface ParserChapterOption {
  id: string;
  title: string;
  volumeId: string;
}

export interface ParserVolumeOption {
  id: string;
  name: string;
  chapters: ParserChapterOption[];
}

export interface ParserToast {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
}

export interface BatchParseStartInput {
  scope: 'all' | 'volume' | 'selected';
  volumeId?: string;
  chapterIds?: string[];
}
