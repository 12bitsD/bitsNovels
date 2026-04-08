import { ArrowUpRight, Check, FlaskConical, Gem, Package, Shield, Sword, Ticket, X } from 'lucide-react';
import type { KBItem, ItemType } from './types';
import { ITEM_TYPE_LABELS } from './types';

const ITEM_TYPE_ICONS: Record<ItemType, typeof Package> = {
  weapon: Sword,
  armor: Shield,
  accessory: Gem,
  consumable: FlaskConical,
  token: Ticket,
  other: Package,
};

const NEW_DISCOVERY_THRESHOLD_HOURS = 24;

interface KBItemCardProps {
  item: KBItem;
  selected?: boolean;
  onClick?: (item: KBItem) => void;
  onSelect?: (id: string, selected: boolean) => void;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
}

function isNewDiscovery(item: KBItem): boolean {
  if (item.source !== 'ai' || item.confirmed) {
    return false;
  }

  const createdAt = new Date(item.createdAt);
  const diffHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return diffHours < NEW_DISCOVERY_THRESHOLD_HOURS;
}

function formatOwner(ownerCharacterId?: string): string {
  return ownerCharacterId ?? '未指定';
}

export default function KBItemCard({
  item,
  selected = false,
  onClick,
  onSelect,
  onConfirm,
  onReject,
}: KBItemCardProps) {
  const Icon = ITEM_TYPE_ICONS[item.itemType];
  const isPendingAiItem = item.source === 'ai' && !item.confirmed;
  const appearanceCount = item.chapterIds.length;

  const handleCardClick = () => {
    onClick?.(item);
  };

  const handleSelection = (event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect?.(item.id, !selected);
  };

  const handleConfirm = (event: React.MouseEvent) => {
    event.stopPropagation();
    onConfirm?.(item.id);
  };

  const handleReject = (event: React.MouseEvent) => {
    event.stopPropagation();
    onReject?.(item.id);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`道具: ${item.name}`}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleCardClick();
        }
      }}
      className={[
        'rounded-lg border bg-white p-4 transition-all duration-200 cursor-pointer',
        'hover:border-[var(--color-amber)]/50 hover:shadow-md',
        selected
          ? 'border-[var(--color-amber)] ring-2 ring-[var(--color-amber)]/20'
          : 'border-[var(--color-border)]',
        isNewDiscovery(item) ? 'bg-emerald-50/60' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-parchment)] text-[var(--color-ink-light)]">
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-[var(--color-ink)]">{item.name}</h3>
            {isPendingAiItem && (
              <span className="rounded bg-[var(--color-amber)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--color-amber)]">
                AI识别-待确认
              </span>
            )}
            {isNewDiscovery(item) && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                新发现
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-ink-light)]">
            <span>{ITEM_TYPE_LABELS[item.itemType]}</span>
            <span>当前持有者: {formatOwner(item.ownerCharacterId)}</span>
          </div>

          {item.aliases.length > 0 && (
            <p className="mt-1 truncate text-xs text-[var(--color-ink-light)]">别名: {item.aliases.join(', ')}</p>
          )}

          <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-ink-light)]">
            <ArrowUpRight size={12} />
            <span>出现 {appearanceCount} 次</span>
          </div>
        </div>

        {onSelect && (
          <button
            type="button"
            onClick={handleSelection}
            className={[
              'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
              selected
                ? 'border-[var(--color-amber)] bg-[var(--color-amber)] text-white'
                : 'border-[var(--color-border)] hover:border-[var(--color-amber)]/50',
            ].join(' ')}
            aria-label={selected ? '取消选择道具' : '选择道具'}
          >
            {selected && <Check size={12} />}
          </button>
        )}
      </div>

      {isPendingAiItem && (onConfirm || onReject) && (
        <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border)]/60 pt-3" onClick={(event) => event.stopPropagation()}>
          {onConfirm && (
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-md bg-[var(--color-amber)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-amber)]/90"
              aria-label="确认道具"
            >
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} />
                确认
              </span>
            </button>
          )}
          {onReject && (
            <button
              type="button"
              onClick={handleReject}
              className="flex-1 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-[var(--color-ink-light)] transition-colors hover:bg-gray-200"
              aria-label="标记非道具"
            >
              <span className="inline-flex items-center gap-1.5">
                <X size={14} />
                标记非道具
              </span>
            </button>
          )}
        </div>
      )}
    </article>
  );
}
