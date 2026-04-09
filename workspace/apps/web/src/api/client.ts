import { QueryClient } from '@tanstack/react-query';

type RequestOptions = {
  body?: unknown;
};

const authTokenRef: { get: () => string | null } = {
  get: () => localStorage.getItem('token'),
};

export function setAuthTokenGetter(getter: () => string | null) {
  authTokenRef.get = getter;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const request = async (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, options?: RequestOptions) => {
  const token = authTokenRef.get();
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    return { data: undefined, error: payload, response };
  }

  return { data: payload, error: undefined, response };
};

export const client = {
  GET: (path: string) => request('GET', path),
  POST: (path: string, options?: RequestOptions) => request('POST', path, options),
  PUT: (path: string, options?: RequestOptions) => request('PUT', path, options),
  PATCH: (path: string, options?: RequestOptions) => request('PATCH', path, options),
  DELETE: (path: string, options?: RequestOptions) => request('DELETE', path, options),
};

export const fetchApi = async <T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, options?: RequestOptions): Promise<T> => {
  const { data, error, response } = await client[method](path, options);
  if (error || !response.ok) {
    const err = Object.assign(new Error((error as { detail?: string })?.detail || '请求失败'), {
      status: response.status,
      payload: error,
    });
    throw err;
  }
  return data as T;
};
