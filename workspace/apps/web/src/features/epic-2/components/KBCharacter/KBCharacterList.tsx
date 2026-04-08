import { ListFilter, Search } from 'lucide-react';
import KBCharacterCard from './KBCharacterCard';
import { isNewCharacterDiscovery, type CharacterSortBy, type KBCharacter } from './types';

interface KBCharacterListProps {
  characters: KBCharacter[];
  loading: boolean;
  search: string;
  sortBy: CharacterSortBy;
  selectedIds?: string[];
  lastAppearanceLabels?: Record<string, string>;
  onSearchChange?: (value: string) => void;
  onSortChange?: (value: CharacterSortBy) => void;
  onCharacterSelect?: (character: KBCharacter) => void;
  onSelectionChange?: (ids: string[]) => void;
  onConfirm?: (id: string) => void;
  onMarkNotCharacter?: (id: string) => void;
  onBatchConfirm?: (ids: string[]) => void;
}

export default function KBCharacterList({
  characters,
  loading,
  search,
  sortBy,
  selectedIds = [],
  lastAppearanceLabels = {},
  onSearchChange,
  onSortChange,
  onCharacterSelect,
  onSelectionChange,
  onConfirm,
  onMarkNotCharacter,
  onBatchConfirm,
}: KBCharacterListProps) {
  const orderedCharacters = [...characters].sort((left, right) => {
    const leftNew = isNewCharacterDiscovery(left);
    const rightNew = isNewCharacterDiscovery(right);

    if (leftNew && !rightNew) {
      return -1;
    }

    if (!leftNew && rightNew) {
      return 1;
    }

    return 0;
  });

  const handleSelect = (id: string, selected: boolean) => {
    if (!onSelectionChange) {
      return;
    }

    if (selected) {
      onSelectionChange([...selectedIds, id]);
      return;
    }

    onSelectionChange(selectedIds.filter((value) => value !== id));
  };

  if (loading && characters.length === 0) {
    return <div className="py-12 text-center text-sm text-[var(--color-ink-light)]">加载中...</div>;
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-parchment)] p-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-light)]" />
          <input
            type="text"
            value={search}
            placeholder="搜索角色名称..."
            onChange={(event) => onSearchChange?.(event.target.value)}
            className="w-full rounded-md border border-[var(--color-border)] bg-white py-2 pl-9 pr-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-ink-light)] focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <ListFilter size={16} className="text-[var(--color-ink-light)]" />
          <select
            aria-label="角色排序方式"
            value={sortBy}
            onChange={(event) => onSortChange?.(event.target.value as CharacterSortBy)}
            className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-amber)] focus:ring-2 focus:ring-[var(--color-amber)]/20"
          >
            <option value="firstAppearance">按首次出场章节</option>
            <option value="appearanceCount">按出场次数</option>
          </select>
        </div>
      </div>

      {selectedIds.length > 0 && onBatchConfirm && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-parchment)] px-3 py-2">
          <span className="text-sm text-[var(--color-ink)]">已选择 {selectedIds.length} 项待确认角色</span>
          <button
            type="button"
            aria-label="批量确认角色"
            onClick={() => onBatchConfirm(selectedIds)}
            className="rounded-md bg-[var(--color-amber)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            全部确认
          </button>
        </div>
      )}

      {orderedCharacters.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-white text-sm text-[var(--color-ink-light)]">
          暂无角色
        </div>
      ) : (
        <ul role="list" className="space-y-3 overflow-y-auto pr-1">
          {orderedCharacters.map((character) => (
            <li key={character.id}>
              <KBCharacterCard
                character={character}
                selected={selectedIds.includes(character.id)}
                isNew={isNewCharacterDiscovery(character)}
                lastAppearanceLabel={lastAppearanceLabels[character.id]}
                onClick={onCharacterSelect}
                onSelect={onSelectionChange ? handleSelect : undefined}
                onConfirm={onConfirm}
                onMarkNotCharacter={onMarkNotCharacter}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
