export * from './generated';

export type ProjectType = 'novel' | 'medium' | 'short';

export interface Project {
  id: string;
  name: string;
  tags: string[];
  cover_color: string;
  total_chars: number;
  chapter_count: number;
  updated_at: string;
  type?: ProjectType;
  description?: string;
  structureMode?: string;
  templateId?: string;
}

export interface User {
  id: string;
  email: string;
}

export type ParserStatus = 'none' | 'pending' | 'processing' | 'parsing' | 'parsed' | 'failed' | 'empty';

export interface ChapterSummary {
  id: string;
  projectId: string;
  volumeId: string;
  title: string;
  order: number;
  charCount: number;
  parserStatus: ParserStatus;
  lastEditedAt?: string;
  hasNote?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Volume {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  order: number;
  chapterCount: number;
  totalChars: number;
  chapters: ChapterSummary[];
}

export interface ChapterNote {
  id: string;
  chapterId: string;
  content: string;
  charCount: number;
  autoSavedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterContentResponse {
  id: string;
  title: string;
  content: string;
  parserStatus: ParserStatus;
  parseProgress?: number;
  errorMessage?: string;
  updatedAt: string;
}

export interface ChapterStat {
  id: string;
  title: string;
  volumeName: string;
  chars: number;
  percentage: number;
}
