import { useState } from 'react';
import { useExportTaskManager } from './useExportTaskManager';
import { useExportTemplates, type ExportTemplate } from './useExportTemplates';

export function useExportPanelState(projectId: string) {
  const { templates, loading: templatesLoading, createTemplate } = useExportTemplates({ autoFetch: true });
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);

  const taskManager = useExportTaskManager(projectId);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState('');

  const handleApplyTemplate = (template: ExportTemplate) => {
    setSelectedTemplate(template);
    taskManager.applyTemplate(template);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setTemplateError('模板名称不能为空');
      return;
    }
    if (templateName.length > 30) {
      setTemplateError('模板名称不能超过30个字符');
      return;
    }

    setSavingTemplate(true);
    setTemplateError('');

    try {
      await createTemplate({
        name: templateName.trim(),
        format: taskManager.config.format,
        options: {
          font: taskManager.config.font,
          fontSize: taskManager.config.fontSize,
          lineSpacing: taskManager.config.lineSpacing,
          includeVolumeTitle: taskManager.config.includeVolumeTitle,
          includeChapterNumber: taskManager.config.includeChapterNumber,
          includeNotes: taskManager.config.includeNotes,
          includeAnnotations: taskManager.config.includeAnnotations,
          txtEncoding: taskManager.config.txtEncoding,
          txtSeparator: taskManager.config.txtSeparator,
        },
      });
      setShowSaveModal(false);
      setTemplateName('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存模板失败';
      setTemplateError(msg);
    } finally {
      setSavingTemplate(false);
    }
  };

  return {
    taskManager,
    templates,
    templatesLoading,
    selectedTemplate,
    setSelectedTemplate,
    showSaveModal,
    setShowSaveModal,
    templateName,
    setTemplateName,
    savingTemplate,
    templateError,
    setTemplateError,
    handleApplyTemplate,
    handleSaveTemplate,
  };
}
