import { useState, useCallback } from 'react';
import { FileText, ChevronDown, ChevronRight, Loader2Icon } from 'lucide-react';
import { ChapterNoteEditor } from './ChapterNoteEditor';
import type { ChapterNote } from '../../hooks/useChapterNote';
import type { SaveStatus } from '../../hooks/useAutoSave';

interface ChapterNotePanelProps {
  chapterId: string;
  note: ChapterNote | null;
  onSave: (content: string) => void;
  saveStatus: SaveStatus;
}

export function ChapterNotePanel({
  chapterId,
  note,
  onSave,
  saveStatus,
}: ChapterNotePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const hasNote = note && note.content && note.content.length > 0;

  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <span className="flex items-center gap-1 text-xs text-ink-light">
            <Loader2Icon size={12} className="animate-spin" />
            保存中...
          </span>
        );
      case 'saved':
        return (
          <span className="text-xs text-success">已保存</span>
        );
      case 'error':
        return (
          <span className="text-xs text-error">保存失败</span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border-t border-border/30 bg-parchment-light/30">
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-amber-light/20 transition-colors"
        aria-expanded={isExpanded}
        aria-controls={`chapter-note-panel-${chapterId}`}
      >
        <div className="flex items-center gap-2">
          {hasNote ? (
            <FileText size={14} className="text-amber/70" />
          ) : (
            <FileText size={14} className="text-ink-light/40" />
          )}
          <span className="text-sm font-medium text-ink">章节备注</span>
          {hasNote && (
            <span className="text-xs text-ink-light">
              {note!.charCount}/2000
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {renderSaveStatus()}
          {isExpanded ? (
            <ChevronDown size={14} className="text-ink-light" />
          ) : (
            <ChevronRight size={14} className="text-ink-light" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div
          id={`chapter-note-panel-${chapterId}`}
          className="px-4 pb-4"
        >
          <ChapterNoteEditor
            initialContent={note?.content || ''}
            onChange={onSave}
          />
        </div>
      )}
    </div>
  );
}