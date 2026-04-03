import { MapPin, Building, Home, TreePine, Globe, HelpCircle, Users, BookOpen, Check, X } from 'lucide-react';
import type { KBLocation, LocationType } from './types';
import { LOCATION_TYPE_LABELS } from './types';

const LOCATION_ICONS: Record<LocationType, React.ElementType> = {
  city: Building,
  village: Home,
  building: MapPin,
  nature: TreePine,
  virtual: Globe,
  other: HelpCircle,
};

interface KBLocationCardProps {
  location: KBLocation;
  parentLocations?: KBLocation[];
  selected?: boolean;
  onClick?: (location: KBLocation) => void;
  onSelect?: (id: string, selected: boolean) => void;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
}

const isNewDiscovery = (location: KBLocation): boolean => {
  if (location.source !== 'ai' || location.confirmed) return false;
  const createdAt = new Date(location.createdAt);
  const now = new Date();
  const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return diffHours < 24;
};

export default function KBLocationCard({
  location,
  parentLocations = [],
  selected = false,
  onClick,
  onSelect,
  onConfirm,
  onReject,
}: KBLocationCardProps) {
  const Icon = LOCATION_ICONS[location.locationType];
  const parentLocation = location.parentId 
    ? parentLocations.find(p => p.id === location.parentId) 
    : null;

  const handleClick = () => {
    onClick?.(location);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(location.id, !selected);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirm?.(location.id);
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReject?.(location.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={`
        relative p-4 bg-white rounded-lg border transition-all duration-200 cursor-pointer
        hover:shadow-md hover:border-amber/50
        ${selected ? 'border-amber ring-2 ring-amber/20' : 'border-[var(--color-border)]'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          ${location.locationType === 'city' ? 'bg-blue-100 text-blue-600' : ''}
          ${location.locationType === 'village' ? 'bg-green-100 text-green-600' : ''}
          ${location.locationType === 'building' ? 'bg-orange-100 text-orange-600' : ''}
          ${location.locationType === 'nature' ? 'bg-emerald-100 text-emerald-600' : ''}
          ${location.locationType === 'virtual' ? 'bg-purple-100 text-purple-600' : ''}
          ${location.locationType === 'other' ? 'bg-gray-100 text-gray-600' : ''}
        `}>
          <Icon size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-[var(--color-ink)] truncate">{location.name}</h3>
            {location.source === 'ai' && !location.confirmed && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-amber/10 text-amber rounded">
                AI识别-待确认
              </span>
            )}
            {isNewDiscovery(location) && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                新发现
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-[var(--color-ink-light)]">
            <span>{LOCATION_TYPE_LABELS[location.locationType]}</span>
            {parentLocation && (
              <span className="truncate">上级: {parentLocation.name}</span>
            )}
          </div>

          {location.aliases.length > 0 && (
            <p className="text-xs text-[var(--color-ink-light)] mt-1 truncate">
              别名: {location.aliases.join(', ')}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-ink-light)]">
            {location.characterIds.length > 0 && (
              <span className="flex items-center gap-1">
                <Users size={12} />
                {location.characterIds.length}
              </span>
            )}
            {location.chapterIds.length > 0 && (
              <span className="flex items-center gap-1">
                <BookOpen size={12} />
                {location.chapterIds.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSelect && (
            <button
              onClick={handleSelect}
              className={`
                w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                ${selected 
                  ? 'bg-amber border-amber text-white' 
                  : 'border-[var(--color-border)] hover:border-amber/50'
                }
              `}
              aria-label={selected ? '取消选择' : '选择'}
            >
              {selected && <Check size={12} />}
            </button>
          )}
        </div>
      </div>

      {location.source === 'ai' && !location.confirmed && (onConfirm || onReject) && (
        <div 
          className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)]/50"
          onClick={(e) => e.stopPropagation()}
        >
          {onConfirm && (
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-amber rounded hover:bg-amber/90 transition-colors"
            >
              <Check size={14} />
              确认
            </button>
          )}
          {onReject && (
            <button
              onClick={handleReject}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--color-ink-light)] bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              <X size={14} />
              标记非地点
            </button>
          )}
        </div>
      )}
    </div>
  );
}
