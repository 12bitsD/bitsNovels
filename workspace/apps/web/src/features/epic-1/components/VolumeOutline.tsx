import { useState, useEffect, useCallback } from 'react';
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
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { client } from '../../../api/client';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { SkeletonLoader } from '../../../components/ui/SkeletonLoader';
import { VolumeItem } from './VolumeItem';
import type { Volume, ChapterSummary } from '@bitsnovels/api-types';

interface OutlineResponse {
  volumes: Volume[];
  totals: {
    volumeCount: number;
    chapterCount: number;
    totalChars: number;
  };
}

interface CreateVolumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, description?: string) => void;
  error?: string;
}

function CreateVolumeModal({ isOpen, onClose, onSubmit, error }: CreateVolumeModalProps) {
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!name.trim()) {
      setValidationError('卷名称不能为空');
      return;
    }
    if (name.trim().length > 30) {
      setValidationError('卷名称不能超过30个字符');
      return;
    }
    onSubmit(name.trim());
  };

  return (
    <div className="fixed inset-0 bg-ink/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-modal w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-ink mb-4">新建卷</h2>
        <label htmlFor="volume-name" className="block text-sm font-medium text-ink-light mb-1.5">
          卷名称 <span className="text-error">*</span>
        </label>
        <input
          id="volume-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setValidationError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="例如：第一卷"
          className="input-base mb-1"
          maxLength={30}
          autoFocus
        />
        {(validationError || error) && (
          <p className="text-error text-sm mb-3">{validationError || error}</p>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="btn-secondary w-auto px-4">取消</button>
          <button onClick={handleSubmit} className="btn-primary w-auto px-4">创建</button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

function ConfirmDialog({ isOpen, title, message, confirmLabel = '确认', onConfirm, onCancel, danger }: ConfirmDialogProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-ink/30 flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-modal w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-ink mb-2">{title}</h2>
        <p className="text-ink-light text-sm mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary w-auto px-4">取消</button>
          <button
            onClick={onConfirm}
            className={`w-auto px-4 py-2.5 rounded font-medium transition-all ${
              danger ? 'bg-error text-white hover:bg-error/90' : 'btn-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface VolumeOutlineProps {
  projectId: string;
}

export default function VolumeOutline({ projectId }: VolumeOutlineProps) {
  const [outline, setOutline] = useState<OutlineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreateVolume, setShowCreateVolume] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ volumeId: string; chapterCount: number } | null>(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchOutline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await client.GET(`/api/projects/${projectId}/outline`);
      if (data) {
        setOutline(data as OutlineResponse);
        setExpandedVolumes(new Set((data as OutlineResponse).volumes.map((v) => v.id)));
      }
    } catch {
      setError('加载大纲失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchOutline();
  }, [fetchOutline]);

  const handleToggleVolume = (volumeId: string) => {
    setExpandedVolumes((prev) => {
      const next = new Set(prev);
      if (next.has(volumeId)) {
        next.delete(volumeId);
      } else {
        next.add(volumeId);
      }
      return next;
    });
  };

  const handleChapterSelect = (chapterId: string, ctrlKey: boolean, shiftKey: boolean) => {
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      if (ctrlKey || shiftKey) {
        if (next.has(chapterId)) {
          next.delete(chapterId);
        } else {
          next.add(chapterId);
        }
      } else {
        if (next.size === 1 && next.has(chapterId)) {
          next.clear();
        } else {
          next.clear();
          next.add(chapterId);
        }
      }
      return next;
    });
  };

  const handleChapterDoubleClick = (chapterId: string) => {
    console.log('Navigate to chapter editor:', chapterId);
  };

  const handleCreateVolume = async (name: string, description?: string) => {
    try {
      const { error: err } = await client.POST(`/api/projects/${projectId}/volumes`, {
        body: { name, description },
      });
      if (err) {
        return { error: (err as { detail?: string })?.detail || '创建失败' };
      }
      setShowCreateVolume(false);
      fetchOutline();
    } catch {
      return { error: '创建失败，请重试' };
    }
  };

  const handleRenameVolume = async (volumeId: string, newName: string) => {
    try {
      await client.PATCH(`/api/projects/${projectId}/volumes/${volumeId}`, {
        body: { name: newName },
      });
      fetchOutline();
    } catch {
      console.error('Failed to rename volume');
    }
  };

  const handleDeleteVolume = (volumeId: string) => {
    const volume = outline?.volumes.find((v) => v.id === volumeId);
    if (volume && volume.chapterCount > 0) {
      setDeleteConfirm({ volumeId, chapterCount: volume.chapterCount });
    } else {
      confirmDeleteVolume(volumeId);
    }
  };

  const confirmDeleteVolume = async (volumeId: string) => {
    try {
      await client.DELETE(`/api/projects/${projectId}/volumes/${volumeId}`);
      setDeleteConfirm(null);
      fetchOutline();
    } catch {
      console.error('Failed to delete volume');
    }
  };

  const handleAddChapter = (volumeId: string) => {
    console.log('Add chapter to volume:', volumeId);
  };

  const handleBulkDelete = async () => {
    try {
      await client.POST(`/api/projects/${projectId}/chapters/bulk-trash`, {
        body: { chapterIds: Array.from(selectedChapters) },
      });
      setSelectedChapters(new Set());
      setBatchDeleteConfirm(false);
      fetchOutline();
    } catch {
      console.error('Failed to delete chapters');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'chapter' && overData?.type === 'volume') {
      const activeChapter = activeData.chapter as ChapterSummary;
      const overVolume = overData.volume as Volume;
      if (activeChapter.volumeId !== overVolume.id) {
        setOutline((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            volumes: prev.volumes.map((v) => {
              if (v.id === activeChapter.volumeId) {
                return { ...v, chapters: v.chapters.filter((c) => c.id !== activeChapter.id) };
              }
              if (v.id === overVolume.id) {
                return { ...v, chapters: [...v.chapters, { ...activeChapter, volumeId: overVolume.id }] };
              }
              return v;
            }),
          };
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'volume' && overData?.type === 'volume') {
      const oldIndex = outline?.volumes.findIndex((v) => v.id === active.id);
      const newIndex = outline?.volumes.findIndex((v) => v.id === over.id);
      if (oldIndex !== undefined && newIndex !== undefined) {
        setOutline((prev) => {
          if (!prev) return prev;
          const newVolumes = [...prev.volumes];
          const [removed] = newVolumes.splice(oldIndex, 1);
          newVolumes.splice(newIndex, 0, removed);
          return { ...prev, volumes: newVolumes };
        });
        try {
          await client.POST(`/api/projects/${projectId}/outline/reorder-volumes`, {
            body: { volumeIds: outline?.volumes.map((v) => v.id) },
          });
        } catch {
          fetchOutline();
        }
      }
    }

    if (activeData?.type === 'chapter' && overData?.type === 'chapter') {
      const activeChapter = activeData.chapter as ChapterSummary;
      const overChapter = overData.chapter as ChapterSummary;
      const activeVolume = outline?.volumes.find((v) => v.id === activeChapter.volumeId);
      const overVolume = outline?.volumes.find((v) => v.id === overChapter.volumeId);
      if (activeVolume && overVolume) {
        setOutline((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            volumes: prev.volumes.map((v) => {
              if (v.id === activeVolume.id && v.id === overVolume.id) {
                const chapters = [...v.chapters];
                const oldIdx = chapters.findIndex((c) => c.id === activeChapter.id);
                const newIdx = chapters.findIndex((c) => c.id === overChapter.id);
                const [removed] = chapters.splice(oldIdx, 1);
                chapters.splice(newIdx, 0, removed);
                return { ...v, chapters };
              }
              return v;
            }),
          };
        });
        try {
          await client.POST(`/api/projects/${projectId}/chapters/reorder`, {
            body: {
              chapterId: activeChapter.id,
              targetVolumeId: overVolume.id,
              targetOrder: overChapter.order,
            },
          });
        } catch {
          fetchOutline();
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto" data-testid="outline-loading">
        <SkeletonLoader variant="card" className="h-10 w-48 mb-6" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} variant="card" className="h-12" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto" data-testid="outline-error">
        <ErrorAlert error={error} />
        <button onClick={fetchOutline} className="btn-secondary w-auto mt-4 px-4">
          重试
        </button>
      </div>
    );
  }

  if (!outline || outline.volumes.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <div className="w-16 h-16 bg-amber/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen size={24} className="text-amber/60" />
        </div>
        <h3 className="text-lg font-bold text-ink mb-2">暂无卷章节</h3>
        <p className="text-ink-light text-sm mb-4">创建您的第一个卷来开始吧</p>
        <button onClick={() => setShowCreateVolume(true)} className="btn-primary w-auto px-6">
          <Plus size={16} className="inline mr-2" />
          新建卷
        </button>
        <CreateVolumeModal
          isOpen={showCreateVolume}
          onClose={() => setShowCreateVolume(false)}
          onSubmit={handleCreateVolume}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink">卷章大纲</h1>
        <button
          onClick={() => setShowCreateVolume(true)}
          className="btn-primary w-auto px-4 flex items-center gap-2"
        >
          <Plus size={16} />
          新建卷
        </button>
      </div>

      {selectedChapters.size > 0 && (
        <div
          data-testid="batch-actions-bar"
          className="mb-4 p-3 bg-amber-light/20 border border-amber/30 rounded-md flex items-center justify-between"
        >
          <span className="text-sm font-medium text-ink">
            已选择{selectedChapters.size}项
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setBatchDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-error hover:bg-error/10 rounded transition-colors"
            >
              <Trash2 size={14} />
              批量删除
            </button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={outline.volumes.map((v) => v.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="card-base overflow-hidden">
            {outline.volumes.map((volume) => (
              <VolumeItem
                key={volume.id}
                volume={volume}
                isExpanded={expandedVolumes.has(volume.id)}
                onToggle={handleToggleVolume}
                selectedChapters={selectedChapters}
                onChapterSelect={handleChapterSelect}
                onChapterDoubleClick={handleChapterDoubleClick}
                onAddChapter={handleAddChapter}
                onRenameVolume={handleRenameVolume}
                onDeleteVolume={handleDeleteVolume}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div className="card-base p-3 shadow-float opacity-90">
              <span className="text-sm font-medium text-ink">
                {outline?.volumes.find((v) => v.id === activeId)?.name ||
                  outline?.volumes.flatMap((v) => v.chapters).find((c) => c.id === activeId)?.title}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <div
        data-testid="outline-totals"
        className="mt-4 p-4 bg-white/50 border border-border/30 rounded-md flex items-center justify-center gap-8 text-sm"
      >
        <span className="text-ink-light">
          共 <span className="font-mono font-medium text-ink">{outline.totals.volumeCount}</span> 卷
        </span>
        <span className="text-ink-light">
          <span className="font-mono font-medium text-ink">{outline.totals.chapterCount}</span> 章
        </span>
        <span className="text-ink-light">
          <span className="font-mono font-medium text-ink">{outline.totals.totalChars.toLocaleString()}</span> 字
        </span>
      </div>

      <CreateVolumeModal
        isOpen={showCreateVolume}
        onClose={() => setShowCreateVolume(false)}
        onSubmit={handleCreateVolume}
      />

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="确认删除卷"
        message={
          deleteConfirm && deleteConfirm.chapterCount > 0
            ? `该卷下有${deleteConfirm.chapterCount}个章节，删除后章节将移入回收站。`
            : '确定要删除这个卷吗？'
        }
        confirmLabel="删除"
        onConfirm={() => deleteConfirm && confirmDeleteVolume(deleteConfirm.volumeId)}
        onCancel={() => setDeleteConfirm(null)}
        danger
      />

      <ConfirmDialog
        isOpen={batchDeleteConfirm}
        title="确认批量删除"
        message={`确定要删除选中的${selectedChapters.size}个章节吗？删除后章节将移入回收站。`}
        confirmLabel="删除"
        onConfirm={handleBulkDelete}
        onCancel={() => setBatchDeleteConfirm(false)}
        danger
      />
    </div>
  );
}
