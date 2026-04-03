import { useState } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useKBLocation } from '../../hooks/useKBLocation';
import KBLocationList from './KBLocationList';
import KBLocationDetail from './KBLocationDetail';
import type { KBLocation, KBLocationReferences } from './types';

interface KBLocationPanelProps {
  projectId: string;
  selectedLocationId?: string;
}

export default function KBLocationPanel({ projectId, selectedLocationId }: KBLocationPanelProps) {
  const {
    locations,
    tree,
    loading,
    error,
    search,
    locationType,
    selectedIds,
    confirmDialogOpen,
    bulkConfirmDialogOpen,
    mergeDialogOpen,
    pendingConfirmId,
    pendingBulkConfirmIds,
    pendingMergeSourceId,
    locationsMap,
    handleSearchChange,
    handleTypeFilterChange,
    handleConfirm,
    handleReject,
    handleBulkConfirm,
    handleMerge,
    setConfirmDialogOpen,
    setBulkConfirmDialogOpen,
    setMergeDialogOpen,
    confirmLocation,
    bulkConfirm,
    mergeLocation,
    setSelectedIds,
  } = useKBLocation(projectId);

  const selectedLocation = selectedLocationId ? locationsMap[selectedLocationId] : null;
  const parentLocation = selectedLocation?.parentId ? locationsMap[selectedLocation.parentId] : null;

  const [detailLoading, setDetailLoading] = useState(false);
  const [references, setReferences] = useState<KBLocationReferences | null>(null);

  const handleLocationClick = async (location: KBLocation) => {
    setSelectedIds([location.id]);
    
    if (location.chapterIds.length > 0 || location.characterIds.length > 0) {
      setDetailLoading(true);
    }
  };

  const handleCloseDetail = () => {
    setSelectedIds([]);
  };

  const handleConfirmDialogConfirm = async () => {
    if (pendingConfirmId) {
      await confirmLocation(pendingConfirmId);
    }
    setConfirmDialogOpen(false);
  };

  const handleBulkConfirmDialogConfirm = async () => {
    await bulkConfirm(pendingBulkConfirmIds);
    setBulkConfirmDialogOpen(false);
  };

  const handleMergeDialogConfirm = async () => {
    if (pendingMergeSourceId) {
      await mergeLocation(pendingMergeSourceId, '');
    }
    setMergeDialogOpen(false);
  };

  const newDiscoveryCount = locations.filter(loc => {
    if (loc.source !== 'ai' || loc.confirmed) return false;
    const createdAt = new Date(loc.createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  }).length;

  return (
    <div className="h-full flex flex-col bg-[var(--color-parchment)]">
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber/10 rounded-lg flex items-center justify-center">
            <MapPin size={20} className="text-amber" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-ink)]">地点知识库</h1>
            {newDiscoveryCount > 0 && (
              <span className="text-sm text-green-600 font-medium">
                新发现 {newDiscoveryCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-y-auto p-4 ${selectedLocation ? 'border-r border-[var(--color-border)]' : ''}`}>
          <KBLocationList
            locations={locations}
            tree={tree}
            loading={loading}
            search={search}
            viewMode="list"
            selectedIds={selectedIds}
            onLocationClick={handleLocationClick}
            onSelectionChange={setSelectedIds}
            onSearchChange={handleSearchChange}
            onTypeFilterChange={handleTypeFilterChange}
            onConfirm={handleConfirm}
            onReject={handleReject}
            onBulkConfirm={handleBulkConfirm}
          />
        </div>

        {selectedLocation && (
          <div className="w-96 flex-shrink-0 overflow-hidden">
            <KBLocationDetail
              location={selectedLocation}
              parentLocation={parentLocation}
              references={references || undefined}
              onClose={handleCloseDetail}
              onConfirm={handleConfirm}
              onReject={handleReject}
              onMerge={handleMerge}
            />
          </div>
        )}
      </div>

      {confirmDialogOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setConfirmDialogOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[var(--color-ink)] mb-2">确认地点</h2>
            <p className="text-[var(--color-ink-light)] mb-4">确定要确认这个地点吗？</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-ink)] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDialogConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-amber rounded-lg hover:bg-amber/90 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkConfirmDialogOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setBulkConfirmDialogOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[var(--color-ink)] mb-2">批量确认</h2>
            <p className="text-[var(--color-ink-light)] mb-4">
              确定要确认选中的 {pendingBulkConfirmIds.length} 个地点吗？
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBulkConfirmDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-ink)] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBulkConfirmDialogConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-amber rounded-lg hover:bg-amber/90 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {mergeDialogOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setMergeDialogOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-[var(--color-ink)] mb-2">合并地点</h2>
            <p className="text-[var(--color-ink-light)] mb-4">
              选择要合并到的目标地点
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMergeDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-ink)] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleMergeDialogConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-amber rounded-lg hover:bg-amber/90 transition-colors"
              >
                确认合并
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
