import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { client } from '../../../api/client';
import { useAIProjectConfig } from '../hooks/useAIProjectConfig';

describe('useAIProjectConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(client, 'GET').mockResolvedValue({
      data: {
        projectConfig: {
          projectId: '1',
          model: 'moonshot-v1',
          temperature: 0.7,
          useGlobalAsDefault: true,
          updatedAt: '2026-04-16T12:00:00.000Z',
        },
        resolvedConfig: {
          model: { value: 'moonshot-v1', source: 'project', fallbackValue: 'gpt-4.1-mini', fallbackSource: 'global' },
          temperature: { value: 0.7, source: 'project', fallbackValue: 0.6, fallbackSource: 'global' },
          maxLength: { value: 2200, source: 'global', fallbackValue: 1500, fallbackSource: 'system' },
          parseDepth: { value: 'deep', source: 'system' },
        },
      },
      error: undefined,
      response: new Response(),
    });
    vi.spyOn(client, 'PATCH').mockResolvedValue({
      data: {
        projectConfig: {
          projectId: '1',
          model: 'moonshot-v1',
          temperature: 0.7,
          useGlobalAsDefault: true,
          updatedAt: '2026-04-16T12:30:00.000Z',
        },
        resolvedConfig: {
          model: { value: 'moonshot-v1', source: 'project', fallbackValue: 'gpt-4.1-mini', fallbackSource: 'global' },
          temperature: { value: 0.7, source: 'project', fallbackValue: 0.6, fallbackSource: 'global' },
          maxLength: { value: 2200, source: 'global', fallbackValue: 1500, fallbackSource: 'system' },
          parseDepth: { value: 'deep', source: 'system' },
        },
      },
      error: undefined,
      response: new Response(),
    });
  });

  it('loads resolved config fields with source metadata', async () => {
    const { result } = renderHook(() => useAIProjectConfig('1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.fields.model.value).toBe('moonshot-v1');
    expect(result.current.fields.model.source).toBe('project');
    expect(result.current.fields.maxLength.source).toBe('global');
    expect(result.current.fields.parseDepth.source).toBe('system');
    expect(result.current.isDirty).toBe(false);
  });

  it('marks draft dirty, saves overrides, and exposes success toast', async () => {
    vi.spyOn(client, 'PATCH').mockResolvedValueOnce({
      data: {
        projectConfig: {
          projectId: '1',
          model: 'doubao-pro-32k',
          temperature: 0.55,
          useGlobalAsDefault: true,
          updatedAt: '2026-04-16T12:30:00.000Z',
        },
        resolvedConfig: {
          model: { value: 'doubao-pro-32k', source: 'project', fallbackValue: 'gpt-4.1-mini', fallbackSource: 'global' },
          temperature: { value: 0.55, source: 'project', fallbackValue: 0.6, fallbackSource: 'global' },
          maxLength: { value: 2200, source: 'global', fallbackValue: 1500, fallbackSource: 'system' },
          parseDepth: { value: 'deep', source: 'system' },
        },
      },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useAIProjectConfig('1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.updateField('model', 'doubao-pro-32k');
      result.current.updateField('temperature', 0.55);
    });

    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.toast?.title).toBe('AI 配置已更新');
    expect(result.current.fields.model.value).toBe('doubao-pro-32k');
    expect(result.current.fields.model.source).toBe('project');
    expect(result.current.fields.temperature.value).toBe(0.55);
    expect(result.current.isDirty).toBe(false);
  });

  it('resets a project override back to inherited source', async () => {
    vi.spyOn(client, 'PATCH').mockResolvedValueOnce({
      data: {
        projectConfig: {
          projectId: '1',
          temperature: 0.7,
          useGlobalAsDefault: true,
          updatedAt: '2026-04-16T12:30:00.000Z',
        },
        resolvedConfig: {
          model: { value: 'gpt-4.1-mini', source: 'global', fallbackValue: 'gpt-4.1', fallbackSource: 'system' },
          temperature: { value: 0.7, source: 'project', fallbackValue: 0.6, fallbackSource: 'global' },
          maxLength: { value: 2200, source: 'global', fallbackValue: 1500, fallbackSource: 'system' },
          parseDepth: { value: 'deep', source: 'system' },
        },
      },
      error: undefined,
      response: new Response(),
    });

    const { result } = renderHook(() => useAIProjectConfig('1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.resetField('model');
    });

    expect(result.current.fields.model.value).toBe('gpt-4.1-mini');
    expect(result.current.fields.model.source).toBe('global');
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.fields.model.source).toBe('global');
    expect(result.current.toast?.title).toBe('AI 配置已更新');
  });

  it('surfaces save failures from the API', async () => {
    vi.spyOn(client, 'PATCH').mockResolvedValueOnce({
      data: undefined,
      error: { detail: 'AI 配置保存失败' },
      response: new Response('', { status: 500 }),
    });

    const { result } = renderHook(() => useAIProjectConfig('1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.updateField('temperature', 0.9);
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.error).toBe('AI 配置保存失败');
    expect(result.current.toast).toBeNull();
    expect(result.current.isDirty).toBe(true);
  });
});
