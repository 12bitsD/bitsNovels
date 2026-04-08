import { useState } from 'react';
import { CheckCircle2, Loader2, Search } from 'lucide-react';
import KBItemCard from './KBItemCard';
import type { KBItem, ItemType } from './types';
import { ITEM_TYPE_LABELS } from './types';

const ITEM_TYPE_OPTIONS: Array<{ value: ItemType | 'all'; label: string }> = [
  { value: 'all', label: '全部类型' },
  { value: 'weapon', label: ITEM_TYPE_LABELS.weapon },
  { value: 'armor', label: ITEM_TYPE_LABELS.armor },
  { value: 'accessory', label: ITEM_TYPE_LABELS.accessory },
  { value: 'consumable', label: ITEM_TYPE_LABELS.consumable },
  { value: 'token', label: ITEM_TYPE_LABELS.token },
  { value: 'other', label: ITEM_TYPE_LABELS.other },
];

const NEW_DISCOVERY_THRESHOLD_HOURS = 24;

interface KBItemListProps {
  items: KBItem[];
  loading: boolean;
  search?: string;
  itemType?: ItemType | 'all';
  selectedIds?: string[];
  selectedItemId?: string | null;
  onItemSelect?: (item: KBItem) => void;
  onSelectionChange?: (ids: string[]) => void;
  onSearchChange?: (value: string) => void;
  onTypeFilterChange?: (value: ItemType | 'all') => void;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onBulkConfirm?: (ids: string[]) => void;
}

function isNewDiscovery(item: KBItem): boolean {
  if (item.source !== 'ai' || item.confirmed) {
    return false;
  }

  const createdAt = new Date(item.createdAt);
  const diffHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return diffHours < NEW_DISCOVERY_THRESHOLD_HOURS;
}

export default function KBItemList({
  items,
  loading,
  search = '',
  itemType = 'all',
  selectedIds = [],
  selectedItemId = null,
  onItemSelect,
  onSelectionChange,
  onSearchChange,
  onTypeFilterChange,
  onConfirm,
  onReject,
  onBulkConfirm,
}: KBItemListProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [localItemType, setLocalItemType] = useState<ItemType | 'all'>(itemType);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  const handleTypeChange = (value: ItemType | 'all') => {
    setLocalItemType(value);
    onTypeFilterChange?.(value);
  };

  const handleSelectionChange = (id: string, isSelected: boolean) => {
    if (!onSelectionChange) {
      return;
    }

    onSelectionChange(
      isSelected ? [...selectedIds, id] : selectedIds.filter((selectedId) => selectedId !== id),
    );
  };

  const filteredItems = [...items]
    .filter((item) => {
      const matchesSearch = !localSearch || item.name.toLowerCase().includes(localSearch.toLowerCase());
      const matchesType = localItemType === 'all' || item.itemType === localItemType;
      return matchesSearch && matchesType;
    })
    .sort((left, right) => {
      const leftIsNew = isNewDiscovery(left);
      const rightIsNew = isNewDiscovery(right);

      if (leftIsNew !== rightIsNew) {
        return leftIsNew ? -1 : 1;
      }

      return left.name.localeCompare(right.name, 'zh-CN');
    });

  const newDiscoveryCount = filteredItems.filter(isNewDiscovery).length;

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[var(--color-amber)]" size={24} />
        <span className="ml-2 text-[var(--color-ink-light)]">加载中...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="space-y-4 border-b border-[var(--color-border)]/60 bg-[var(--color-parchment)]/40 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-light)]" />
          <input
            type="text"
            value={localSearch}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="搜索道具名称..."
            className="input-base pl-9"
          />
        </div>

        <select
          value={localItemType}
          onChange={(event) => handleTypeChange(event.target.value as ItemType | 'all')}
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/20"
          aria-label="筛选道具类型"
        >
          {ITEM_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {newDiscoveryCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
              新发现 {newDiscoveryCount}
            </span>
          </div>
        )}

        {selectedIds.length > 0 && onBulkConfirm && (
          <div className="flex items-center justify-between rounded-md border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10 p-3">
            <span className="text-sm font-medium text-[var(--color-ink)]">已选择 {selectedIds.length} 项</span>
            <button
              type="button"
              onClick={() => onBulkConfirm(selectedIds)}
              className="rounded-md bg-[var(--color-amber)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-amber)]/90"
              aria-label="批量确认选中道具"
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                批量确认
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-ink-light)]">
            <p>暂无道具</p>
            {(localSearch || localItemType !== 'all') && <p className="mt-1 text-xs">尝试调整搜索词或筛选条件</p>}
          </div>
        ) : (
          <ul role="list" className="space-y-3">
            {filteredItems.map((item) => (
              <li key={item.id}>
                <KBItemCard
                  item={item}
                  selected={selectedItemId === item.id || selectedIds.includes(item.id)}
                  onClick={onItemSelect}
                  onSelect={onSelectionChange ? handleSelectionChange : undefined}
                  onConfirm={onConfirm}
                  onReject={onReject}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
