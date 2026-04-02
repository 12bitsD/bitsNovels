import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Folder,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  XCircle,
  Minus,
} from 'lucide-react';
import type { ChapterSummary, Volume } from '../../hooks/useChapterPanel';

interface ChapterTreeItemProps {
  chapter: ChapterSummary;
  isActive: boolean;
  isEditing: boolean;
  editValue: string;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onRenameSubmit: (newTitle: string) => void;
  onRenameCancel: () => void;
  onEditValueChange: (value: string) => void;
}

function ChapterTreeItem({
  chapter,
  isActive,
  isEditing,
  editValue,
  onSelect,
  onContextMenu,
  onRenameSubmit,
  onRenameCancel,
  onEditValueChange,
}: ChapterTreeItemProps) {
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

  const getParserStatusIcon = () => {
    switch (chapter.parserStatus) {
      case 'parsed':
        return <CheckCircle2 size={12} className="text-success" aria-label="已解析" />;
      case 'parsing':
        return <Loader2 size={12} className="text-amber animate-spin" aria-label="解析中" />;
      case 'pending':
        return <AlertCircle size={12} className="text-warning" aria-label="待解析" />;
      case 'failed':
        return <XCircle size={12} className="text-error" aria-label="解析失败" />;
      case 'empty':
      default:
        return <Minus size={12} className="text-ink-light/50" aria-label="无内容" />;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRenameSubmit(editValue);
    } else if (e.key === 'Escape') {
      onRenameCancel();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`chapter-item-${chapter.id}`}
      className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
        isActive
          ? 'bg-amber-light/20 border-l-2 border-l-amber'
          : 'hover:bg-amber-light/10 border-l-2 border-l-transparent'
      }`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <button
        className="text-ink-light/40 hover:text-ink-light cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="拖动排序"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      <FileText size={14} className="text-amber/60 flex-shrink-0" />

      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onRenameSubmit(editValue)}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 px-2 py-0.5 text-sm bg-white border border-amber rounded focus:outline-none focus:ring-1 focus:ring-amber"
          maxLength={50}
          autoFocus
        />
      ) : (
        <span className="flex-1 text-sm text-ink truncate">{chapter.title}</span>
      )}

      <div className="flex items-center gap-2 text-xs text-ink-light">
        {chapter.charCount > 0 && (
          <span className="font-mono">{chapter.charCount.toLocaleString()}字</span>
        )}
        {getParserStatusIcon()}
      </div>
    </div>
  );
}

interface VolumeTreeItemProps {
  volume: Volume;
  isExpanded: boolean;
  activeChapterId: string | null;
  editingChapterId: string | null;
  editValue: string;
  onToggle: () => void;
  onChapterSelect: (chapterId: string) => void;
  onChapterContextMenu: (e: React.MouseEvent, chapter: ChapterSummary) => void;
  onChapterRenameSubmit: (chapterId: string, newTitle: string) => void;
  onChapterRenameCancel: () => void;
  onEditValueChange: (value: string) => void;
}

function VolumeTreeItem({
  volume,
  isExpanded,
  activeChapterId,
  editingChapterId,
  editValue,
  onToggle,
  onChapterSelect,
  onChapterContextMenu,
  onChapterRenameSubmit,
  onChapterRenameCancel,
  onEditValueChange,
}: VolumeTreeItemProps) {
  return (
    <div className="border-b border-border/20 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-amber-light/10 transition-colors text-left"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? `折叠${volume.name}` : `展开${volume.name}`}
      >
        {isExpanded ? (
          <ChevronDown size={16} className="text-ink-light" />
        ) : (
          <ChevronRight size={16} className="text-ink-light" />
        )}
        <Folder size={16} className="text-amber/70 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium text-ink truncate">{volume.name}</span>
        <span className="text-xs text-ink-light font-mono">
          {volume.chapterCount}章
        </span>
      </button>

      {isExpanded && (
        <div className="bg-parchment/20">
          {volume.chapters.map((chapter) => (
            <ChapterTreeItem
              key={chapter.id}
              chapter={chapter}
              isActive={activeChapterId === chapter.id}
              isEditing={editingChapterId === chapter.id}
              editValue={editValue}
              onSelect={() => onChapterSelect(chapter.id)}
              onContextMenu={(e) => onChapterContextMenu(e, chapter)}
              onRenameSubmit={(newTitle) => onChapterRenameSubmit(chapter.id, newTitle)}
              onRenameCancel={onChapterRenameCancel}
              onEditValueChange={onEditValueChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ChapterTreeProps {
  volumes: Volume[];
  activeChapterId: string | null;
  editingChapterId: string | null;
  editValue: string;
  expandedVolumeIds: Set<string>;
  onToggleVolume: (volumeId: string) => void;
  onChapterSelect: (chapterId: string) => void;
  onChapterContextMenu: (e: React.MouseEvent, chapter: ChapterSummary) => void;
  onChapterRenameSubmit: (chapterId: string, newTitle: string) => void;
  onChapterRenameCancel: () => void;
  onEditValueChange: (value: string) => void;
}

export function ChapterTree({
  volumes,
  activeChapterId,
  editingChapterId,
  editValue,
  expandedVolumeIds,
  onToggleVolume,
  onChapterSelect,
  onChapterContextMenu,
  onChapterRenameSubmit,
  onChapterRenameCancel,
  onEditValueChange,
}: ChapterTreeProps) {
  if (volumes.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-ink-light text-sm">暂无章节</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md border border-border/30 overflow-hidden">
      {volumes.map((volume) => (
        <VolumeTreeItem
          key={volume.id}
          volume={volume}
          isExpanded={expandedVolumeIds.has(volume.id)}
          activeChapterId={activeChapterId}
          editingChapterId={editingChapterId}
          editValue={editValue}
          onToggle={() => onToggleVolume(volume.id)}
          onChapterSelect={onChapterSelect}
          onChapterContextMenu={onChapterContextMenu}
          onChapterRenameSubmit={onChapterRenameSubmit}
          onChapterRenameCancel={onChapterRenameCancel}
          onEditValueChange={onEditValueChange}
        />
      ))}
    </div>
  );
}

export type { ChapterSummary };
