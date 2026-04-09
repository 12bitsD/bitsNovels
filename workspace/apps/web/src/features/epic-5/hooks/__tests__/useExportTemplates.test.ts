/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useExportTemplates } from '../useExportTemplates';
import { client } from '../../../../api/client';

vi.mock('../../../../api/client', () => ({
  client: {
    GET: vi.fn(),
    POST: vi.fn(),
    PUT: vi.fn(),
    DELETE: vi.fn(),
  },
}));

describe('useExportTemplates', () => {
  it('should fetch templates', async () => {
    vi.mocked(client.GET).mockResolvedValue({
      data: { templates: [{ id: '1', name: 'T1' }] },
      error: null,
    } as any);

    const { result } = renderHook(() => useExportTemplates());
    
    await waitFor(() => {
      expect(result.current.templates).toHaveLength(1);
    });
  });

  it('should create template', async () => {
    vi.mocked(client.POST).mockResolvedValue({
      data: { id: '2', name: 'T2' },
      error: null,
    } as any);

    const { result } = renderHook(() => useExportTemplates());
    
    await act(async () => {
      await result.current.createTemplate({ name: 'T2' } as any);
    });
  });

  it('should delete template', async () => {
    vi.mocked(client.DELETE).mockResolvedValue({
      data: null,
      error: null,
    } as any);

    const { result } = renderHook(() => useExportTemplates());
    
    await act(async () => {
      await result.current.deleteTemplate('2');
    });
  });
});
