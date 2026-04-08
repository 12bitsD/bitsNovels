import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Download,
  Clock,
  Check,
  X,
  Save,
  ChevronDown,
} from 'lucide-react';
import { client } from '../../../api/client';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import {
  useExportTemplates,
  type ExportFormat,
  type ExportTemplate,
} from '../hooks/useExportTemplates';

export type ExportScope = 'all' | 'volume' | 'chapter';

interface ExportTaskResponse {
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

interface ExportPanelProps {
  projectId: string;
  projectName: string;
  onClose?: () => void;
}

const FORMAT_LABELS: Record<ExportFormat, string> = {
  docx: 'DOCX',
  pdf: 'PDF',
  txt: 'TXT',
  markdown: 'Markdown',
};

const FORMAT_ICONS: Record<ExportFormat, typeof FileText> = {
  docx: FileText,
  pdf: FileText,
  txt: FileText,
  markdown: FileText,
};

export function ExportPanel({ projectId, projectName, onClose }: ExportPanelProps) {
  const { templates, loading: templatesLoading } = useExportTemplates({ autoFetch: true });
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);

  const [format, setFormat] = useState<ExportFormat>('docx');
  const [scope, setScope] = useState<ExportScope>('all');

  const [font, setFont] = useState('SimSun');
  const [fontSize, setFontSize] = useState('12');
  const [lineSpacing, setLineSpacing] = useState(1.75);
  const [includeVolumeTitle, setIncludeVolumeTitle] = useState(true);
  const [includeChapterNumber, setIncludeChapterNumber] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeAnnotations, setIncludeAnnotations] = useState(false);
  const [txtEncoding, setTxtEncoding] = useState<'utf8' | 'gbk'>('utf8');
  const [txtSeparator, setTxtSeparator] = useState<'blank' | 'line' | 'none'>('line');

  const [exporting, setExporting] = useState(false);
  const [currentTask, setCurrentTask] = useState<ExportTaskResponse | null>(null);
  const [exportError, setExportError] = useState('');

  const [history, setHistory] = useState<ExportTaskResponse[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState('');

  const { createTemplate } = useExportTemplates({ autoFetch: false });
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const result = await client.GET(`/api/projects/${projectId}/exports`);
      if (!result.error) {
        const data = result.data as { items: ExportTaskResponse[] };
        setHistory(data.items || []);
      }
    } catch {
      // Silent fail for history
    } finally {
      setLoadingHistory(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Poll task status
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
      // Silent fail during polling
    }
  }, [projectId, fetchHistory]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleApplyTemplate = (template: ExportTemplate) => {
    setSelectedTemplate(template);
    setFormat(template.format);
    if (template.options) {
      setFont(template.options.font || 'SimSun');
      setFontSize(template.options.fontSize || '12');
      setLineSpacing(template.options.lineSpacing || 1.75);
      setIncludeVolumeTitle(template.options.includeVolumeTitle ?? true);
      setIncludeChapterNumber(template.options.includeChapterNumber ?? true);
      setIncludeNotes(template.options.includeNotes ?? false);
      setIncludeAnnotations(template.options.includeAnnotations ?? false);
      setTxtEncoding(template.options.txtEncoding || 'utf8');
      setTxtSeparator(template.options.txtSeparator || 'line');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    setCurrentTask(null);

    try {
      const result = await client.POST(`/api/projects/${projectId}/exports`, {
        body: {
          format,
          scope,
        },
      });

      if (result.error) {
        const msg = (result.error as { detail?: string }).detail || '导出失败';
        setExportError(msg);
        setExporting(false);
        return;
      }

      const data = result.data as { taskId: string; status: string };
      
      // Start polling
      pollIntervalRef.current = setInterval(() => {
        pollTaskStatus(data.taskId);
      }, 1000);

      // Initial status fetch
      await pollTaskStatus(data.taskId);
    } catch {
      setExportError('导出失败');
    } finally {
      setExporting(false);
    }
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
        format,
        options: {
          font,
          fontSize,
          lineSpacing,
          includeVolumeTitle,
          includeChapterNumber,
          includeNotes,
          includeAnnotations,
          txtEncoding,
          txtSeparator,
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

  const handleDownload = (taskId: string) => {
    window.open(`/api/projects/${projectId}/exports/${taskId}/download`, '_blank');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const FormatIcon = FORMAT_ICONS[format];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-ink">导出作品</h3>
          <p className="text-sm text-ink-light mt-1">{projectName}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-ink-light hover:text-ink hover:bg-ink/10 rounded transition-colors"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <select
            value={selectedTemplate?.id || ''}
            onChange={(e) => {
              const template = templates.find((t) => t.id === e.target.value);
              if (template) handleApplyTemplate(template);
              else setSelectedTemplate(null);
            }}
            disabled={templatesLoading}
            className="input-base w-full appearance-none pr-10"
          >
            <option value="">选择模板（可选）</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({FORMAT_LABELS[template.format]})
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light pointer-events-none"
          />
        </div>
        <button
          onClick={() => setShowSaveModal(true)}
          className="btn-secondary flex items-center gap-2"
          disabled={exporting}
        >
          <Save size={16} />
          存为模板
        </button>
      </div>

      {exportError && <ErrorAlert error={exportError} onDismiss={() => setExportError('')} />}

      <div>
        <label className="block text-sm font-medium text-ink mb-2">导出格式</label>
        <div className="grid grid-cols-4 gap-2">
          {(['docx', 'pdf', 'txt', 'markdown'] as ExportFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                format === f
                  ? 'border-amber bg-amber/5'
                  : 'border-border/50 hover:border-amber/30'
              }`}
            >
              <div className="text-sm font-medium text-ink">{FORMAT_LABELS[f]}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-2">导出范围</label>
        <div className="flex gap-2">
          {[
            { key: 'all', label: '全书' },
            { key: 'volume', label: '指定卷' },
            { key: 'chapter', label: '指定章节' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key as ExportScope)}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                scope === s.key
                  ? 'border-amber bg-amber/5 text-ink'
                  : 'border-border/50 hover:border-amber/30 text-ink-light'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {(format === 'docx' || format === 'pdf') && (
        <div className="bg-parchment/50 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-ink">格式配置</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-ink-light mb-1">字体</label>
              <select value={font} onChange={(e) => setFont(e.target.value)} className="input-base w-full text-sm">
                <option value="SimSun">宋体</option>
                <option value="SimHei">黑体</option>
                <option value="KaiTi">楷体</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink-light mb-1">字号</label>
              <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="input-base w-full text-sm">
                <option value="10">10pt</option>
                <option value="12">12pt</option>
                <option value="14">14pt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink-light mb-1">行距</label>
              <select
                value={lineSpacing}
                onChange={(e) => setLineSpacing(Number(e.target.value))}
                className="input-base w-full text-sm"
              >
                <option value={1.5}>1.5倍</option>
                <option value={1.75}>1.75倍</option>
                <option value={2.0}>2.0倍</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={includeVolumeTitle}
                onChange={(e) => setIncludeVolumeTitle(e.target.checked)}
                className="rounded border-border text-amber focus:ring-amber"
              />
              包含卷标题页
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={includeChapterNumber}
                onChange={(e) => setIncludeChapterNumber(e.target.checked)}
                className="rounded border-border text-amber focus:ring-amber"
              />
              包含章节编号
            </label>
          </div>
        </div>
      )}

      {format === 'txt' && (
        <div className="bg-parchment/50 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-ink">TXT 配置</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ink-light mb-1">编码</label>
              <select
                value={txtEncoding}
                onChange={(e) => setTxtEncoding(e.target.value as 'utf8' | 'gbk')}
                className="input-base w-full text-sm"
              >
                <option value="utf8">UTF-8</option>
                <option value="gbk">GBK</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink-light mb-1">章节分隔</label>
              <select
                value={txtSeparator}
                onChange={(e) => setTxtSeparator(e.target.value as 'blank' | 'line' | 'none')}
                className="input-base w-full text-sm"
              >
                <option value="blank">空行</option>
                <option value="line">分隔线</option>
                <option value="none">无分隔</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="bg-parchment/50 rounded-lg p-4">
        <h4 className="font-medium text-ink mb-3">内容控制</h4>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
              className="rounded border-border text-amber focus:ring-amber"
            />
            包含章节备注
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={includeAnnotations}
              onChange={(e) => setIncludeAnnotations(e.target.checked)}
              className="rounded border-border text-amber focus:ring-amber"
            />
            包含批注
          </label>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <LoadingButton
          loading={exporting}
          loadingText={currentTask?.status === 'generating' ? `导出中...${currentTask.progress}%` : '创建任务中...'}
          onClick={handleExport}
          className="flex-1"
        >
          <span className="flex items-center justify-center gap-2">
            <FormatIcon size={18} />
            开始导出
          </span>
        </LoadingButton>
      </div>

      {currentTask && currentTask.status === 'done' && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Check size={20} className="text-success" />
            </div>
            <div>
              <p className="font-medium text-success">导出完成</p>
              <p className="text-sm text-ink-light">{FORMAT_LABELS[format]} 格式</p>
              {currentTask.expiresAt && (
                <p className="text-xs text-ink-light/70">
                  有效期至: {formatDate(currentTask.expiresAt)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => handleDownload(currentTask.id)}
            className="btn-primary flex items-center gap-2"
          >
            <Download size={16} />
            下载文件
          </button>
        </div>
      )}

      {currentTask && currentTask.status === 'failed' && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="font-medium text-error">导出失败</p>
          <p className="text-sm text-ink-light mt-1">请重试或联系管理员</p>
        </div>
      )}

      <div className="border-t border-border/30 pt-6">
        <h4 className="font-medium text-ink mb-3 flex items-center gap-2">
          <Clock size={16} className="text-ink-light" />
          最近导出记录
        </h4>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin h-5 w-5 border-2 border-amber border-t-transparent rounded-full" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-ink-light">暂无导出记录</p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-white/40 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      item.format === 'docx'
                        ? 'bg-blue-100 text-blue-700'
                        : item.format === 'pdf'
                        ? 'bg-red-100 text-red-700'
                        : item.format === 'txt'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {FORMAT_LABELS[item.format]}
                  </span>
                  <span className="text-sm text-ink-light">{formatDate(item.createdAt)}</span>
                  {item.status === 'done' && <Check size={14} className="text-success" />}
                  {item.status === 'failed' && <X size={14} className="text-error" />}
                </div>
                {item.status === 'done' && item.fileUrl && (
                  <button
                    onClick={() => handleDownload(item.id)}
                    className="p-1.5 text-ink-light hover:text-amber hover:bg-amber/10 rounded transition-colors"
                    aria-label="下载"
                  >
                    <Download size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => !savingTemplate && setShowSaveModal(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-modal">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <h3 className="text-lg font-bold text-ink">保存为模板</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={savingTemplate}
                className="p-1.5 text-ink-light hover:text-ink rounded transition-colors disabled:opacity-50"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {templateError && <ErrorAlert error={templateError} onDismiss={() => setTemplateError('')} />}

              <div>
                <label className="block text-sm font-medium text-ink mb-1">模板名称</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  maxLength={30}
                  placeholder="输入模板名称"
                  className="input-base w-full"
                  autoFocus
                />
                <p className="text-xs text-ink-light mt-1">{templateName.length}/30 字符</p>
              </div>

              <div className="bg-parchment/50 rounded-lg p-3 text-sm text-ink-light">
                <p>将保存当前格式配置：</p>
                <ul className="mt-1 space-y-1">
                  <li>格式：{FORMAT_LABELS[format]}</li>
                  {(format === 'docx' || format === 'pdf') && (
                    <>
                      <li>字体：{font}</li>
                      <li>字号：{fontSize}pt</li>
                      <li>行距：{lineSpacing}倍</li>
                    </>
                  )}
                  {format === 'txt' && (
                    <>
                      <li>编码：{txtEncoding.toUpperCase()}</li>
                      <li>分隔：{txtSeparator === 'blank' ? '空行' : txtSeparator === 'line' ? '分隔线' : '无'}</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/30">
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={savingTemplate}
                className="px-4 py-2 text-sm font-medium text-ink-light hover:text-ink transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <LoadingButton
                loading={savingTemplate}
                loadingText="保存中..."
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
              >
                <span className="flex items-center gap-2">
                  <Save size={16} />
                  保存模板
                </span>
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExportPanel;
