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

export function extractApiErrorMessage(error: unknown, fallback = '请求失败') {
  if (typeof error === 'object' && error !== null) {
    if ('detail' in error && typeof (error as { detail?: unknown }).detail === 'string') {
      return (error as { detail: string }).detail;
    }
    if (
      'error' in error &&
      typeof (error as { error?: { message?: unknown } }).error?.message === 'string'
    ) {
      return (error as { error: { message: string } }).error.message;
    }
  }

  return fallback;
}

function inferDownloadFilename(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const simpleMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1];
  }

  return fallback;
}

export async function downloadFile(path: string, fallbackFilename: string) {
  const token = authTokenRef.get();
  const response = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    throw new Error(extractApiErrorMessage(payload, '下载失败'));
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = inferDownloadFilename(
    response.headers.get('Content-Disposition'),
    fallbackFilename,
  );
  anchor.click();
  URL.revokeObjectURL(downloadUrl);
}

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
    const err = Object.assign(new Error(extractApiErrorMessage(error, '请求失败')), {
      status: response.status,
      payload: error,
    });
    throw err;
  }
  return data as T;
};
