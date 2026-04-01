import { useState, useRef, useCallback, useEffect } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type SaveSource = 'auto' | 'manual';

export interface UseAutoSaveOptions {
  content: string;
  onSave: (content: string, source: SaveSource) => Promise<unknown>;
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface UseAutoSaveReturn {
  content: string;
  setContent: (content: string) => void;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  saveNow: () => Promise<void>;
  retry: () => Promise<void>;
}

export function useAutoSave(options: UseAutoSaveOptions): UseAutoSaveReturn {
  const {
    content: initialContent,
    onSave,
    debounceMs = 3000,
    maxRetries = 3,
    retryDelayMs = 1000,
  } = options;

  const [content, setContentState] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  const isMountedRef = useRef(true);

  contentRef.current = content;

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const executeSave = useCallback(async (source: SaveSource, currentRetryCount = 0): Promise<void> => {
    if (!isMountedRef.current) return;

    setSaveStatus('saving');

    try {
      await onSave(contentRef.current, source);

      if (!isMountedRef.current) return;

      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (error) {
      if (!isMountedRef.current) return;

      if (currentRetryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        if (isMountedRef.current) {
          return executeSave(source, currentRetryCount + 1);
        }
      } else {
        setSaveStatus('error');
      }
    }
  }, [onSave, maxRetries, retryDelayMs]);

  const saveNow = useCallback(async () => {
    clearDebounceTimer();
    await executeSave('manual', 0);
  }, [clearDebounceTimer, executeSave]);

  const retry = useCallback(async () => {
    await executeSave('manual', 0);
  }, [executeSave]);

  const setContent = useCallback((newContent: string) => {
    setContentState(newContent);
    clearDebounceTimer();

    debounceTimerRef.current = setTimeout(() => {
      executeSave('auto', 0);
    }, debounceMs);
  }, [clearDebounceTimer, executeSave, debounceMs]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearDebounceTimer();
    };
  }, [clearDebounceTimer]);

  return {
    content,
    setContent,
    saveStatus,
    lastSavedAt,
    saveNow,
    retry,
  };
}
