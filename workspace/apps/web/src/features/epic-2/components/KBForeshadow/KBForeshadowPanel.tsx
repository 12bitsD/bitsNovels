import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import { ErrorAlert } from '../../../../components/ui/ErrorAlert';
import { useKBForeshadow } from '../../hooks/useKBForeshadow';
import CreateForeshadowDialog from './CreateForeshadowDialog';
import KBForeshadowDetail from './KBForeshadowDetail';
import KBForeshadowList from './KBForeshadowList';

interface KBForeshadowPanelProps {
  projectId: string;
}

export default function KBForeshadowPanel({ projectId }: KBForeshadowPanelProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const {
    foreshadows,
    loading,
    detailLoading,
    saving,
    creating,
    error,
    search,
    statusFilter,
    selectedForeshadow,
    setSearch,
    setStatusFilter,
    selectForeshadow,
    clearSelection,
    createForeshadow,
    saveForeshadow,
    confirmSuggestion,
  } = useKBForeshadow({ projectId });

  return (
    <div className="flex h-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-white">
      <div className={`flex w-96 flex-col ${selectedForeshadow ? 'border-r border-[var(--color-border)]' : 'w-full'}`}>
        <div className="border-b border-[var(--color-border)] bg-[var(--color-parchment)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
                <Flag size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-ink)]">伏笔知识库</h2>
                <p className="text-xs text-[var(--color-ink-light)]">{foreshadows.length} 条伏笔</p>
              </div>
            </div>

            <button
              type="button"
              aria-label="手动创建伏笔"
              onClick={() => setCreateDialogOpen(true)}
              className="rounded-md bg-[var(--color-amber)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-amber-dark)]"
            >
              手动创建
            </button>
          </div>
        </div>

        {error && <ErrorAlert error={error} className="m-4 mb-0" />}

        <div className="flex-1 overflow-y-auto p-4">
          <KBForeshadowList
            foreshadows={foreshadows}
            loading={loading}
            search={search}
            statusFilter={statusFilter}
            selectedForeshadowId={selectedForeshadow?.id}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onSelectForeshadow={(foreshadow) => {
              void selectForeshadow(foreshadow.id);
            }}
          />
        </div>
      </div>

      {selectedForeshadow && (
        <div className="flex-1 min-w-0">
          {detailLoading ? (
            <div className="flex h-full items-center justify-center text-[var(--color-ink-light)]">
              <Loader2 size={20} className="animate-spin text-[var(--color-amber)]" />
              <span className="ml-2">加载详情中...</span>
            </div>
          ) : (
            <KBForeshadowDetail
              foreshadow={selectedForeshadow}
              saving={saving}
              onClose={clearSelection}
              onSave={async (payload) => {
                await saveForeshadow(selectedForeshadow.id, payload);
              }}
              onConfirmSuggestion={async (suggestion) => {
                await confirmSuggestion(selectedForeshadow.id, suggestion);
              }}
            />
          )}
        </div>
      )}

      <CreateForeshadowDialog
        open={createDialogOpen}
        creating={creating}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={async (payload) => {
          const created = await createForeshadow(payload);
          if (created) {
            setCreateDialogOpen(false);
          }
        }}
      />
    </div>
  );
}
