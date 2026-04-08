import { Loader2, Package } from 'lucide-react';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { useKBItem } from '../../hooks/useKBItem';
import KBItemDetail from './KBItemDetail';
import KBItemList from './KBItemList';

interface KBItemPanelProps {
  projectId: string;
}

export default function KBItemPanel({ projectId }: KBItemPanelProps) {
  const {
    items,
    loading,
    detailLoading,
    error,
    search,
    itemType,
    selectedIds,
    selectedItemId,
    selectedItem,
    setSearch,
    setItemType,
    setSelectedIds,
    setSelectedItemId,
    confirmItem,
    markAsNotItem,
    batchConfirm,
  } = useKBItem(projectId);

  const newDiscoveryCount = items.filter((item) => item.source === 'ai' && !item.confirmed).length;

  return (
    <div className="flex h-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
      <div className="flex w-96 flex-shrink-0 flex-col border-r border-[var(--color-border)]">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-parchment)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-amber)]/10 text-[var(--color-amber)]">
              <Package size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--color-ink)]">道具知识库</h2>
              <p className="text-xs text-[var(--color-ink-light)]">
                {items.length} 个道具
                {newDiscoveryCount > 0 ? ` · ${newDiscoveryCount} 个待确认` : ''}
              </p>
            </div>
          </div>
          {error && <ErrorAlert error={error} className="mt-3" />}
        </div>

        <div className="min-h-0 flex-1">
          <KBItemList
            items={items}
            loading={loading}
            search={search}
            itemType={itemType}
            selectedIds={selectedIds}
            selectedItemId={selectedItemId}
            onSearchChange={setSearch}
            onTypeFilterChange={setItemType}
            onItemSelect={(item) => setSelectedItemId(item.id)}
            onSelectionChange={setSelectedIds}
            onConfirm={confirmItem}
            onReject={markAsNotItem}
            onBulkConfirm={batchConfirm}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {detailLoading && !selectedItem ? (
          <div className="flex flex-1 items-center justify-center text-[var(--color-ink-light)]">
            <Loader2 className="animate-spin text-[var(--color-amber)]" size={24} />
            <span className="ml-2">加载中...</span>
          </div>
        ) : selectedItem ? (
          <KBItemDetail
            item={selectedItem}
            onClose={() => setSelectedItemId(null)}
            onConfirm={confirmItem}
            onReject={markAsNotItem}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-[var(--color-ink-light)]">
            <div className="text-center">
              <p className="mb-2 text-lg">选择道具查看详情</p>
              <p className="text-sm">从左侧列表中选择一个道具条目</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
