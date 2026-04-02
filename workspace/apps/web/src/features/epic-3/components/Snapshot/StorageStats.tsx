export interface StorageStatsProps {
  totalSizeBytes: number;
  snapshotCount: number;
  onCleanup?: () => void;
  isCleaning?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';

  const mb = bytes / (1024 * 1024);

  if (mb < 0.01) {
    return '< 0.01 MB';
  }

  return `${mb.toFixed(2)} MB`;
}

export function StorageStats({
  totalSizeBytes,
  snapshotCount,
  onCleanup,
  isCleaning = false,
}: StorageStatsProps) {
  return (
    <div className="bg-[#FDF8EF] dark:bg-[#1A1714] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-[#2C2416] dark:text-[#E8DCC8]">
          存储统计
        </h4>
        <svg className="w-4 h-4 text-[#6B5D4D] dark:text-[#9B8E7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white dark:bg-[#2D2820] rounded p-3">
          <p className="text-xs text-[#6B5D4D] dark:text-[#9B8E7A] mb-1">快照数量</p>
          <p className="text-lg font-semibold text-[#8B6914] dark:text-[#D4A843]">
            {snapshotCount}
          </p>
        </div>
        <div className="bg-white dark:bg-[#2D2820] rounded p-3">
          <p className="text-xs text-[#6B5D4D] dark:text-[#9B8E7A] mb-1">总大小</p>
          <p className="text-lg font-semibold text-[#8B6914] dark:text-[#D4A843]">
            {formatBytes(totalSizeBytes)}
          </p>
        </div>
      </div>

      {onCleanup && (
        <button
          onClick={onCleanup}
          disabled={isCleaning || snapshotCount === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[#6B5D4D] hover:text-[#8B6914] dark:text-[#9B8E7A] dark:hover:text-[#D4A843] border border-[#D4C4A8] dark:border-[#4A4235] hover:border-[#8B6914] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCleaning ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>清理中...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>清理旧快照</span>
            </>
          )}
        </button>
      )}

      <p className="mt-2 text-xs text-[#9B8E7A]">
        每章节最多保留50个自动快照，系统将自动清理过期快照
      </p>
    </div>
  );
}
