import { useState } from 'react';
import { Search, List, Network, CheckCircle2, Loader2 } from 'lucide-react';
import type { KBLocation, KBLocationTreeNode, LocationType } from './types';
import { LOCATION_TYPE_LABELS } from './types';
import KBLocationCard from './KBLocationCard';

interface KBLocationListProps {
  locations: KBLocation[];
  tree: KBLocationTreeNode[];
  loading: boolean;
  search?: string;
  viewMode?: 'list' | 'tree';
  selectedIds?: string[];
  onLocationClick?: (location: KBLocation) => void;
  onSelectionChange?: (ids: string[]) => void;
  onSearchChange?: (value: string) => void;
  onTypeFilterChange?: (value: LocationType | undefined) => void;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onBulkConfirm?: (ids: string[]) => void;
}

const NEW_DISCOVERY_THRESHOLD_HOURS = 24;

export default function KBLocationList({
  locations,
  tree,
  loading,
  search = '',
  viewMode = 'list',
  selectedIds = [],
  onLocationClick,
  onSelectionChange,
  onSearchChange,
  onTypeFilterChange,
  onConfirm,
  onReject,
  onBulkConfirm,
}: KBLocationListProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [typeFilter, setTypeFilter] = useState<LocationType | ''>('');

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  const handleTypeChange = (value: LocationType | '') => {
    setTypeFilter(value);
    onTypeFilterChange?.(value === '' ? undefined : value);
  };

  const handleSelect = (id: string, selected: boolean) => {
    if (selected) {
      onSelectionChange?.([...selectedIds, id]);
    } else {
      onSelectionChange?.(selectedIds.filter(i => i !== id));
    }
  };

  const handleBulkConfirm = () => {
    onBulkConfirm?.(selectedIds);
  };

  const newDiscoveryCount = locations.filter(loc => {
    if (loc.source !== 'ai' || loc.confirmed) return false;
    const createdAt = new Date(loc.createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return diffHours < NEW_DISCOVERY_THRESHOLD_HOURS;
  }).length;

  const renderTreeNode = (node: KBLocationTreeNode, depth = 0): React.ReactNode => {
    return (
      <div key={node.id} style={{ marginLeft: depth * 24 }}>
        <KBLocationCard
          location={node}
          parentLocations={locations}
          selected={selectedIds.includes(node.id)}
          onClick={onLocationClick}
          onSelect={onSelectionChange ? handleSelect : undefined}
          onConfirm={onConfirm}
          onReject={onReject}
        />
        {node.children.length > 0 && (
          <div className="mt-2 space-y-2">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading && locations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[var(--color-amber)]" size={24} />
        <span className="ml-2 text-[var(--color-ink-light)]">加载中...</span>
      </div>
    );
  }

  if (locations.length === 0 && !search && !typeFilter) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--color-ink-light)]">
        <p>暂无地点</p>
        {newDiscoveryCount > 0 && (
          <span className="mt-2 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full">
            新发现 {newDiscoveryCount}
          </span>
        )}
      </div>
    );
  }

  if (locations.length === 0 && (search || typeFilter)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--color-ink-light)]">
        <p>未找到匹配「{search || typeFilter}」的地点</p>
      </div>
    );
  }

  const filteredLocations = locations.filter(loc => {
    if (localSearch && !loc.name.toLowerCase().includes(localSearch.toLowerCase())) {
      return false;
    }
    if (typeFilter && loc.locationType !== typeFilter) {
      return false;
    }
    return true;
  });

  const unconfirmedCount = filteredLocations.filter(l => l.source === 'ai' && !l.confirmed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-light)]" />
          <input
            type="text"
            placeholder="搜索地点名称..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber/20 focus:border-amber"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value as LocationType | '')}
          className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber/20"
          aria-label="筛选地点类型"
        >
          <option value="">全部类型</option>
          {Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => {}}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow text-amber' : 'text-[var(--color-ink-light)]'}`}
            aria-label="列表视图"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => {}}
            className={`p-2 rounded ${viewMode === 'tree' ? 'bg-white shadow text-amber' : 'text-[var(--color-ink-light)]'}`}
            aria-label="树状视图"
          >
            <Network size={16} />
          </button>
        </div>
      </div>

      {newDiscoveryCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full">
            新发现 {newDiscoveryCount}
          </span>
          {unconfirmedCount > 0 && (
            <span className="text-sm text-[var(--color-ink-light)]">
              待确认 {unconfirmedCount}
            </span>
          )}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-amber-light/20 border border-amber/30 rounded-md">
          <span className="text-sm font-medium text-[var(--color-ink)]">
            已选择{selectedIds.length}项
          </span>
          <button
            onClick={handleBulkConfirm}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-amber rounded-md hover:bg-amber/90 transition-colors"
          >
            <CheckCircle2 size={14} />
            批量确认
          </button>
        </div>
      )}

      <div className="space-y-2">
        {viewMode === 'tree' ? (
          tree.map(node => renderTreeNode(node))
        ) : (
          filteredLocations.map(location => (
            <KBLocationCard
              key={location.id}
              location={location}
              parentLocations={locations}
              selected={selectedIds.includes(location.id)}
              onClick={onLocationClick}
              onSelect={onSelectionChange ? handleSelect : undefined}
              onConfirm={onConfirm}
              onReject={onReject}
            />
          ))
        )}
      </div>
    </div>
  );
}
