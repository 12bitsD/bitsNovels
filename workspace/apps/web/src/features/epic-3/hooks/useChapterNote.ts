import { useState, useEffect, useCallback, useRef } from 'react';
import { client } from '../../../api/client';
import type { SaveStatus } from './useAutoSave';
import type { ChapterNote } from '@bitsnovels/api-types';

interface UseChapterNoteOptions {
  debounceMs?: number;
}

interface UseChapterNoteReturn {
  note: ChapterNote | null;
  content: string;
  charCount: number;
  loading: boolean;
  error: string | null;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  updateContent: (content: string) => void;
  saveNote: (content: string) => Promise<void>;
  refetch: () => Promise<void>;
}

function calculateCharCount(text: string): number {
  if (!text) return 0;

  try {
    const parsed = JSON.parse(text);
    const plainText = extractPlainTextFromJSON(parsed);
    return calculatePlainCharCount(plainText);
  } catch {
    return calculatePlainCharCount(text);
  }
}

function extractPlainTextFromJSON(node: unknown): string {
  if (typeof node === 'string') {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(extractPlainTextFromJSON).join('');
  }

  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (obj.text && typeof obj.text === 'string') {
      return obj.text;
    }
    if (obj.content && Array.isArray(obj.content)) {
      return obj.content.map(extractPlainTextFromJSON).join('');
    }
  }

  return '';
}

function calculatePlainCharCount(text: string): number {
  const textWithoutHtml = text.replace(/<[^>]+>/g, '');

  let count = 0;
  for (const char of textWithoutHtml) {
    if (/[\u4e00-\u9fff]/.test(char)) {
      count++;
    } else if (/[a-zA-Z0-9]/.test(char)) {
      count++;
    } else if (/[\u3000-\u303F\uFF00-\uFFEF\u2000-\u206F]/.test(char)) {
      count++;
    }
  }

  return count;
}

const MAX_CHAR_COUNT = 2000;

export function useChapterNote(chapterId: string, options: UseChapterNoteOptions = {}): UseChapterNoteReturn {
  const { debounceMs = 3000 } = options;

  const [note, setNote] = useState<ChapterNote | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  const isMountedRef = useRef(true);

  contentRef.current = content;

  const fetchNote = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const { data, error: apiError } = await client.GET(`/api/chapters/${chapterId}/note`);

      if (!isMountedRef.current) return;

      if (apiError) {
        setError('加载备注失败');
        return;
      }

      if (data) {
        const noteData = data as ChapterNote;
        setNote(noteData);
        setContent(noteData.content);
      }
    } catch {
      if (isMountedRef.current) {
        setError('加载备注失败');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [chapterId]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchNote();
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchNote]);

  const executeSave = useCallback(async (contentToSave: string) => {
    if (!isMountedRef.current) return;

    setSaveStatus('saving');

    try {
      const { data, error: apiError } = await client.PUT(`/api/chapters/${chapterId}/note`, {
        body: { content: contentToSave },
      });

      if (!isMountedRef.current) return;

      if (apiError) {
        setSaveStatus('error');
        return;
      }

      if (data) {
        const savedNote = data as ChapterNote;
        setNote(savedNote);
        setSaveStatus('saved');
        setLastSavedAt(new Date());
      }
    } catch {
      if (isMountedRef.current) {
        setSaveStatus('error');
      }
    }
  }, [chapterId]);

  const saveNote = useCallback(async (contentToSave: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await executeSave(contentToSave);
  }, [executeSave]);

  const updateContent = useCallback((newContent: string) => {
    const truncatedContent = newContent.length > MAX_CHAR_COUNT
      ? newContent.slice(0, MAX_CHAR_COUNT)
      : newContent;

    setContent(truncatedContent);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSave(truncatedContent);
    }, debounceMs);
  }, [executeSave, debounceMs]);

  const refetch = useCallback(async () => {
    await fetchNote();
  }, [fetchNote]);

  return {
    note,
    content,
    charCount: calculateCharCount(content),
    loading,
    error,
    saveStatus,
    lastSavedAt,
    updateContent,
    saveNote,
    refetch,
  };
}