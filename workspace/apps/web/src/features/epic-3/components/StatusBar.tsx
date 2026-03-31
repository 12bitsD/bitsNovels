import type { SaveStatus } from '../hooks/useAutoSave';

export interface StatusBarProps {
  wordCount: number;
  selectionCount: number;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
}

export function StatusBar({ wordCount, selectionCount, saveStatus, lastSavedAt }: StatusBarProps) {
  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return '保存中...';
      case 'saved':
        if (lastSavedAt) {
          const hours = lastSavedAt.getHours().toString().padStart(2, '0');
          const minutes = lastSavedAt.getMinutes().toString().padStart(2, '0');
          return `已保存 ${hours}:${minutes}`;
        }
        return '已保存';
      case 'error':
        return '保存失败';
      default:
        return '';
    }
  };

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <span className="inline-block w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        );
      case 'saved':
        return (
          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-gray-800 border-t border-amber-200 dark:border-gray-700 text-sm">
      <div className="flex items-center gap-4">
        <span className="text-ink-light dark:text-gray-400">
          字数: <span className="font-mono font-medium text-ink dark:text-gray-200">{wordCount}</span>
        </span>
        {selectionCount > 0 && (
          <span className="text-ink-light dark:text-gray-400">
            选中: <span className="font-mono font-medium text-amber-600 dark:text-amber-400">{selectionCount}</span>
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-ink-light dark:text-gray-400">
        {getSaveStatusIcon()}
        <span>{getSaveStatusText()}</span>
      </div>
    </div>
  );
}
