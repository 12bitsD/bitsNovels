import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FileText } from 'lucide-react';
import { useChapterPanel, type ChapterSummary } from '../../hooks/useChapterPanel';
import { ChapterTree } from './ChapterTree';
import { ChapterContextMenu } from './ChapterContextMenu';
import { NewChapterButton } from './NewChapterButton';
import { SkeletonLoader } from '../../../../components/ui/SkeletonLoader';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';

interface ChapterPanelProps {
  projectId: string;
  activeChapterId: string | null;
  onChapterSelect: (chapterId: string) => void;
  onChapterCreate?: (params: { volumeId: string; title?: string; targetOrder?: number }) => void;
  onChapterRename?: (chapterId: string, newTitle: string) => void;
  onChapterDelete?: (chapterId: string) => void;
  onChapterReorder?: (params: {
    chapterId: string;
    targetVolumeId: string;
    targetOrder: number;
  }) => void;
}

export function ChapterPanel({
  projectId,
  activeChapterId,
  onChapterSelect,
  onChapterCreate,
  onChapterRename,
  onChapterDelete,
  onChapterReorder,
}: ChapterPanelProps) {
  const {
    volumes,
    loading,
    error,
    refetch,
    createChapter,
    renameChapter,
    deleteChapter,
    reorderChapter,
  } = useChapterPanel({ projectId });

  const [expandedVolumeIds, setExpandedVolumeIds] = useState<Set<string>>(new Set());
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    chapter: ChapterSummary | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    chapter: null,
  });

  useEffect(() => {
    if (volumes.length > 0) {
      setExpandedVolumeIds(new Set(volumes.map((v) => v.id)));
    }
  }, [volumes]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleToggleVolume = useCallback((volumeId: string) => {
    setExpandedVolumeIds((prev) => {
      const next = new Set(prev);
      if (next.has(volumeId)) {
        next.delete(volumeId);
      } else {
        next.add(volumeId);
      }
      return next;
    });
  }, []);

  const handleChapterContextMenu = useCallback((e: React.MouseEvent, chapter: ChapterSummary) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      chapter,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleRenameClick = useCallback(() => {
    if (contextMenu.chapter) {
      setEditingChapterId(contextMenu.chapter.id);
      setEditValue(contextMenu.chapter.title);
    }
  }, [contextMenu.chapter]);

  const handleRenameSubmit = useCallback(async (chapterId: string, newTitle: string) => {
    if (!newTitle.trim() || newTitle === contextMenu.chapter?.title) {
      setEditingChapterId(null);
      return;
    }

    const success = await renameChapter(chapterId, newTitle.trim());
    if (success) {
      onChapterRename?.(chapterId, newTitle.trim());
    }
    setEditingChapterId(null);
  }, [contextMenu.chapter, renameChapter, onChapterRename]);

  const handleRenameCancel = useCallback(() => {
    setEditingChapterId(null);
    setEditValue('');
  }, []);

  const handleDeleteClick = useCallback(async () => {
    if (contextMenu.chapter) {
      const success = await deleteChapter(contextMenu.chapter.id);
      if (success) {
        onChapterDelete?.(contextMenu.chapter.id);
      }
    }
  }, [contextMenu.chapter, deleteChapter, onChapterDelete]);

  const handleInsertAbove = useCallback(async () => {
    if (contextMenu.chapter) {
      const newChapter = await createChapter({
        volumeId: contextMenu.chapter.volumeId,
        targetOrder: contextMenu.chapter.order,
      });
      if (newChapter) {
        onChapterCreate?.({
          volumeId: contextMenu.chapter.volumeId,
          targetOrder: contextMenu.chapter.order,
        });
        setEditingChapterId(newChapter.id);
        setEditValue(newChapter.title);
      }
    }
  }, [contextMenu.chapter, createChapter, onChapterCreate]);

  const handleInsertBelow = useCallback(async () => {
    if (contextMenu.chapter) {
      const newChapter = await createChapter({
        volumeId: contextMenu.chapter.volumeId,
        targetOrder: contextMenu.chapter.order + 1,
      });
      if (newChapter) {
        onChapterCreate?.({
          volumeId: contextMenu.chapter.volumeId,
          targetOrder: contextMenu.chapter.order + 1,
        });
        setEditingChapterId(newChapter.id);
        setEditValue(newChapter.title);
      }
    }
  }, [contextMenu.chapter, createChapter, onChapterCreate]);

  const handleNewChapter = useCallback(async () => {
    if (volumes.length === 0) return;
    
    const lastVolume = volumes[volumes.length - 1];
    const newChapter = await createChapter({
      volumeId: lastVolume.id,
      title: '新章节',
    });
    
    if (newChapter) {
      onChapterCreate?.({
        volumeId: lastVolume.id,
        title: '新章节',
      });
      onChapterSelect(newChapter.id);
      setEditingChapterId(newChapter.id);
      setEditValue(newChapter.title);
    }
  }, [volumes, createChapter, onChapterCreate, onChapterSelect]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'chapter' && overData?.type === 'chapter') {
      const activeChapter = activeData.chapter as ChapterSummary;
      const overChapter = overData.chapter as ChapterSummary;
      
      if (activeChapter.volumeId !== overChapter.volumeId) {
        setExpandedVolumeIds((prev) => new Set([...prev, overChapter.volumeId]));
      }
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'chapter' && overData?.type === 'chapter') {
      const activeChapter = activeData.chapter as ChapterSummary;
      const overChapter = overData.chapter as ChapterSummary;

      const success = await reorderChapter({
        chapterId: activeChapter.id,
        targetVolumeId: overChapter.volumeId,
        targetOrder: overChapter.order,
      });

      if (success) {
        onChapterReorder?.({
          chapterId: activeChapter.id,
          targetVolumeId: overChapter.volumeId,
          targetOrder: overChapter.order,
        });
      }
    }
  }, [reorderChapter, onChapterReorder]);

  if (loading) {
    return (
      <div className="h-full flex flex-col p-4" data-testid="chapter-panel-loading">
        <SkeletonLoader variant="card" className="h-8 w-32 mb-4" />
        <div className="space-y-2 flex-1">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} variant="card" className="h-10" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col p-4" data-testid="chapter-panel-error">
        <ErrorAlert error={error} />
        <button onClick={refetch} className="btn-secondary w-auto mt-4 px-4 mx-auto">
          重试
        </button>
      </div>
    );
  }

  const allChapterIds = volumes.flatMap((v) => v.chapters.map((c) => c.id));
  const activeDragChapter = volumes
    .flatMap((v) => v.chapters)
    .find((c) => c.id === activeDragId);

  return (
    <div className="h-full flex flex-col bg-parchment">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <h2 className="text-sm font-semibold text-ink">章节</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={allChapterIds}
            strategy={verticalListSortingStrategy}
          >
            <ChapterTree
              volumes={volumes}
              activeChapterId={activeChapterId}
              editingChapterId={editingChapterId}
              editValue={editValue}
              expandedVolumeIds={expandedVolumeIds}
              onToggleVolume={handleToggleVolume}
              onChapterSelect={onChapterSelect}
              onChapterContextMenu={handleChapterContextMenu}
              onChapterRenameSubmit={handleRenameSubmit}
              onChapterRenameCancel={handleRenameCancel}
              onEditValueChange={setEditValue}
            />
          </SortableContext>

          <DragOverlay>
            {activeDragChapter ? (
              <div className="bg-white rounded-md shadow-float p-3 opacity-90">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-amber/60" />
                  <span className="text-sm font-medium text-ink">
                    {activeDragChapter.title}
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div className="p-4 border-t border-border/30">
        <NewChapterButton
          onClick={handleNewChapter}
          disabled={volumes.length === 0}
        />
      </div>

      <ChapterContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={handleCloseContextMenu}
        onRename={handleRenameClick}
        onInsertAbove={handleInsertAbove}
        onInsertBelow={handleInsertBelow}
        onDelete={handleDeleteClick}
      />
    </div>
  );
}
