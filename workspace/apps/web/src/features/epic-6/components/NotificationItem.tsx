import { 
  CheckCircle, 
  XCircle, 
  Archive, 
  AlertTriangle, 
  AlertCircle,
  Trash2,
  Sparkles,
  FileText,
  BookOpen,
  Bell
} from 'lucide-react';
import type { Notification, NotificationType } from '../hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const TYPE_ICON_MAP: Record<NotificationType, { icon: typeof CheckCircle; label: string; color: string }> = {
  parse_done: { icon: Sparkles, label: 'AI解析', color: 'text-emerald-500' },
  parse_failed: { icon: XCircle, label: 'AI解析', color: 'text-red-500' },
  backup_done: { icon: Archive, label: '备份导出', color: 'text-blue-500' },
  backup_failed: { icon: AlertTriangle, label: '备份导出', color: 'text-orange-500' },
  export_done: { icon: FileText, label: '备份导出', color: 'text-blue-500' },
  consistency_issue: { icon: AlertCircle, label: '一致性', color: 'text-amber-500' },
  foreshadow_reminder: { icon: BookOpen, label: '伏笔', color: 'text-purple-500' },
  foreshadow_warning: { icon: AlertTriangle, label: '伏笔', color: 'text-orange-500' },
  recycle_expire: { icon: Trash2, label: '系统通知', color: 'text-gray-500' },
  snapshot_expire: { icon: Archive, label: '系统通知', color: 'text-gray-500' },
  storage_warning: { icon: AlertTriangle, label: '系统通知', color: 'text-yellow-500' },
  storage_critical: { icon: AlertCircle, label: '系统通知', color: 'text-red-500' },
  system_announcement: { icon: Bell, label: '系统通知', color: 'text-blue-500' },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const { icon: Icon, label, color } = TYPE_ICON_MAP[notification.type];

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <li
      role="listitem"
      onClick={handleClick}
      aria-label={`${notification.read ? '已读' : '未读'}通知: ${notification.title}`}
      className={`
        relative flex items-start gap-3 p-4 cursor-pointer
        border-b border-[var(--color-border)]/30
        transition-colors duration-200
        hover:bg-[var(--color-ivory)]
        ${notification.read ? 'opacity-60 bg-[var(--color-parchment)]' : 'font-medium bg-white'}
      `}
    >
      <div className={`flex-shrink-0 mt-0.5 ${color}`} aria-label={label}>
        <Icon size={20} strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm text-[var(--color-ink)] truncate">
            {notification.title}
          </h4>
          <span className="text-xs text-[var(--color-ink-light)] flex-shrink-0">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>

        <p className="text-sm text-[var(--color-ink-light)] mt-1 line-clamp-2">
          {notification.body}
        </p>
      </div>

      <button
        onClick={handleDelete}
        aria-label="删除通知"
        className="
          flex-shrink-0 p-1.5 rounded-md
          text-[var(--color-ink-light)]
          hover:text-red-500 hover:bg-red-50
          transition-colors duration-200
          opacity-0 group-hover:opacity-100
          focus:opacity-100
        "
      >
        <Trash2 size={14} strokeWidth={1.5} />
      </button>

      {!notification.read && (
        <span className="absolute top-4 right-4 w-2 h-2 bg-[var(--color-amber)] rounded-full" aria-hidden="true" />
      )}
    </li>
  );
}
