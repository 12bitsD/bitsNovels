import { Globe, Building, Briefcase, Users, Shield, Flag } from 'lucide-react';
import type { KBFaction, FactionType } from './types';
import { FACTION_TYPE_LABELS } from './types';

const FACTION_ICON_MAP: Record<FactionType, typeof Globe> = {
  country: Globe,
  sect: Building,
  company: Briefcase,
  gang: Users,
  military: Shield,
  other: Flag,
};

interface KBFactionCardProps {
  faction: KBFaction;
  isSelected?: boolean;
  isNew?: boolean;
  onClick?: (faction: KBFaction) => void;
}

export default function KBFactionCard({
  faction,
  isSelected = false,
  isNew = false,
  onClick,
}: KBFactionCardProps) {
  const Icon = FACTION_ICON_MAP[faction.factionType];
  const typeLabel = FACTION_TYPE_LABELS[faction.factionType];

  const handleClick = () => {
    onClick?.(faction);
  };

  const isUnconfirmed = !faction.confirmed && faction.source === 'ai';

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`势力: ${faction.name}`}
      className={`
        relative p-4 rounded-lg border cursor-pointer
        transition-all duration-200
        ${isSelected
          ? 'border-[var(--color-amber)] bg-amber/5 shadow-md'
          : 'border-[var(--color-border)] bg-white hover:border-[var(--color-amber)]/50 hover:shadow-sm'
        }
        ${isNew ? 'ring-2 ring-emerald-500/30' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 rounded-md bg-[var(--color-parchment)]">
          <Icon size={20} className="text-[var(--color-ink-light)]" strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-[var(--color-ink)] truncate">
              {faction.name}
            </h3>
            {isNew && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                新发现
              </span>
            )}
            {isUnconfirmed && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                AI识别-待确认
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--color-ink-light)] mt-1">
            {typeLabel}
            {faction.aliases.length > 0 && (
              <span className="ml-2 text-[var(--color-ink-light)]">
                别名: {faction.aliases.slice(0, 2).join(', ')}
                {faction.aliases.length > 2 && `...`}
              </span>
            )}
          </p>

          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-ink-light)]">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {faction.memberCharacterIds.length} 成员
            </span>
            {faction.allyFactionIds.length > 0 && (
              <span className="text-emerald-600">
                {faction.allyFactionIds.length} 同盟
              </span>
            )}
            {faction.rivalFactionIds.length > 0 && (
              <span className="text-red-600">
                {faction.rivalFactionIds.length} 对立
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
