import { useState } from 'react';
import type { Snapshot } from '../../hooks/useSnapshots';

export interface RestoreConfirmProps {
  snapshot: Snapshot;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function RestoreConfirm({ snapshot, isOpen, onClose, onConfirm }: RestoreConfirmProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsRestoring(true);
    setError('');

    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '恢复失败';
      setError(msg);
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-[rgba(44,36,22,0.5)]"
        onClick={!isRestoring ? onClose : undefined}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-[#2D2820] rounded-lg shadow-[0_8px_32px_rgba(44,36,22,0.18)]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#D4C4A8] dark:border-[#4A4235]">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#9B3D3D]/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#9B3D3D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#2C2416] dark:text-[#E8DCC8]">
              恢复到此版本
            </h3>
            <p className="text-xs text-[#6B5D4D] dark:text-[#9B8E7A]">
              此操作不可撤销
            </p>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="bg-[#FDF8EF] dark:bg-[#1A1714] rounded-lg p-4 mb-4">
            <p className="text-sm text-[#6B5D4D] dark:text-[#9B8E7A] mb-2">
              您即将恢复到以下版本：
            </p>
            <div className="space-y-1">
              {snapshot.label && (
                <p className="text-sm font-medium text-[#2C2416] dark:text-[#E8DCC8]">
                  标签：{snapshot.label}
                </p>
              )}
              <p className="text-sm text-[#2C2416] dark:text-[#E8DCC8]">
                时间：{formatDate(snapshot.createdAt)}
              </p>
              <p className="text-sm text-[#2C2416] dark:text-[#E8DCC8]">
                字数：{snapshot.charCount.toLocaleString()} 字
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 text-[#9B3D3D]">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">
              恢复后，当前版本的内容将被替换。系统会自动创建一个恢复备份，您可以在快照列表中找到它。
            </p>
          </div>

          {error && (
            <div className="mt-4 px-3 py-2 bg-[#9B3D3D]/10 border border-[#9B3D3D]/20 rounded text-sm text-[#9B3D3D]">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#D4C4A8] dark:border-[#4A4235]">
          <button
            onClick={onClose}
            disabled={isRestoring}
            className="px-4 py-2 text-sm font-medium text-[#6B5D4D] hover:text-[#2C2416] dark:text-[#9B8E7A] dark:hover:text-[#E8DCC8] transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isRestoring}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#9B3D3D] hover:bg-[#7A2D2D] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRestoring ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>恢复中...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>确认恢复</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
