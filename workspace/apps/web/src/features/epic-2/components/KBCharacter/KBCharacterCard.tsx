import { Check, ShieldBan, Sparkles, User, Users } from 'lucide-react';
import type { KBCharacter } from './types';

interface KBCharacterCardProps {
  character: KBCharacter;
  selected?: boolean;
  isNew?: boolean;
  lastAppearanceLabel?: string;
  onClick?: (character: KBCharacter) => void;
  onSelect?: (id: string, selected: boolean) => void;
  onConfirm?: (id: string) => void;
  onMarkNotCharacter?: (id: string) => void;
}

export default function KBCharacterCard({
  character,
  selected = false,
  isNew = false,
  lastAppearanceLabel,
  onClick,
  onSelect,
  onConfirm,
  onMarkNotCharacter,
}: KBCharacterCardProps) {
  const showPendingActions = character.source === 'ai' && !character.confirmed;

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`角色: ${character.name}`}
      onClick={() => onClick?.(character)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.(character);
        }
      }}
      className={[
        'rounded-lg border bg-white p-4 transition-all duration-200',
        selected
          ? 'border-[var(--color-amber)] bg-[var(--color-parchment)] shadow-sm'
          : 'border-[var(--color-border)] hover:border-[var(--color-amber)]/50 hover:shadow-sm',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--color-parchment)] text-[var(--color-ink-light)]">
          <User size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-[var(--color-ink)]">{character.name}</h3>
            {showPendingActions && (
              <span className="rounded px-1.5 py-0.5 text-xs font-medium text-[var(--color-amber)] bg-[var(--color-parchment)]">
                AI识别-待确认
              </span>
            )}
            {isNew && (
              <span className="rounded px-1.5 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-100">
                新发现
              </span>
            )}
          </div>

          {character.occupation && (
            <p className="mt-1 text-sm text-[var(--color-ink-light)]">{character.occupation}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-ink-light)]">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {character.appearanceCount} 次出场
            </span>
            {lastAppearanceLabel && <span>最近出场：{lastAppearanceLabel}</span>}
          </div>
        </div>

        {onSelect && (
          <label className="mt-1 flex items-center" onClick={(event) => event.stopPropagation()}>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-amber)]"
              checked={selected}
              aria-label={`选择角色 ${character.name}`}
              onChange={() => onSelect(character.id, !selected)}
            />
          </label>
        )}
      </div>

      {showPendingActions && (onConfirm || onMarkNotCharacter) && (
        <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border)] pt-3" onClick={(event) => event.stopPropagation()}>
          {onConfirm && (
            <button
              type="button"
              aria-label={`确认角色 ${character.name}`}
              onClick={() => onConfirm(character.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[var(--color-amber)] px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
            >
              <Check size={14} />
              确认
            </button>
          )}
          {onMarkNotCharacter && (
            <button
              type="button"
              aria-label={`标记 ${character.name} 为非角色`}
              onClick={() => onMarkNotCharacter(character.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-light)] transition-colors hover:bg-[var(--color-parchment)]"
            >
              <ShieldBan size={14} />
              标记非角色
            </button>
          )}
        </div>
      )}

      {isNew && (
        <div className="mt-3 flex items-center gap-1 text-xs text-emerald-700">
          <Sparkles size={12} />
          <span>新识别角色会优先展示在列表顶部</span>
        </div>
      )}
    </article>
  );
}
