import { client } from '../api/client';
import { useState, useCallback, useRef } from 'react';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

interface UseApiResult<T> {
  data: T | undefined;
  error: string;
  loading: boolean;
  execute: (path: string, options?: { body?: unknown }) => Promise<T | undefined>;
  reset: () => void;
}

export function useApi<T = unknown>(options: UseApiOptions<T> = {}): UseApiResult<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(async (path: string, requestOptions?: { body?: unknown }) => {
    setLoading(true);
    setError('');
    try {
      const result = await client.POST(path, requestOptions);
      if (result.error) {
        const msg = (result.error as { detail?: string }).detail || '请求失败';
        setError(msg);
        optionsRef.current.onError?.(msg);
        return undefined;
      }
      setData(result.data as T);
      optionsRef.current.onSuccess?.(result.data as T);
      return result.data as T;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '请求失败';
      setError(msg);
      optionsRef.current.onError?.(msg);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(undefined);
    setError('');
    setLoading(false);
  }, []);

  return { data, error, loading, execute, reset };
}
