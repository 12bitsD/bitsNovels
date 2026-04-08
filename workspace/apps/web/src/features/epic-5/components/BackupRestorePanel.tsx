import { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Clock,
  FileArchive,
  AlertTriangle,
} from 'lucide-react';
import { client } from '../../../api/client';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingButton } from '../../../components/ui/LoadingButton';

interface BackupItem {
  id: string;
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
  createdAt: string;
}

interface BackupRestorePanelProps {
  projectId: string;
  projectName: string;
  isArchived?: boolean;
}

export function BackupRestorePanel({
  projectId,
  isArchived = false,
}: BackupRestorePanelProps) {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await client.GET(`/api/projects/${projectId}/backups`);
      if (result.error) {
        setError('获取备份列表失败');
      } else {
        const data = result.data as { items: BackupItem[] };
        setBackups(data.items || []);
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

  const handleCreateBackup = async () => {
    setCreating(true);
    setError('');

    try {
      const result = await client.POST(`/api/projects/${projectId}/backups/auto/trigger`);

      if (result.error) {
        const msg = (result.error as { detail?: string }).detail || '创建备份失败';
        setError(msg);
      } else {
        await fetchBackups();
      }
    } catch {
      setError('创建备份失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (backupId: string) => {
    window.open(`/api/projects/${projectId}/backups/${backupId}/download`, '_blank');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-ink">项目备份</h3>
          <p className="text-sm text-ink-light mt-1">
            创建和管理项目备份
          </p>
        </div>
        <LoadingButton
          loading={creating}
          loadingText="正在备份..."
          onClick={handleCreateBackup}
          disabled={isArchived}
        >
          <span className="flex items-center gap-2">
            <FileArchive size={16} />
            立即备份
          </span>
        </LoadingButton>
      </div>

      {error && <ErrorAlert error={error} onDismiss={() => setError('')} />}

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

      <div>
        <h4 className="font-medium text-ink mb-3 flex items-center gap-2">
          <Clock size={16} className="text-ink-light" />
          备份记录
        </h4>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-amber border-t-transparent rounded-full" />
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
                key={backup.id}
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
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(backup.id)}
                    className="p-2 text-ink-light hover:text-amber hover:bg-amber/10 rounded transition-colors"
                    aria-label="下载备份"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BackupRestorePanel;
