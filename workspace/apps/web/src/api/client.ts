type RequestOptions = {
  body?: unknown;
};

const request = async (method: 'GET' | 'POST', path: string, options?: RequestOptions) => {
  const token = localStorage.getItem('token');
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
};
