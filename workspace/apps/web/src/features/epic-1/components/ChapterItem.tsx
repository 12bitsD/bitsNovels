import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, FileText, Clock } from 'lucide-react';

export interface ChapterSummary {
  id: string;
  projectId: string;
  volumeId: string;
  title: string;
  order: number;
  chars: number;
  lastEditedAt?: string;
  parserStatus: 'parsed' | 'processing' | 'pending' | 'empty' | 'failed';
}

interface ChapterItemProps {
  chapter: ChapterSummary;
  isSelected: boolean;
  onSelect: (id: string, ctrlKey: boolean, shiftKey: boolean) => void;
  onDoubleClick: (id: string) => void;
}

export function ChapterItem({ chapter, isSelected, onSelect, onDoubleClick }: ChapterItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id, data: { type: 'chapter', chapter } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const handleClick = (e: React.MouseEvent) => {
    onSelect(chapter.id, e.ctrlKey || e.metaKey, e.shiftKey);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`chapter-item-${chapter.id}`}
      className={`group flex items-center gap-3 px-4 py-2.5 border-b border-parchment/50 hover:bg-ivory cursor-pointer transition-colors ${
        isSelected ? 'bg-amber-light/20 border-l-2 border-l-amber' : ''
      }`}
      onClick={handleClick}
      onDoubleClick={() => onDoubleClick(chapter.id)}
    >
      <button
        className="text-ink-light/40 hover:text-ink-light cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        data-testid="chapter-drag-handle"
        {...attributes}
        {...listeners}
        aria-label="拖动章节"
      >
        <GripVertical size={14} />
      </button>

      <FileText size={14} className="text-amber/60 flex-shrink-0" />

      <span className="flex-1 text-sm font-medium text-ink truncate">{chapter.title}</span>

      <div
        data-testid={`chapter-stats-${chapter.id}`}
        className="flex items-center gap-3 text-xs text-ink-light"
      >
        {chapter.chars > 0 && (
          <span className="font-mono">{chapter.chars.toLocaleString()}字</span>
        )}
        {chapter.lastEditedAt && (
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatDate(chapter.lastEditedAt)}
          </span>
        )}
      </div>
    </div>
  );
}
