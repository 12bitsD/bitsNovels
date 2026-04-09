/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useExportPanelState } from '../useExportPanelState';
import { useExportTaskManager } from '../useExportTaskManager';
import { useExportTemplates } from '../useExportTemplates';

vi.mock('../useExportTaskManager', () => ({
  useExportTaskManager: vi.fn(),
}));

vi.mock('../useExportTemplates', () => ({
  useExportTemplates: vi.fn(),
}));

describe('useExportPanelState', () => {
  it('initializes and handles template apply and save', async () => {
    const mockApplyTemplate = vi.fn();
    const mockTaskManager = {
      applyTemplate: mockApplyTemplate,
      config: {
        format: 'docx',
        font: 'SimSun',
        fontSize: '12',
        lineSpacing: 1.5,
        includeVolumeTitle: true,
        includeChapterNumber: true,
        includeNotes: false,
        includeAnnotations: false,
        txtEncoding: 'utf8',
        txtSeparator: 'line',
      }
    };
    vi.mocked(useExportTaskManager).mockReturnValue(mockTaskManager as any);

    const mockCreateTemplate = vi.fn().mockResolvedValue({});
    vi.mocked(useExportTemplates).mockReturnValue({
      templates: [],
      loading: false,
      createTemplate: mockCreateTemplate,
    } as any);

    const { result } = renderHook(() => useExportPanelState('p1'));

    expect(result.current.showSaveModal).toBe(false);

    // Apply template
    const template = { id: 't1', name: 'T1', format: 'docx' };
    act(() => {
      result.current.handleApplyTemplate(template as any);
    });

    expect(result.current.selectedTemplate).toBe(template);
    expect(mockApplyTemplate).toHaveBeenCalledWith(template);

    // Save template - empty name
    await act(async () => {
      await result.current.handleSaveTemplate();
    });
    expect(result.current.templateError).toBe('模板名称不能为空');

    // Save template - too long
    act(() => {
      result.current.setTemplateName('a'.repeat(35));
    });
    await act(async () => {
      await result.current.handleSaveTemplate();
    });
    expect(result.current.templateError).toBe('模板名称不能超过30个字符');

    // Save template - success
    act(() => {
      result.current.setTemplateName('My Template');
    });
    await act(async () => {
      await result.current.handleSaveTemplate();
    });

    expect(mockCreateTemplate).toHaveBeenCalledWith({
      name: 'My Template',
      format: 'docx',
      options: expect.any(Object),
    });
    expect(result.current.showSaveModal).toBe(false);
    expect(result.current.templateName).toBe('');
  });

  it('handles save template error', async () => {
    const mockTaskManager = { config: { format: 'docx' } };
    vi.mocked(useExportTaskManager).mockReturnValue(mockTaskManager as any);

    const mockCreateTemplate = vi.fn().mockRejectedValue(new Error('Failed to save'));
    vi.mocked(useExportTemplates).mockReturnValue({
      templates: [],
      loading: false,
      createTemplate: mockCreateTemplate,
    } as any);

    const { result } = renderHook(() => useExportPanelState('p1'));

    act(() => {
      result.current.setTemplateName('Valid Name');
    });

    await act(async () => {
      await result.current.handleSaveTemplate();
    });

    expect(result.current.templateError).toBe('Failed to save');
    expect(result.current.savingTemplate).toBe(false);
  });
});
