import { AlertCircle, ArrowRight, BookOpen, Check, Clock, Package, UserRound, X } from 'lucide-react';
import type { KBItem } from './types';
import { ITEM_TYPE_LABELS } from './types';

interface KBItemDetailProps {
  item: KBItem;
  onClose: () => void;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
}

function formatOwner(ownerCharacterId?: string): string {
  return ownerCharacterId ?? '未指定';
}

export default function KBItemDetail({ item, onClose, onConfirm, onReject }: KBItemDetailProps) {
  const isPendingAiItem = item.source === 'ai' && !item.confirmed;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">{item.name}</h2>
          {isPendingAiItem && (
            <span className="rounded bg-[var(--color-amber)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-amber)]">
              AI识别-待确认
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-[var(--color-ink-light)] transition-colors hover:bg-[var(--color-parchment)] hover:text-[var(--color-ink)]"
          aria-label="关闭"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[var(--color-parchment)] px-2 py-1 text-xs font-medium text-[var(--color-ink-light)]">
            {item.source === 'ai' ? 'AI识别' : '手动录入'}
          </span>
          <span
            className={[
              'rounded px-2 py-1 text-xs font-medium',
              item.confirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700',
            ].join(' ')}
          >
            {item.confirmed ? '已确认' : '待确认'}
          </span>
        </div>

        <section className="space-y-4">
          <div>
            <h3 className="mb-1 text-sm font-medium text-[var(--color-ink-light)]">类型</h3>
            <p className="flex items-center gap-2 text-[var(--color-ink)]">
              <Package size={14} />
              {ITEM_TYPE_LABELS[item.itemType]}
            </p>
          </div>

          {item.aliases.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-[var(--color-ink-light)]">别名</h3>
              <p className="text-[var(--color-ink)]">{item.aliases.join(', ')}</p>
            </div>
          )}

          {item.summary && (
            <div>
              <h3 className="mb-1 text-sm font-medium text-[var(--color-ink-light)]">摘要</h3>
              <p className="whitespace-pre-wrap text-[var(--color-ink)]">{item.summary}</p>
            </div>
          )}

          <div>
            <h3 className="mb-1 text-sm font-medium text-[var(--color-ink-light)]">当前持有者</h3>
            <p className="flex items-center gap-2 text-[var(--color-ink)]">
              <UserRound size={14} />
              {formatOwner(item.ownerCharacterId)}
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-[var(--color-ink-light)]">持有者变更历史</h3>
            {item.ownershipHistory.length === 0 ? (
              <p className="rounded-md bg-[var(--color-parchment)]/50 p-3 text-sm text-[var(--color-ink-light)]">
                暂无持有者变更记录
              </p>
            ) : (
              <ul className="space-y-3">
                {item.ownershipHistory.map((record) => (
                  <li key={`${record.chapterId}-${record.createdAt}`} className="rounded-md border border-[var(--color-border)]/60 bg-[var(--color-parchment)]/35 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
                      <span>{formatOwner(record.fromCharacterId)}</span>
                      <ArrowRight size={14} className="text-[var(--color-ink-light)]" />
                      <span>{formatOwner(record.toCharacterId)}</span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-[var(--color-ink-light)]">
                      <p>章节: {record.chapterId}</p>
                      {record.note && <p>{record.note}</p>}
                      <p>{new Date(record.createdAt).toLocaleString('zh-CN')}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-1 text-sm font-medium text-[var(--color-ink-light)]">
              <BookOpen size={14} />
              出现章节
            </h3>
            {item.chapterIds.length === 0 ? (
              <p className="rounded-md bg-[var(--color-parchment)]/50 p-3 text-sm text-[var(--color-ink-light)]">暂无章节记录</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {item.chapterIds.map((chapterId) => (
                  <span key={chapterId} className="rounded bg-[var(--color-parchment)] px-2 py-1 text-sm text-[var(--color-ink)]">
                    {chapterId}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-1 text-sm font-medium text-[var(--color-ink-light)]">备注</h3>
            <p className="text-[var(--color-ink)]">{item.remark ?? '未指定'}</p>
          </div>
        </section>

        <div className="border-t border-[var(--color-border)] pt-4 text-xs text-[var(--color-ink-light)]">
          <p className="flex items-center gap-2">
            <Clock size={12} />
            创建时间: {new Date(item.createdAt).toLocaleString('zh-CN')}
          </p>
          <p className="mt-1 flex items-center gap-2">
            <Clock size={12} />
            更新时间: {new Date(item.updatedAt).toLocaleString('zh-CN')}
          </p>
        </div>
      </div>

      {isPendingAiItem && (
        <div className="space-y-2 border-t border-[var(--color-border)] p-4">
          {onConfirm && (
            <button
              type="button"
              onClick={() => onConfirm(item.id)}
              className="w-full rounded-lg bg-[var(--color-amber)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-amber)]/90"
              aria-label="确认道具条目"
            >
              <span className="inline-flex items-center gap-2">
                <Check size={16} />
                确认道具
              </span>
            </button>
          )}
          {onReject && (
            <button
              type="button"
              onClick={() => onReject(item.id)}
              className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
              aria-label="标记为非道具条目"
            >
              <span className="inline-flex items-center gap-2">
                <AlertCircle size={16} />
                标记非道具
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
