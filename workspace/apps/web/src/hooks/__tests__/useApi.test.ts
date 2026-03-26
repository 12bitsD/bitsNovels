import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useApi } from '../useApi';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';

describe('useApi', () => {
  it('returns data on success', async () => {
    server.use(
      http.post('/test', () => HttpResponse.json({ result: 'ok' }))
    );

    const { result } = renderHook(() => useApi<{ result: string }>());
    await result.current.execute('/test', { body: {} });

    await waitFor(() => expect(result.current.data).toEqual({ result: 'ok' }));
    expect(result.current.error).toBe('');
    expect(result.current.loading).toBe(false);
  });

  it('sets error on API error response', async () => {
    server.use(
      http.post('/test-err', () => HttpResponse.json(
        { detail: 'Invalid request' }, { status: 400 })
      )
    );

    const { result } = renderHook(() => useApi<{ result: string }>());
    await result.current.execute('/test-err', { body: {} });

    await waitFor(() => expect(result.current.error).toBe('Invalid request'));
    expect(result.current.data).toBeUndefined();
  });

  it('sets loading during request', async () => {
    let resolve: () => void;
    const promise = new Promise<void>(r => { resolve = r; });
    server.use(
      http.post('/test-slow', () => new HttpResponse(() => promise))
    );

    const { result } = renderHook(() => useApi());
    act(() => {
      result.current.execute('/test-slow', { body: {} });
    });
    expect(result.current.loading).toBe(true);
    resolve!();
  });

  it('calls onSuccess callback', async () => {
    const onSuccess = vi.fn();
    server.use(
      http.post('/test', () => HttpResponse.json({ result: 'ok' }))
    );

    const { result } = renderHook(() => useApi({ onSuccess }));
    await result.current.execute('/test', { body: {} });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ result: 'ok' }));
  });

  it('reset clears all state', async () => {
    server.use(
      http.post('/test', () => HttpResponse.json({ result: 'ok' }))
    );

    const { result } = renderHook(() => useApi());
    await result.current.execute('/test', { body: {} });
    await waitFor(() => expect(result.current.data).toBeDefined());
    act(() => {
      result.current.reset();
    });
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBe('');
    expect(result.current.loading).toBe(false);
  });
});
