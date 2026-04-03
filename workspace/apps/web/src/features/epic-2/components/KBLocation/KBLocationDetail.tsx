import { X, Check, XCircle, Edit2, Trash2, GitMerge, MapPin, Clock, Users, BookOpen } from 'lucide-react';
import type { KBLocation, KBLocationReferences } from './types';
import { LOCATION_TYPE_LABELS } from './types';

interface KBLocationDetailProps {
  location: KBLocation;
  parentLocation?: KBLocation;
  references?: KBLocationReferences;
  onClose?: () => void;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onEdit?: (location: KBLocation) => void;
  onDelete?: (id: string) => void;
  onMerge?: (id: string) => void;
}

export default function KBLocationDetail({
  location,
  parentLocation,
  references,
  onClose,
  onConfirm,
  onReject,
  onEdit,
  onDelete,
  onMerge,
}: KBLocationDetailProps) {
  const showConfirmButton = location.source === 'ai' && !location.confirmed;
  const showRejectButton = location.source === 'ai' && !location.confirmed;
  const showEditButton = location.source === 'manual';
  const showDeleteButton = location.source === 'manual';
  const showMergeButton = location.confirmed;

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <h2 className="text-lg font-bold text-[var(--color-ink)]">{location.name}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--color-ink-light)] hover:text-[var(--color-ink)] hover:bg-gray-100 rounded transition-colors"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="flex items-center gap-2">
          <span className={`
            px-2 py-1 text-xs font-medium rounded
            ${location.source === 'ai' ? 'bg-amber/10 text-amber' : 'bg-blue-100 text-blue-600'}
          `}>
            {location.source === 'ai' ? 'AI识别' : '手动录入'}
          </span>
          {location.confirmed ? (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
              已确认
            </span>
          ) : location.source === 'ai' ? (
            <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded">
              待确认
            </span>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-[var(--color-ink-light)] mb-1">类型</h3>
            <p className="text-[var(--color-ink)]">{LOCATION_TYPE_LABELS[location.locationType]}</p>
          </div>

          {location.aliases.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-ink-light)] mb-1">别名</h3>
              <p className="text-[var(--color-ink)]">{location.aliases.join(', ')}</p>
            </div>
          )}

          {location.description && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-ink-light)] mb-1">描述</h3>
              <p className="text-[var(--color-ink)] whitespace-pre-wrap">{location.description}</p>
            </div>
          )}

          {parentLocation && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-ink-light)] mb-1">上级地点</h3>
              <div className="flex items-center gap-2 text-[var(--color-ink)]">
                <MapPin size={14} />
                {parentLocation.name}
              </div>
            </div>
          )}

          {location.remark && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-ink-light)] mb-1">备注</h3>
              <p className="text-[var(--color-ink)]">{location.remark}</p>
            </div>
          )}

          {references && references.characters.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-ink-light)] mb-2 flex items-center gap-1">
                <Users size={14} />
                关联角色
              </h3>
              <div className="flex flex-wrap gap-2">
                {references.characters.map(char => (
                  <span
                    key={char.id}
                    className="px-2 py-1 text-sm bg-gray-100 text-[var(--color-ink)] rounded"
                  >
                    {char.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {references && references.chapters.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--color-ink-light)] mb-2 flex items-center gap-1">
                <BookOpen size={14} />
                出现章节
              </h3>
              <div className="flex flex-wrap gap-2">
                {references.chapters.map(ch => (
                  <span
                    key={ch.id}
                    className="px-2 py-1 text-sm bg-gray-100 text-[var(--color-ink)] rounded"
                  >
                    {ch.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2 text-xs text-[var(--color-ink-light)]">
              <Clock size={12} />
              <span>创建时间: {new Date(location.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--color-ink-light)] mt-1">
              <Clock size={12} />
              <span>更新时间: {new Date(location.updatedAt).toLocaleString('zh-CN')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[var(--color-border)] space-y-2">
        {showConfirmButton && onConfirm && (
          <button
            onClick={() => onConfirm(location.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber rounded-lg hover:bg-amber/90 transition-colors"
          >
            <Check size={16} />
            确认地点
          </button>
        )}

        {showRejectButton && onReject && (
          <button
            onClick={() => onReject(location.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--color-ink-light)] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <XCircle size={16} />
            标记非地点
          </button>
        )}

        <div className="flex items-center gap-2">
          {showEditButton && onEdit && (
            <button
              onClick={() => onEdit(location)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Edit2 size={16} />
              编辑
            </button>
          )}

          {showDeleteButton && onDelete && (
            <button
              onClick={() => onDelete(location.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={16} />
              删除
            </button>
          )}

          {showMergeButton && onMerge && (
            <button
              onClick={() => onMerge(location.id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <GitMerge size={16} />
              合并
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
