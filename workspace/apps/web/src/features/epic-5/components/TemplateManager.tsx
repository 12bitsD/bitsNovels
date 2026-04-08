import { useState, useCallback } from 'react';
import {
  FileText,
  Pencil,
  Trash2,
  X,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import {
  useExportTemplates,
  type ExportFormat,
  type ExportTemplate,
} from '../hooks/useExportTemplates';

const MAX_TEMPLATE_COUNT = 20;

const FORMAT_LABELS: Record<ExportFormat, string> = {
  docx: 'DOCX',
  txt: 'TXT',
  pdf: 'PDF',
  markdown: 'Markdown',
};

const FORMAT_COLORS: Record<ExportFormat, string> = {
  docx: 'bg-blue-100 text-blue-700',
  txt: 'bg-green-100 text-green-700',
  pdf: 'bg-red-100 text-red-700',
  markdown: 'bg-purple-100 text-purple-700',
};

interface TemplateManagerProps {
  onClose?: () => void;
}

export function TemplateManager({ onClose }: TemplateManagerProps) {
  const {
    templates,
    loading,
    error,
    updateTemplate,
    deleteTemplate,
  } = useExportTemplates({ autoFetch: true });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleStartRename = useCallback((template: ExportTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setActionError('');
  }, []);

  const handleCancelRename = useCallback(() => {
    setEditingId(null);
    setEditName('');
    setActionError('');
  }, []);

  const handleConfirmRename = useCallback(async () => {
    if (!editingId || !editName.trim()) return;

    if (editName.length > 30) {
      setActionError('模板名称不能超过30个字符');
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      await updateTemplate(editingId, { name: editName.trim() });
      setEditingId(null);
      setEditName('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '重命名失败';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }, [editingId, editName, updateTemplate]);

  const handleStartDelete = useCallback((template: ExportTemplate) => {
    setDeletingId(template.id);
    setDeletingName(template.name);
    setActionError('');
  }, []);

  const handleCancelDelete = useCallback(() => {
    setDeletingId(null);
    setDeletingName('');
    setActionError('');
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingId) return;

    setActionLoading(true);
    setActionError('');

    try {
      await deleteTemplate(deletingId);
      setDeletingId(null);
      setDeletingName('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除失败';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }, [deletingId, deleteTemplate]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-ink">导出模板管理</h3>
          <p className="text-sm text-ink-light mt-1">
            管理您的导出格式模板（最多 {MAX_TEMPLATE_COUNT} 个）
          </p>
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

      {/* Error display */}
      {error && <ErrorAlert error={error} onDismiss={() => {}} />}
      {actionError && (
        <ErrorAlert error={actionError} onDismiss={() => setActionError('')} />
      )}

      {/* Template count warning */}
      {templates.length >= MAX_TEMPLATE_COUNT && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-warning flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-medium text-warning">模板数量已达上限</p>
            <p className="text-sm text-ink-light mt-1">
              您已创建 {templates.length} 个模板（上限 {MAX_TEMPLATE_COUNT} 个）。
              如需创建新模板，请先删除不需要的模板。
            </p>
          </div>
        </div>
      )}

      {/* Template list */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-amber" />
            <span className="ml-2 text-ink-light">加载中...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-parchment/50 rounded-lg p-8 text-center">
            <FileText size={32} className="mx-auto text-ink-light/50 mb-2" />
            <p className="text-ink-light">暂无导出模板</p>
            <p className="text-sm text-ink-light/70 mt-1">
              在导出面板中保存当前配置为模板
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 bg-white/60 rounded-lg border border-border/50 hover:border-amber/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-amber" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === template.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={30}
                          className="input-base flex-1 px-2 py-1 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmRename();
                            if (e.key === 'Escape') handleCancelRename();
                          }}
                        />
                        <button
                          onClick={handleConfirmRename}
                          disabled={actionLoading || !editName.trim()}
                          className="p-1.5 text-success hover:bg-success/10 rounded transition-colors disabled:opacity-50"
                          aria-label="确认重命名"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={handleCancelRename}
                          disabled={actionLoading}
                          className="p-1.5 text-ink-light hover:text-ink hover:bg-ink/10 rounded transition-colors disabled:opacity-50"
                          aria-label="取消重命名"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink truncate">
                            {template.name}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${FORMAT_COLORS[template.format]}`}
                          >
                            {FORMAT_LABELS[template.format]}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-ink-light">
                          <span>更新于 {formatDate(template.updatedAt)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {editingId !== template.id && deletingId !== template.id && (
                  <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                    <button
                      onClick={() => handleStartRename(template)}
                      className="p-2 text-ink-light hover:text-amber hover:bg-amber/10 rounded transition-colors"
                      aria-label="重命名模板"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleStartDelete(template)}
                      className="p-2 text-ink-light hover:text-error hover:bg-error/10 rounded transition-colors"
                      aria-label="删除模板"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => !actionLoading && handleCancelDelete()}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-modal">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-error/10 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-error" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">确认删除</h3>
                </div>
              </div>
              <button
                onClick={handleCancelDelete}
                disabled={actionLoading}
                className="p-1.5 text-ink-light hover:text-ink rounded transition-colors disabled:opacity-50"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-ink">
                确定要删除模板 <span className="font-semibold">「{deletingName}」</span> 吗？
              </p>
              <p className="text-sm text-ink-light mt-2">
                此操作不可撤销。删除后，您将无法恢复该模板。
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/30">
              <button
                onClick={handleCancelDelete}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-ink-light hover:text-ink transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <LoadingButton
                loading={actionLoading}
                loadingText="删除中..."
                onClick={handleConfirmDelete}
              >
                <span className="flex items-center gap-2 text-error">
                  <Trash2 size={16} />
                  删除模板
                </span>
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateManager;
