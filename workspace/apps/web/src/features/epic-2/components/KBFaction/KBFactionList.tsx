import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ChevronDown } from 'lucide-react';
import KBFactionCard from './KBFactionCard';
import type { KBFaction, FactionType } from './types';

interface KBFactionListProps {
  factions: KBFaction[];
  loading: boolean;
  hasMore: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  typeFilter: FactionType | 'all';
  onTypeFilterChange: (filter: FactionType | 'all') => void;
  selectedFactionId?: string | null;
  onFactionSelect: (faction: KBFaction) => void;
  onLoadMore: () => void;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}

const TYPE_OPTIONS: { value: FactionType | 'all'; label: string }[] = [
  { value: 'all', label: '全部类型' },
  { value: 'country', label: '国家' },
  { value: 'sect', label: '门派/宗门' },
  { value: 'company', label: '公司/商会' },
  { value: 'gang', label: '帮派/黑道' },
  { value: 'military', label: '军队/军事组织' },
  { value: 'other', label: '其他' },
];

function isNewFaction(faction: KBFaction): boolean {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  return new Date(faction.createdAt) > threeDaysAgo && faction.source === 'ai' && !faction.confirmed;
}

export default function KBFactionList({
  factions,
  loading,
  hasMore,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  selectedFactionId,
  onFactionSelect,
  onLoadMore,
}: KBFactionListProps) {
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sortedFactions = [...factions].sort((a, b) => {
    const aNew = isNewFaction(a);
    const bNew = isNewFaction(b);
    if (aNew && !bNew) return -1;
    if (!aNew && bNew) return 1;
    return 0;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTypeLabel = TYPE_OPTIONS.find(opt => opt.value === typeFilter)?.label || '全部类型';

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-parchment)] space-y-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-light)]"
          />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="搜索势力名称..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-[var(--color-border)] rounded-md
                       focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/30 focus:border-[var(--color-amber)]
                       placeholder:text-[var(--color-ink-light)]"
          />
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-[var(--color-border)] rounded-md
                       hover:border-[var(--color-amber)]/50 transition-colors"
          >
            <span className="text-[var(--color-ink)]">{selectedTypeLabel}</span>
            <ChevronDown
              size={16}
              className={`text-[var(--color-ink-light)] transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`}
            />
          </button>

          {showTypeDropdown && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[var(--color-border)] rounded-md shadow-lg max-h-60 overflow-y-auto">
              {TYPE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => {
                    onTypeFilterChange(option.value);
                    setShowTypeDropdown(false);
                  }}
                  className={`
                    w-full text-left px-3 py-2 text-sm transition-colors
                    ${typeFilter === option.value
                      ? 'bg-[var(--color-amber)]/10 text-[var(--color-amber)]'
                      : 'text-[var(--color-ink)] hover:bg-[var(--color-parchment)]'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && factions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-[var(--color-amber)]" size={24} />
            <span className="ml-2 text-[var(--color-ink-light)]">加载中...</span>
          </div>
        ) : sortedFactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--color-ink-light)]">
            <p>暂无势力</p>
            <p className="text-xs mt-1">尝试调整搜索条件或筛选器</p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-[var(--color-border)]/30 p-3 space-y-3">
            {sortedFactions.map(faction => (
              <li key={faction.id}>
                <KBFactionCard
                  faction={faction}
                  isSelected={selectedFactionId === faction.id}
                  isNew={isNewFaction(faction)}
                  onClick={onFactionSelect}
                />
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <div className="p-3 text-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="px-4 py-2 text-sm text-[var(--color-ink-light)] hover:text-[var(--color-amber)] transition-colors"
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
