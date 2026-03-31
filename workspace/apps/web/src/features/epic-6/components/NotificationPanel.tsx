import { Loader2, Trash2, CheckCheck } from 'lucide-react';
import NotificationItem from './NotificationItem';
import { useNotifications, type NotificationCenterCategory } from '../hooks/useNotifications';

interface NotificationPanelProps {
  category: NotificationCenterCategory;
  onCategoryChange: (category: NotificationCenterCategory) => void;
  variant?: 'dropdown' | 'standalone';
}

const CATEGORY_TABS: { id: NotificationCenterCategory; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'ai_parse', label: 'AI解析' },
  { id: 'backup_export', label: '备份导出' },
  { id: 'consistency_foreshadow', label: '一致性' },
  { id: 'system', label: '系统' },
];

export default function NotificationPanel({
  category,
  onCategoryChange,
  variant = 'dropdown',
}: NotificationPanelProps) {
  const {
    notifications,
    loading,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
  } = useNotifications(category);

  const hasUnread = notifications.some(n => !n.read);
  const hasRead = notifications.some(n => n.read);

  const handleClearRead = () => {
    notifications
      .filter(n => n.read)
      .forEach(n => deleteNotification(n.id));
  };

  const containerClasses = variant === 'dropdown'
    ? 'absolute right-0 top-full mt-2 w-96 max-h-[600px] bg-white rounded-lg shadow-xl border border-[var(--color-border)] overflow-hidden z-50'
    : 'max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-[var(--color-border)] overflow-hidden';

  const renderContent = () => (
    <>
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)] bg-[var(--color-parchment)]">
        <h3 className="font-semibold text-[var(--color-ink)]">通知中心</h3>
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            disabled={!hasUnread}
            className="
              flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
              text-[var(--color-ink)] bg-white rounded-md
              hover:bg-[var(--color-ivory)]
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            <CheckCheck size={14} />
            全部已读
          </button>
          <button
            onClick={handleClearRead}
            disabled={!hasRead}
            className="
              flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
              text-[var(--color-ink)] bg-white rounded-md
              hover:bg-red-50 hover:text-red-600
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            <Trash2 size={14} />
            清空已读
          </button>
        </div>
      </div>

      <div className="flex border-b border-[var(--color-border)] bg-white">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onCategoryChange(tab.id)}
            role="tab"
            aria-selected={category === tab.id}
            className={`
              flex-1 py-2.5 px-1 text-sm font-medium
              transition-colors duration-200
              ${category === tab.id
                ? 'text-[var(--color-amber)] border-b-2 border-[var(--color-amber)]'
                : 'text-[var(--color-ink-light)] hover:text-[var(--color-ink)] hover:bg-[var(--color-ivory)]'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-y-auto max-h-[400px]">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-[var(--color-amber)]" size={24} />
            <span className="ml-2 text-[var(--color-ink-light)]">加载中...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-ink-light)]">
            <p>暂无通知</p>
            {category !== 'all' && (
              <p className="text-xs mt-1">该系统分类下暂无通知</p>
            )}
          </div>
        ) : (
          <ul role="list" className="divide-y divide-[var(--color-border)]/30">
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))}
          </ul>
        )}

        {hasMore && (
          <div className="p-3 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="
                px-4 py-2 text-sm text-[var(--color-ink-light)]
                hover:text-[var(--color-amber)]
                transition-colors duration-200
              "
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (variant === 'dropdown') {
    return (
      <div role="dialog" aria-label="通知面板" className={containerClasses}>
        {renderContent()}
      </div>
    );
  }

  return (
    <section aria-label="通知中心" className={containerClasses}>
      {renderContent()}
    </section>
  );
}
