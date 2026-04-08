import { useState, useCallback, useEffect, useRef } from 'react';
import { client } from '../../../api/client';

export type ExportFormat = 'docx' | 'txt' | 'pdf' | 'markdown';

export interface ExportTemplateOptions {
  font?: string;
  fontSize?: string;
  lineSpacing?: number;
  includeVolumeTitle?: boolean;
  includeChapterNumber?: boolean;
  includeNotes?: boolean;
  includeAnnotations?: boolean;
  txtEncoding?: 'utf8' | 'gbk';
  txtSeparator?: 'blank' | 'line' | 'none';
}

export interface ExportTemplate {
  id: string;
  userId: string;
  name: string;
  format: ExportFormat;
  options: ExportTemplateOptions;
  createdAt: string;
  updatedAt: string;
}

export interface UseExportTemplatesOptions {
  autoFetch?: boolean;
}

export interface UseExportTemplatesReturn {
  templates: ExportTemplate[];
  loading: boolean;
  error: string;
  fetchTemplates: () => Promise<void>;
  createTemplate: (data: CreateTemplateInput) => Promise<ExportTemplate>;
  updateTemplate: (templateId: string, data: UpdateTemplateInput) => Promise<ExportTemplate>;
  deleteTemplate: (templateId: string) => Promise<void>;
  getTemplate: (templateId: string) => ExportTemplate | undefined;
}

export interface CreateTemplateInput {
  name: string;
  format: ExportFormat;
  options?: ExportTemplateOptions;
}

export interface UpdateTemplateInput {
  name?: string;
  options?: ExportTemplateOptions;
}

const MAX_TEMPLATE_NAME_LENGTH = 30;

export function useExportTemplates(
  options: UseExportTemplatesOptions = {}
): UseExportTemplatesReturn {
  const { autoFetch = true } = options;

  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchTemplates = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError('');

    try {
      const result = await client.GET('/api/me/export-templates');

      if (result.error) {
        const msg = (result.error as { detail?: string }).detail || '获取模板列表失败';
        setError(msg);
      } else {
        const data = result.data as { templates: ExportTemplate[] };
        setTemplates(data.templates || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '获取模板列表失败';
      setError(msg);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const createTemplate = useCallback(async (input: CreateTemplateInput): Promise<ExportTemplate> => {
    if (!input.name || !input.name.trim()) {
      throw new Error('模板名称不能为空');
    }
    if (input.name.length > MAX_TEMPLATE_NAME_LENGTH) {
      throw new Error(`模板名称不能超过${MAX_TEMPLATE_NAME_LENGTH}个字符`);
    }
    if (templates.length >= 20) {
      throw new Error('已达到模板数量上限（20个），请先删除不需要的模板');
    }

    const result = await client.POST('/api/me/export-templates', {
      body: {
        name: input.name.trim(),
        format: input.format,
        options: input.options || {},
      },
    });

    if (result.error) {
      const err = result.error as { detail?: string; code?: string };
      if (err.code === 'TEMPLATE_LIMIT_REACHED') {
        throw new Error('已达到模板数量上限（20个），请先删除不需要的模板');
      }
      const msg = err.detail || '创建模板失败';
      throw new Error(msg);
    }

    const newTemplate = result.data as ExportTemplate;
    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  }, [templates.length]);

  const updateTemplate = useCallback(async (templateId: string, input: UpdateTemplateInput): Promise<ExportTemplate> => {
    if (input.name !== undefined) {
      if (!input.name.trim()) {
        throw new Error('模板名称不能为空');
      }
      if (input.name.length > MAX_TEMPLATE_NAME_LENGTH) {
        throw new Error(`模板名称不能超过${MAX_TEMPLATE_NAME_LENGTH}个字符`);
      }
    }

    const result = await client.PATCH(`/api/me/export-templates/${templateId}`, {
      body: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.options !== undefined && { options: input.options }),
      },
    });

    if (result.error) {
      const msg = (result.error as { detail?: string }).detail || '更新模板失败';
      throw new Error(msg);
    }

    const updatedTemplate = result.data as ExportTemplate;
    setTemplates(prev => prev.map(t => t.id === templateId ? updatedTemplate : t));
    return updatedTemplate;
  }, []);

  const deleteTemplate = useCallback(async (templateId: string): Promise<void> => {
    const result = await client.DELETE(`/api/me/export-templates/${templateId}`);

    if (result.error) {
      const msg = (result.error as { detail?: string }).detail || '删除模板失败';
      throw new Error(msg);
    }

    setTemplates(prev => prev.filter(t => t.id !== templateId));
  }, []);

  const getTemplate = useCallback((templateId: string): ExportTemplate | undefined => {
    return templates.find(t => t.id === templateId);
  }, [templates]);

  useEffect(() => {
    if (autoFetch) {
      fetchTemplates();
    }
  }, [autoFetch, fetchTemplates]);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
  };
}