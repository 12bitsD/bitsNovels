import { useEffect, useRef } from 'react';
import { Pencil, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

interface ContextMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ChapterContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onRename: () => void;
  onInsertAbove: () => void;
  onInsertBelow: () => void;
  onDelete: () => void;
}

export function ChapterContextMenu({
  isOpen,
  position,
  onClose,
  onRename,
  onInsertAbove,
  onInsertBelow,
  onDelete,
}: ChapterContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuItems: ContextMenuItem[] = [
    {
      id: 'rename',
      label: '重命名',
      icon: <Pencil size={14} />,
      onClick: () => {
        onRename();
        onClose();
      },
    },
    {
      id: 'insert-above',
      label: '在上方插入章节',
      icon: <ArrowUp size={14} />,
      onClick: () => {
        onInsertAbove();
        onClose();
      },
    },
    {
      id: 'insert-below',
      label: '在下方插入章节',
      icon: <ArrowDown size={14} />,
      onClick: () => {
        onInsertBelow();
        onClose();
      },
    },
    {
      id: 'delete',
      label: '移入回收站',
      icon: <Trash2 size={14} />,
      onClick: () => {
        onDelete();
        onClose();
      },
      danger: true,
    },
  ];

  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 180),
    y: Math.min(position.y, window.innerHeight - 160),
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 bg-white rounded-md shadow-float border border-border/30 py-1 min-w-[160px]"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      {menuItems.map((item, index) => (
        <button
          key={item.id}
          role="menuitem"
          onClick={item.onClick}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
            item.danger
              ? 'text-error hover:bg-error/10'
              : 'text-ink hover:bg-amber-light/20'
          } ${index < menuItems.length - 1 ? 'border-b border-border/20' : ''}`}
        >
          <span className={item.danger ? 'text-error/70' : 'text-ink-light'}>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
