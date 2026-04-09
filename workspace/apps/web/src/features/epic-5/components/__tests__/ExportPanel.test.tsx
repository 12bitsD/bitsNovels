/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, vi, expect, beforeEach } from 'vitest';
import { ExportPanel } from '../ExportPanel';
import { useExportPanelState } from '../../hooks/useExportPanelState';

vi.mock('../../hooks/useExportPanelState', () => ({
  useExportPanelState: vi.fn(),
}));

describe('ExportPanel', () => {
  const mockTaskManager = {
    config: {
      format: 'docx',
      scope: 'all',
      font: 'SimSun',
      fontSize: '12',
      lineSpacing: 1.75,
      includeVolumeTitle: true,
      includeChapterNumber: true,
      includeNotes: false,
      includeAnnotations: false,
      txtEncoding: 'utf8',
      txtSeparator: 'line',
    },
    updateConfig: vi.fn(),
    exporting: false,
    currentTask: null,
    exportError: '',
    setExportError: vi.fn(),
    history: [],
    loadingHistory: false,
    handleExport: vi.fn(),
    handleDownload: vi.fn(),
  };

  const defaultMockState = {
    taskManager: mockTaskManager,
    templates: [],
    templatesLoading: false,
    selectedTemplate: null,
    setSelectedTemplate: vi.fn(),
    showSaveModal: false,
    setShowSaveModal: vi.fn(),
    templateName: '',
    setTemplateName: vi.fn(),
    savingTemplate: false,
    templateError: '',
    setTemplateError: vi.fn(),
    handleApplyTemplate: vi.fn(),
    handleSaveTemplate: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(useExportPanelState).mockReturnValue(defaultMockState as any);
  });

  it('renders ExportPanel with default state', () => {
    render(<ExportPanel projectId="p1" projectName="Project 1" />);
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('导出作品')).toBeInTheDocument();
  });

  it('handles format change', () => {
    render(<ExportPanel projectId="p1" projectName="Project 1" />);
    fireEvent.click(screen.getByText('PDF'));
    expect(mockTaskManager.updateConfig).toHaveBeenCalledWith({ format: 'pdf' });
  });

  it('handles scope change', () => {
    render(<ExportPanel projectId="p1" projectName="Project 1" />);
    fireEvent.click(screen.getByText('指定卷'));
    expect(mockTaskManager.updateConfig).toHaveBeenCalledWith({ scope: 'volume' });
  });

  it('shows save template modal when showSaveModal is true', () => {
    vi.mocked(useExportPanelState).mockReturnValue({
      ...defaultMockState,
      showSaveModal: true,
    } as any);

    render(<ExportPanel projectId="p1" projectName="Project 1" />);
    expect(screen.getByText('保存为模板')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('输入模板名称')).toBeInTheDocument();
  });

  it('handles template apply from select', () => {
    const mockTemplates = [{ id: 't1', name: 'My Template', format: 'docx' }];
    const mockHandleApplyTemplate = vi.fn();
    const mockSetSelectedTemplate = vi.fn();
    
    vi.mocked(useExportPanelState).mockReturnValue({
      ...defaultMockState,
      templates: mockTemplates,
      handleApplyTemplate: mockHandleApplyTemplate,
      setSelectedTemplate: mockSetSelectedTemplate,
    } as any);

    render(<ExportPanel projectId="p1" projectName="Project 1" />);
    
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 't1' } });
    
    expect(mockHandleApplyTemplate).toHaveBeenCalledWith(mockTemplates[0]);

    fireEvent.change(select, { target: { value: '' } });
    expect(mockSetSelectedTemplate).toHaveBeenCalledWith(null);
  });

  it('displays history and handles download', () => {
    vi.mocked(useExportPanelState).mockReturnValue({
      ...defaultMockState,
      taskManager: {
        ...mockTaskManager,
        history: [
          { id: 'h1', format: 'docx', status: 'done', createdAt: '2024-01-01T00:00:00Z', fileUrl: 'url' },
          { id: 'h2', format: 'pdf', status: 'failed', createdAt: '2024-01-01T00:00:00Z' },
        ]
      }
    } as any);

    render(<ExportPanel projectId="p1" projectName="Project 1" />);
    expect(screen.getAllByText('DOCX').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PDF').length).toBeGreaterThan(0);

    const downloadButtons = screen.getAllByLabelText('下载');
    fireEvent.click(downloadButtons[0]);
    expect(mockTaskManager.handleDownload).toHaveBeenCalledWith('h1');
  });

  it('displays current task done and download button', () => {
    vi.mocked(useExportPanelState).mockReturnValue({
      ...defaultMockState,
      taskManager: {
        ...mockTaskManager,
        currentTask: { id: 't1', status: 'done', expiresAt: '2024-01-01T00:00:00Z' },
      }
    } as any);

    render(<ExportPanel projectId="p1" projectName="Project 1" />);
    expect(screen.getByText('导出完成')).toBeInTheDocument();
    fireEvent.click(screen.getByText('下载文件'));
    expect(mockTaskManager.handleDownload).toHaveBeenCalledWith('t1');
  });

  it('displays current task failed', () => {
    vi.mocked(useExportPanelState).mockReturnValue({
      ...defaultMockState,
      taskManager: {
        ...mockTaskManager,
        currentTask: { id: 't1', status: 'failed' },
      }
    } as any);

    render(<ExportPanel projectId="p1" projectName="Project 1" />);
    expect(screen.getByText('导出失败')).toBeInTheDocument();
  });

  it('handles docx/pdf specific config changes', () => {
    render(<ExportPanel projectId="p1" projectName="Project 1" />);
    
    // Change font
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'SimHei' } });
    expect(mockTaskManager.updateConfig).toHaveBeenCalledWith({ font: 'SimHei' });

    // Change font size
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: '14' } });
    expect(mockTaskManager.updateConfig).toHaveBeenCalledWith({ fontSize: '14' });

    // Change line spacing
    fireEvent.change(screen.getAllByRole('combobox')[3], { target: { value: '2' } });
    expect(mockTaskManager.updateConfig).toHaveBeenCalledWith({ lineSpacing: 2 });

    // Toggle include volume title
    fireEvent.click(screen.getByLabelText('包含卷标题页'));
    expect(mockTaskManager.updateConfig).toHaveBeenCalledWith({ includeVolumeTitle: false });

    // Toggle include chapter number
    fireEvent.click(screen.getByLabelText('包含章节编号'));
    expect(mockTaskManager.updateConfig).toHaveBeenCalledWith({ includeChapterNumber: false });
  });

  it('handles txt specific config changes', () => {
    vi.mocked(useExportPanelState).mockReturnValue({
      ...defaultMockState,
      taskManager: {
        ...mockTaskManager,
        config: { ...mockTaskManager.config, format: 'txt' }
      }
    } as any);

    render(<ExportPanel projectId="p1" projectName="Project 1" />);
    
    // Change encoding
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'gbk' } });
    expect(mockTaskManager.updateConfig).toHaveBeenCalledWith({ txtEncoding: 'gbk' });

    // Change separator
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: 'none' } });
    expect(mockTaskManager.updateConfig).toHaveBeenCalledWith({ txtSeparator: 'none' });
  });

  it('handles content control changes', () => {
    render(<ExportPanel projectId="p1" projectName="Project 1" />);
    
    // Toggle include notes
    fireEvent.click(screen.getByLabelText('包含章节备注'));
    expect(mockTaskManager.updateConfig).toHaveBeenCalledWith({ includeNotes: true });

    // Toggle include annotations
    fireEvent.click(screen.getByLabelText('包含批注'));
    expect(mockTaskManager.updateConfig).toHaveBeenCalledWith({ includeAnnotations: true });
  });
});
