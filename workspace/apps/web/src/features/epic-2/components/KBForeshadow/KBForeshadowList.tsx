import { Loader2, Search } from 'lucide-react';
import KBForeshadowCard from './KBForeshadowCard';
import type { KBForeshadow, ForeshadowStatusFilter } from './types';
import { FORESHADOW_STATUS_LABELS, FORESHADOW_STATUS_ORDER } from './types';

interface KBForeshadowListProps {
  foreshadows: KBForeshadow[];
  loading: boolean;
  search: string;
  statusFilter: ForeshadowStatusFilter;
  selectedForeshadowId?: string;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: ForeshadowStatusFilter) => void;
  onSelectForeshadow: (foreshadow: KBForeshadow) => void;
}

export default function KBForeshadowList({
  foreshadows,
  loading,
  search,
  statusFilter,
  selectedForeshadowId,
  onSearchChange,
  onStatusFilterChange,
  onSelectForeshadow,
}: KBForeshadowListProps) {
  if (loading && foreshadows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--color-ink-light)]">
        <Loader2 size={20} className="animate-spin text-[var(--color-amber)]" />
        <span className="ml-2">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-light)]" />
          <input
            type="text"
            value={search}
            placeholder="搜索伏笔名称..."
            onChange={(event) => onSearchChange(event.target.value)}
            className="input-base pl-9"
          />
        </div>

        <select
          aria-label="筛选伏笔状态"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as ForeshadowStatusFilter)}
          className="rounded border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/20"
        >
          <option value="all">全部状态</option>
          {FORESHADOW_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {FORESHADOW_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {foreshadows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-white/70 px-4 py-10 text-center text-[var(--color-ink-light)]">
          暂无伏笔
        </div>
      ) : (
        FORESHADOW_STATUS_ORDER.map((status) => {
          const items = foreshadows.filter((foreshadow) => foreshadow.status === status);

          if (items.length === 0) {
            return null;
          }

          return (
            <section key={status} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                  {FORESHADOW_STATUS_LABELS[status]}
                </h3>
                <span className="text-xs text-[var(--color-ink-light)]">{items.length}</span>
              </div>

              <div className="space-y-2">
                {items.map((foreshadow) => (
                  <KBForeshadowCard
                    key={foreshadow.id}
                    foreshadow={foreshadow}
                    selected={selectedForeshadowId === foreshadow.id}
                    onClick={onSelectForeshadow}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
