import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, Folder, Pencil, Trash2, Plus } from 'lucide-react';
import { ChapterItem } from './ChapterItem';
import type { Volume } from '@bitsnovels/api-types';

interface VolumeItemProps {
  volume: Volume;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  selectedChapters: Set<string>;
  onChapterSelect: (id: string, ctrlKey: boolean, shiftKey: boolean) => void;
  onChapterDoubleClick: (id: string) => void;
  onAddChapter: (volumeId: string) => void;
  onRenameVolume: (id: string, newName: string) => void;
  onDeleteVolume: (id: string) => void;
}

export function VolumeItem({
  volume,
  isExpanded,
  onToggle,
  selectedChapters,
  onChapterSelect,
  onChapterDoubleClick,
  onAddChapter,
  onRenameVolume,
  onDeleteVolume,
}: VolumeItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(volume.name);
  const [showActions, setShowActions] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: volume.id, data: { type: 'volume', volume } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRenameSubmit = () => {
    if (editName.trim() && editName !== volume.name) {
      onRenameVolume(volume.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setEditName(volume.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="border-b border-border/30">
      <div
        ref={setNodeRef}
        style={style}
        className="group flex items-center gap-2 px-3 py-3 bg-white/40 hover:bg-ivory transition-colors cursor-pointer"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onDoubleClick={() => setIsEditing(true)}
      >
        <button
          data-testid={`volume-drag-handle-${volume.id}`}
          className="text-ink-light/40 hover:text-ink-light cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
          aria-label="拖动卷"
        >
          <GripVertical size={16} />
        </button>

        <button
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `折叠${volume.name}` : `展开${volume.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(volume.id);
          }}
          className="p-0.5 hover:bg-amber-light/20 rounded transition-colors"
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <Folder size={16} className="text-amber/70 flex-shrink-0" />

        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-0.5 text-sm font-semibold bg-white border border-amber rounded focus:outline-none focus:ring-1 focus:ring-amber"
            maxLength={30}
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm font-semibold text-ink truncate">{volume.name}</span>
        )}

        <div
          data-testid={`volume-stats-${volume.id}`}
          className="flex items-center gap-2 text-xs text-ink-light font-mono mr-2"
        >
          <span>{volume.chapterCount}章</span>
          <span className="text-border">|</span>
          <span>{volume.totalChars.toLocaleString()}字</span>
        </div>

        {showActions && !isEditing && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChapter(volume.id);
              }}
              className="p-1.5 hover:bg-amber-light/30 rounded transition-colors"
              aria-label="添加章节"
              title="添加章节"
            >
              <Plus size={14} className="text-amber" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1.5 hover:bg-amber-light/30 rounded transition-colors"
              aria-label="重命名"
              title="重命名"
            >
              <Pencil size={14} className="text-ink-light" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteVolume(volume.id);
              }}
              className="p-1.5 hover:bg-error/10 rounded transition-colors"
              aria-label="删除卷"
              title="删除卷"
            >
              <Trash2 size={14} className="text-error/70" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="bg-parchment/30">
          {volume.chapters.map((chapter) => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              isSelected={selectedChapters.has(chapter.id)}
              onSelect={onChapterSelect}
              onDoubleClick={onChapterDoubleClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
