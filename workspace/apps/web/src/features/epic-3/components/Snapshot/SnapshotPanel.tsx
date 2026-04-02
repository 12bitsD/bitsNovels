import { useState } from 'react';
import { CreateSnapshot } from './CreateSnapshot';
import { SnapshotList } from './SnapshotList';
import { SnapshotDiff } from './SnapshotDiff';
import { RestoreConfirm } from './RestoreConfirm';
import { StorageStats } from './StorageStats';
import { useSnapshots, type Snapshot } from '../../hooks/useSnapshots';

export interface SnapshotPanelProps {
  projectId: string;
  chapterId: string;
  currentContent: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: () => void;
}

export function SnapshotPanel({
  projectId,
  chapterId,
  currentContent,
  isOpen,
  onClose,
  onRestore,
}: SnapshotPanelProps) {
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [compareSnapshot, setCompareSnapshot] = useState<Snapshot | null>(null);

  const {
    snapshots,
    loading,
    error,
    selectedSnapshot,
    createSnapshot,
    deleteSnapshot,
    restoreSnapshot,
    selectSnapshot,
    calculateStorageStats,
  } = useSnapshots({
    projectId,
    chapterId,
    autoFetch: isOpen,
    onRestore: () => {
      onRestore();
      setIsRestoreOpen(false);
    },
  });

  if (!isOpen) return null;

  const stats = calculateStorageStats();

  const handleSelectSnapshot = (snapshot: Snapshot) => {
    selectSnapshot(snapshot);
  };

  const handleCompare = (snapshot: Snapshot) => {
    setCompareSnapshot(snapshot);
    setIsDiffOpen(true);
  };

  const handleDelete = (snapshotId: string) => {
    if (window.confirm('确定要删除这个快照吗？此操作不可撤销。')) {
      deleteSnapshot(snapshotId);
    }
  };

  const handleRestore = (snapshot: Snapshot) => {
    selectSnapshot(snapshot);
    setIsRestoreOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (selectedSnapshot) {
      await restoreSnapshot(selectedSnapshot.id);
    }
  };

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-40 w-80 bg-white dark:bg-[#232019] border-l border-[#D4C4A8] dark:border-[#4A4235] shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#D4C4A8] dark:border-[#4A4235]">
          <h2 className="text-lg font-semibold text-[#2C2416] dark:text-[#E8DCC8]">
            版本历史
          </h2>
          <div className="flex items-center gap-2">
            <CreateSnapshot onCreate={createSnapshot} disabled={loading} />
            <button
              onClick={onClose}
              className="p-1.5 text-[#6B5D4D] hover:text-[#2C2416] dark:text-[#9B8E7A] dark:hover:text-[#E8DCC8] rounded transition-colors"
              aria-label="关闭面板"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && snapshots.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-6 h-6 animate-spin text-[#8B6914]" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="ml-2 text-sm text-[#6B5D4D] dark:text-[#9B8E7A]">加载中...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-[#9B3D3D]">
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <>
              <StorageStats
                totalSizeBytes={stats.totalSizeBytes}
                snapshotCount={stats.count}
              />

              {selectedSnapshot && (
                <div className="bg-[#E8D9B8] dark:bg-[#3D362A] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-[#2C2416] dark:text-[#E8DCC8]">
                      已选快照
                    </h4>
                    <button
                      onClick={() => selectSnapshot(null)}
                      className="text-[#6B5D4D] hover:text-[#2C2416] dark:text-[#9B8E7A] dark:hover:text-[#E8DCC8] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-[#6B5D4D] dark:text-[#9B8E7A] mb-2">
                    {new Date(selectedSnapshot.createdAt).toLocaleString()}
                  </p>
                  <button
                    onClick={() => handleRestore(selectedSnapshot)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#8B6914] hover:bg-[#6B5010] rounded transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    恢复到此版本
                  </button>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-[#6B5D4D] dark:text-[#9B8E7A] mb-3">
                  快照列表
                </h4>
                <SnapshotList
                  snapshots={snapshots}
                  selectedSnapshot={selectedSnapshot}
                  onSelect={handleSelectSnapshot}
                  onDelete={handleDelete}
                  onCompare={handleCompare}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {isDiffOpen && compareSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[rgba(44,36,22,0.5)]"
            onClick={() => setIsDiffOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-3xl h-[80vh] mx-4 bg-white dark:bg-[#2D2820] rounded-lg shadow-[0_8px_32px_rgba(44,36,22,0.18)] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4C4A8] dark:border-[#4A4235]">
              <div>
                <h3 className="text-lg font-semibold text-[#2C2416] dark:text-[#E8DCC8]">
                  版本对比
                </h3>
                <p className="text-xs text-[#6B5D4D] dark:text-[#9B8E7A] mt-0.5">
                  {compareSnapshot.label || '无标签'} · {new Date(compareSnapshot.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setIsDiffOpen(false)}
                className="p-1.5 text-[#6B5D4D] hover:text-[#2C2416] dark:text-[#9B8E7A] dark:hover:text-[#E8DCC8] rounded transition-colors"
                aria-label="关闭"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SnapshotDiff
                originalContent={compareSnapshot.content}
                snapshotContent={currentContent}
              />
            </div>
          </div>
        </div>
      )}

      {isRestoreOpen && selectedSnapshot && (
        <RestoreConfirm
          snapshot={selectedSnapshot}
          isOpen={isRestoreOpen}
          onClose={() => setIsRestoreOpen(false)}
          onConfirm={handleConfirmRestore}
        />
      )}
    </>
  );
}
