import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import { useNotifications, type NotificationCenterCategory } from '../hooks/useNotifications';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<NotificationCenterCategory>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotifications(category);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;
  const hasUnread = unreadCount > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? '关闭通知面板' : '打开通知面板'}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`
          relative p-2 rounded-lg
          transition-colors duration-200
          ${isOpen 
            ? 'bg-[var(--color-ivory)] text-[var(--color-amber)]' 
            : 'text-[var(--color-ink-light)] hover:text-[var(--color-amber)] hover:bg-[var(--color-ivory)]'
          }
        `}
      >
        <Bell size={20} strokeWidth={1.5} />

        {hasUnread && (
          <span
            className="
              absolute -top-1 -right-1
              min-w-[18px] h-[18px]
              flex items-center justify-center
              px-1
              bg-red-500 text-white
              text-[10px] font-bold
              rounded-full
              animate-in fade-in zoom-in duration-200
            "
            aria-label={`${unreadCount}条未读通知`}
          >
            {displayCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPanel
          category={category}
          onCategoryChange={setCategory}
          variant="dropdown"
        />
      )}
    </div>
  );
}
