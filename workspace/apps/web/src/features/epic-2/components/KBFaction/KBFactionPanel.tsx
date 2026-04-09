import { useKBFaction } from '../../hooks/useKBFaction';
import KBFactionList from './KBFactionList';
import KBFactionDetail from './KBFactionDetail';
import type { FactionType } from './types';

interface KBFactionPanelProps {
  projectId: string;
}

export default function KBFactionPanel({ projectId }: KBFactionPanelProps) {
  const {
    factions,
    loading,
    hasMore,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    selectedFaction,
    setSelectedFaction,
    selectedFactionRefs,
    loadingRefs,
    loadMore,
    confirmFaction,
    rejectFaction,
  } = useKBFaction({ projectId });

  return (
    <div className="flex h-full bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
      <div className="w-80 border-r border-[var(--color-border)] flex flex-col">
        <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-parchment)]">
          <h2 className="font-semibold text-[var(--color-ink)]">势力知识库</h2>
          <p className="text-xs text-[var(--color-ink-light)] mt-1">
            {factions.length} 个势力
            {typeFilter !== 'all' && ` · 筛选中`}
          </p>
        </div>
        <KBFactionList
          factions={factions}
          loading={loading}
          hasMore={hasMore}
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter as (filter: FactionType | 'all') => void}
          selectedFactionId={selectedFaction?.id}
          onFactionSelect={setSelectedFaction}
          onLoadMore={loadMore}
          onConfirm={confirmFaction}
          onReject={rejectFaction}
        />
      </div>

      <div className="flex-1 flex flex-col">
        {selectedFaction ? (
          <KBFactionDetail
            faction={selectedFaction}
            references={selectedFactionRefs}
            loading={loadingRefs}
            onClose={() => setSelectedFaction(null)}
            onConfirm={confirmFaction}
            onReject={rejectFaction}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--color-ink-light)]">
            <div className="text-center">
              <p className="text-lg mb-2">选择势力查看详情</p>
              <p className="text-sm">从左侧列表选择一个势力</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
