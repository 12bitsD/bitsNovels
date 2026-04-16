import { BookOpen, Loader2 } from 'lucide-react';

import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { useKBSetting } from '../../hooks/useKBSetting';
import KBSettingDetail from './KBSettingDetail';
import KBSettingList from './KBSettingList';

interface KBSettingPanelProps {
  projectId: string;
}

export default function KBSettingPanel({ projectId }: KBSettingPanelProps) {
  const {
    items,
    loading,
    detailLoading,
    error,
    search,
    category,
    selectedSettingId,
    selectedSetting,
    setSearch,
    setCategory,
    setSelectedSettingId,
  } = useKBSetting(projectId);

  const newDiscoveryCount = items.filter((item) => item.source === 'ai' && !item.confirmed).length;

  return (
    <div className="flex h-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
      <div className="flex w-96 flex-shrink-0 flex-col border-r border-[var(--color-border)]">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-parchment)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-amber)]/10 text-[var(--color-amber)]">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--color-ink)]">世界观设定</h2>
              <p className="text-xs text-[var(--color-ink-light)]">
                {items.length} 条设定
                {newDiscoveryCount > 0 ? ` · ${newDiscoveryCount} 条待确认` : ''}
              </p>
            </div>
            {loading ? (
              <Loader2 className="ml-auto h-4 w-4 animate-spin text-[var(--color-ink-light)]" />
            ) : null}
          </div>
          {error ? <ErrorAlert error={error} className="mt-3" /> : null}
        </div>

        <div className="min-h-0 flex-1">
          <KBSettingList
            items={items}
            loading={loading}
            search={search}
            category={category}
            selectedId={selectedSettingId}
            onSearchChange={setSearch}
            onCategoryChange={setCategory}
            onSelect={(id) => setSelectedSettingId(id)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <KBSettingDetail setting={selectedSetting} loading={detailLoading} />
      </div>
    </div>
  );
}

