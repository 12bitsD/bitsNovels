import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Clock,
  HardDrive,
  FileArchive,
  AlertTriangle,
  Check,
  Loader2,
  X,
} from 'lucide-react';
import { client } from '../../../api/client';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingButton } from '../../../components/ui/LoadingButton';

// Types based on contract.md
export interface ProjectBackupManifest {
  version: string;
  backupType: 'manual' | 'auto';
  projectId: string;
  projectName: string;
  exportedAt: string;
  counts: {
    volumes: number;
    chapters: number;
    knowledgeBaseEntries: number;
    snapshots: number;
    annotations: number;
  };
}

export interface RestorePreview {
  projectName: string;
  totalChars: number;
  chapterCount: number;
  knowledgeBaseCount: number;
  backupDate: string;
  fileSize: number;
}

type RestoreMode = 'create_new' | 'overwrite';

interface BackupRestorePanelProps {
  projectId: string;
  projectName: string;
  isArchived?: boolean;
}

export function BackupRestorePanel({
  projectId,
  projectName,
  isArchived = false,
}: BackupRestorePanelProps) {
  const [backups, setBackups] = useState<ProjectBackupManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [error, setError] = useState('');

  // Restore modal state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('create_new');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [confirmProjectName, setConfirmProjectName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch backup list
  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await client.GET(`/api/projects/${projectId}/backups`);
      if (result.error) {
        setError('获取备份列表失败');
      } else {
        setBackups(result.data as ProjectBackupManifest[]);
      }
    } catch {
      setError('获取备份列表失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  // Create manual backup
  const handleCreateBackup = async () => {
    setCreating(true);
    setCreateProgress(0);
    setError('');

    // Simulate progress
    const progressInterval = setInterval(() => {
      setCreateProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 300);

    try {
      const result = await client.POST(`/api/projects/${projectId}/backups`);
      clearInterval(progressInterval);

      if (result.error) {
        const msg = (result.error as { detail?: string }).detail || '创建备份失败';
        setError(msg);
      } else {
        setCreateProgress(100);
        await fetchBackups();
      }
    } catch {
      clearInterval(progressInterval);
      setError('创建备份失败');
    } finally {
      setCreating(false);
      setCreateProgress(0);
    }
  };

  // Download backup
  const handleDownload = (backup: ProjectBackupManifest) => {
    window.open(
      `/api/projects/${projectId}/backups/${backup.version}/download`,
      '_blank'
    );
  };

  // Handle file selection for restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        setPreviewError('请选择 ZIP 格式的备份文件');
        setSelectedFile(null);
        setPreview(null);
        return;
      }
      setSelectedFile(file);
      setPreviewError('');
      // Trigger preview
      previewRestore(file);
    }
  };

  // Preview restore
  const previewRestore = async (file: File) => {
    setLoadingPreview(true);
    setPreviewError('');
    setPreview(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // For preview, we use the same endpoint but with preview param
      const response = await fetch(
        `/api/projects/${projectId}/backups/restore?preview=true`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const msg = (data as { detail?: string }).detail || '备份文件无效或已损坏';
        setPreviewError(msg);
        return;
      }

      const data = await response.json();
      setPreview(data as RestorePreview);
    } catch {
      setPreviewError('备份文件无效或已损坏');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Submit restore
  const handleRestore = async () => {
    if (!selectedFile) return;

    if (restoreMode === 'overwrite' && confirmProjectName !== projectName) {
      setRestoreError(`请输入正确的项目名称「${projectName}」以确认`);
      return;
    }

    setRestoring(true);
    setRestoreError('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('mode', restoreMode);

    try {
      const response = await fetch(`/api/projects/${projectId}/backups/restore`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const msg = (data as { detail?: string }).detail || '恢复失败';
        setRestoreError(msg);
        return;
      }

      // Success - close modal and refresh
      setShowRestoreModal(false);
      setSelectedFile(null);
      setPreview(null);
      setConfirmProjectName('');
      setRestoreMode('create_new');
      await fetchBackups();
    } catch {
      setRestoreError('恢复失败');
    } finally {
      setRestoring(false);
    }
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format date
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
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-ink">手动备份</h3>
          <p className="text-sm text-ink-light mt-1">
            创建项目完整备份，可用于迁移或恢复
          </p>
        </div>
        <LoadingButton
          loading={creating}
          loadingText={`正在打包...${createProgress}%`}
          onClick={handleCreateBackup}
          disabled={isArchived}
        >
          <span className="flex items-center gap-2">
            <FileArchive size={16} />
            手动备份
          </span>
        </LoadingButton>
      </div>

      {error && <ErrorAlert error={error} onDismiss={() => setError('')} />}

      {/* Archived notice */}
      {isArchived && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-warning flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-medium text-warning">自动备份已暂停</p>
            <p className="text-sm text-ink-light mt-1">
              归档项目的自动备份已暂停。恢复活跃后，自动备份将继续。
            </p>
          </div>
        </div>
      )}

      {/* Backup List */}
      <div>
        <h4 className="font-medium text-ink mb-3 flex items-center gap-2">
          <Clock size={16} className="text-ink-light" />
          备份记录
        </h4>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-amber" />
            <span className="ml-2 text-ink-light">加载中...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="bg-parchment/50 rounded-lg p-8 text-center">
            <FileArchive size={32} className="mx-auto text-ink-light/50 mb-2" />
            <p className="text-ink-light">暂无备份记录</p>
            <p className="text-sm text-ink-light/70 mt-1">
              点击上方按钮创建第一个备份
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => (
              <div
                key={backup.version}
                className="flex items-center justify-between p-4 bg-white/60 rounded-lg border border-border/50 hover:border-amber/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center">
                    <FileArchive size={20} className="text-amber" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">
                        {backup.backupType === 'manual' ? '手动备份' : '自动备份'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber/10 text-amber">
                        v{backup.version}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-ink-light">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(backup.exportedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive size={12} />
                        {formatSize(backup.counts.volumes * 1000 + backup.counts.chapters * 500)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(backup)}
                    className="p-2 text-ink-light hover:text-amber hover:bg-amber/10 rounded transition-colors"
                    aria-label="下载备份"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => setShowRestoreModal(true)}
                    className="p-2 text-ink-light hover:text-amber hover:bg-amber/10 rounded transition-colors"
                    aria-label="恢复备份"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore from Backup Section */}
      <div className="border-t border-border/30 pt-6">
        <h4 className="font-medium text-ink mb-3 flex items-center gap-2">
          <Upload size={16} className="text-ink-light" />
          从备份恢复
        </h4>
        <p className="text-sm text-ink-light mb-4">
          上传备份 ZIP 文件，选择恢复模式来恢复项目数据
        </p>
        <button
          onClick={() => setShowRestoreModal(true)}
          className="btn-secondary w-auto px-6"
        >
          <span className="flex items-center gap-2">
            <Upload size={16} />
            上传备份文件
          </span>
        </button>
      </div>

      {/* Restore Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={() => !restoring && setShowRestoreModal(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-modal flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <div>
                <h3 className="text-lg font-bold text-ink">从备份恢复</h3>
                <p className="text-xs text-ink-light mt-0.5">
                  {restoreMode === 'create_new' ? '创建为新项目' : '覆盖当前项目'}
                </p>
              </div>
              <button
                onClick={() => setShowRestoreModal(false)}
                disabled={restoring}
                className="p-1.5 text-ink-light hover:text-ink rounded transition-colors disabled:opacity-50"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Restore Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  恢复模式
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRestoreMode('create_new')}
                    disabled={restoring}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      restoreMode === 'create_new'
                        ? 'border-amber bg-amber/5'
                        : 'border-border/50 hover:border-amber/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {restoreMode === 'create_new' && (
                        <Check size={16} className="text-amber" />
                      )}
                      <span className="font-medium text-ink">创建为新项目</span>
                    </div>
                    <p className="text-xs text-ink-light">
                      将备份数据导入为新项目，不影响现有数据
                    </p>
                  </button>
                  <button
                    onClick={() => setRestoreMode('overwrite')}
                    disabled={restoring}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      restoreMode === 'overwrite'
                        ? 'border-error bg-error/5'
                        : 'border-border/50 hover:border-error/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {restoreMode === 'overwrite' && (
                        <AlertTriangle size={16} className="text-error" />
                      )}
                      <span className="font-medium text-ink">覆盖当前项目</span>
                    </div>
                    <p className="text-xs text-ink-light">
                      用备份数据替换当前项目内容，不可撤销
                    </p>
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  选择备份文件
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  disabled={restoring}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={restoring}
                  className="w-full p-6 border-2 border-dashed border-border rounded-lg hover:border-amber/50 transition-colors disabled:opacity-50"
                >
                  <FileArchive
                    size={32}
                    className="mx-auto text-ink-light/50 mb-2"
                  />
                  <p className="text-sm text-ink-light">
                    {selectedFile ? selectedFile.name : '点击选择 ZIP 备份文件'}
                  </p>
                  <p className="text-xs text-ink-light/70 mt-1">
                    支持 .zip 格式的备份文件
                  </p>
                </button>
              </div>

              {/* Preview */}
              {loadingPreview && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={24} className="animate-spin text-amber" />
                  <span className="ml-2 text-ink-light">正在解析备份文件...</span>
                </div>
              )}

              {previewError && (
                <div className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="text-error flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-error">{previewError}</p>
                </div>
              )}

              {preview && !loadingPreview && (
                <div className="bg-parchment/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-ink">备份摘要</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-ink-light">项目名称</p>
                      <p className="font-medium text-ink">{preview.projectName}</p>
                    </div>
                    <div>
                      <p className="text-ink-light">备份日期</p>
                      <p className="font-medium text-ink">
                        {formatDate(preview.backupDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-light">总字数</p>
                      <p className="font-medium text-ink">
                        {preview.totalChars.toLocaleString()} 字
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-light">章节数</p>
                      <p className="font-medium text-ink">{preview.chapterCount} 章</p>
                    </div>
                    <div>
                      <p className="text-ink-light">知识库条目</p>
                      <p className="font-medium text-ink">
                        {preview.knowledgeBaseCount} 条
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-light">文件大小</p>
                      <p className="font-medium text-ink">
                        {formatSize(preview.fileSize)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Overwrite Confirmation */}
              {restoreMode === 'overwrite' && preview && (
                <div className="bg-error/5 border border-error/20 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="text-error flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="font-medium text-error">危险操作</p>
                      <p className="text-sm text-ink-light mt-1">
                        覆盖操作将用备份数据替换「{projectName}」的所有内容，包括所有章节、知识库和设置。此操作不可撤销。
                      </p>
                    </div>
                  </div>
                  <label className="block">
                    <span className="text-sm text-ink-light mb-1">
                      输入「{projectName}」确认：
                    </span>
                    <input
                      type="text"
                      value={confirmProjectName}
                      onChange={(e) => setConfirmProjectName(e.target.value)}
                      disabled={restoring}
                      placeholder="输入项目名称确认"
                      className="input-base mt-1"
                    />
                  </label>
                </div>
              )}

              {restoreError && (
                <ErrorAlert error={restoreError} onDismiss={() => setRestoreError('')} />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/30">
              <button
                onClick={() => setShowRestoreModal(false)}
                disabled={restoring}
                className="px-4 py-2 text-sm font-medium text-ink-light hover:text-ink transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <LoadingButton
                loading={restoring}
                loadingText="恢复中..."
                onClick={handleRestore}
                disabled={
                  !preview ||
                  !selectedFile ||
                  (restoreMode === 'overwrite' && confirmProjectName !== projectName)
                }
              >
                <span className="flex items-center gap-2">
                  <RefreshCw size={16} />
                  确认恢复
                </span>
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}