import type { Snapshot, SnapshotType } from '../../hooks/useSnapshots';

export interface SnapshotListProps {
  snapshots: Snapshot[];
  selectedSnapshot: Snapshot | null;
  onSelect: (snapshot: Snapshot) => void;
  onDelete: (snapshotId: string) => void;
  onCompare: (snapshot: Snapshot) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (diffDays === 1) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }
}

function getSnapshotTypeLabel(type: SnapshotType): string {
  switch (type) {
    case 'manual':
      return '手动';
    case 'auto':
      return '自动';
    case 'daily':
      return '每日';
    case 'restore_backup':
      return '恢复备份';
    default:
      return '未知';
  }
}

function getSnapshotTypeStyles(type: SnapshotType): string {
  switch (type) {
    case 'manual':
      return 'bg-[#8B6914] text-white';
    case 'auto':
      return 'bg-[#D4C4A8] text-[#6B5D4D]';
    case 'daily':
      return 'bg-[#4A6B8B] text-white';
    case 'restore_backup':
      return 'bg-[#9B3D3D] text-white';
    default:
      return 'bg-gray-200 text-gray-600';
  }
}

export function SnapshotList({
  snapshots,
  selectedSnapshot,
  onSelect,
  onDelete,
  onCompare,
}: SnapshotListProps) {
  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#6B5D4D] dark:text-[#9B8E7A]">
        <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">暂无版本快照</p>
        <p className="text-xs mt-1 opacity-70">创建快照以保存当前版本</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {snapshots.map((snapshot) => {
        const isSelected = selectedSnapshot?.id === snapshot.id;

        return (
          <div
            key={snapshot.id}
            onClick={() => onSelect(snapshot)}
            className={`
              relative p-3 rounded-lg cursor-pointer transition-all
              ${isSelected
                ? 'bg-[#E8D9B8] dark:bg-[#3D362A] border border-[#8B6914]'
                : 'bg-white dark:bg-[#2D2820] border border-[#D4C4A8] dark:border-[#4A4235] hover:border-[#8B6914] hover:shadow-sm'
              }
            `}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`
                    inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded
                    ${getSnapshotTypeStyles(snapshot.type)}
                  `}>
                    {getSnapshotTypeLabel(snapshot.type)}
                  </span>
                  <span className="text-xs text-[#9B8E7A] dark:text-[#6B5D4D]">
                    {formatDate(snapshot.createdAt)}
                  </span>
                </div>

                {snapshot.label && (
                  <p className="text-sm font-medium text-[#2C2416] dark:text-[#E8DCC8] truncate">
                    {snapshot.label}
                  </p>
                )}

                <p className="text-xs text-[#6B5D4D] dark:text-[#9B8E7A] mt-1">
                  {snapshot.charCount.toLocaleString()} 字
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompare(snapshot);
                  }}
                  className="p-1.5 text-[#6B5D4D] hover:text-[#8B6914] dark:text-[#9B8E7A] dark:hover:text-[#D4A843] rounded transition-colors"
                  title="对比当前版本"
                  aria-label="对比当前版本"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>

                {snapshot.type === 'manual' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(snapshot.id);
                    }}
                    className="p-1.5 text-[#6B5D4D] hover:text-[#9B3D3D] dark:text-[#9B8E7A] dark:hover:text-[#C75B5B] rounded transition-colors"
                    title="删除快照"
                    aria-label="删除快照"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
