import type { KBSetting } from './types';

interface KBSettingListProps {
  items: KBSetting[];
  loading: boolean;
  search: string;
  category: string;
  selectedId: string | null;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSelect: (id: string) => void;
}

export default function KBSettingList({
  items,
  loading,
  search,
  category,
  selectedId,
  onSearchChange,
  onCategoryChange,
  onSelect,
}: KBSettingListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--color-border)] p-3">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索设定标题/内容…"
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-amber)]/50"
        />
        <input
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
          placeholder="分类（可选）"
          className="mt-2 w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-amber)]/50"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-[var(--color-ink-light)]">加载中…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-[var(--color-ink-light)]">暂无设定</div>
        ) : (
          <div className="space-y-2 p-3">
            {items.map((item) => {
              const isActive = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    isActive
                      ? 'border-[var(--color-amber)]/45 bg-[var(--color-amber-light)]/60'
                      : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-parchment)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-[var(--color-ink)]">{item.title}</p>
                    <span className="shrink-0 rounded-full bg-[var(--color-border)]/25 px-2 py-0.5 text-xs text-[var(--color-ink-light)]">
                      {item.category}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--color-ink-light)]">{item.content}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

