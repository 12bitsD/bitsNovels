import { useState, useEffect, useCallback, useRef } from 'react';
import { client } from '../../../api/client';
import { type ExportFormat, type ExportTemplate } from './useExportTemplates';

export type ExportScope = 'all' | 'volume' | 'chapter';

export interface ExportTaskResponse {
  id: string;
  projectId: string;
  userId: string;
  format: ExportFormat;
  scope: ExportScope;
  scopeIds?: string[];
  status: 'pending' | 'generating' | 'done' | 'failed';
  progress: number;
  fileUrl?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ExportConfig {
  format: ExportFormat;
  scope: ExportScope;
  font: string;
  fontSize: string;
  lineSpacing: number;
  includeVolumeTitle: boolean;
  includeChapterNumber: boolean;
  includeNotes: boolean;
  includeAnnotations: boolean;
  txtEncoding: 'utf8' | 'gbk';
  txtSeparator: 'blank' | 'line' | 'none';
}

export function useExportTaskManager(projectId: string) {
  const [config, setConfig] = useState<ExportConfig>({
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
  });

  const [exporting, setExporting] = useState(false);
  const [currentTask, setCurrentTask] = useState<ExportTaskResponse | null>(null);
  const [exportError, setExportError] = useState('');

  const [history, setHistory] = useState<ExportTaskResponse[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateConfig = useCallback((updates: Partial<ExportConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const applyTemplate = useCallback((template: ExportTemplate) => {
    updateConfig({
      format: template.format,
      ...(template.options && {
        font: template.options.font || 'SimSun',
        fontSize: template.options.fontSize || '12',
        lineSpacing: template.options.lineSpacing || 1.75,
        includeVolumeTitle: template.options.includeVolumeTitle ?? true,
        includeChapterNumber: template.options.includeChapterNumber ?? true,
        includeNotes: template.options.includeNotes ?? false,
        includeAnnotations: template.options.includeAnnotations ?? false,
        txtEncoding: template.options.txtEncoding || 'utf8',
        txtSeparator: template.options.txtSeparator || 'line',
      })
    });
  }, [updateConfig]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const result = await client.GET(`/api/projects/${projectId}/exports`);
      if (!result.error) {
        const data = result.data as { items: ExportTaskResponse[] };
        setHistory(data.items || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingHistory(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const pollTaskStatus = useCallback(async (taskId: string) => {
    try {
      const result = await client.GET(`/api/projects/${projectId}/exports/${taskId}`);
      if (!result.error) {
        const data = result.data as { task: ExportTaskResponse };
        setCurrentTask(data.task);
        
        if (data.task.status === 'done' || data.task.status === 'failed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (data.task.status === 'done') {
            await fetchHistory();
          }
        }
      }
    } catch {
      // Silent fail
    }
  }, [projectId, fetchHistory]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError('');
    setCurrentTask(null);

    try {
      const result = await client.POST(`/api/projects/${projectId}/exports`, {
        body: {
          format: config.format,
          scope: config.scope,
        },
      });

      if (result.error) {
        const msg = (result.error as { detail?: string }).detail || '导出失败';
        setExportError(msg);
        setExporting(false);
        return;
      }

      const data = result.data as { taskId: string; status: string };
      
      pollIntervalRef.current = setInterval(() => {
        pollTaskStatus(data.taskId);
      }, 1000);

      await pollTaskStatus(data.taskId);
    } catch {
      setExportError('导出失败');
    } finally {
      setExporting(false);
    }
  }, [projectId, config.format, config.scope, pollTaskStatus]);

  const handleDownload = useCallback((taskId: string) => {
    window.open(`/api/projects/${projectId}/exports/${taskId}/download`, '_blank');
  }, [projectId]);

  return {
    config,
    updateConfig,
    applyTemplate,
    exporting,
    currentTask,
    exportError,
    setExportError,
    history,
    loadingHistory,
    handleExport,
    handleDownload
  };
}
