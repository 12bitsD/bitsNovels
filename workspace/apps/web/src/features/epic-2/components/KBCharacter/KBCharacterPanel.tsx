import { useMemo, useState } from 'react';
import { BadgeHelp, Sparkles, Users } from 'lucide-react';
import { useKBCharacter } from '../../hooks/useKBCharacter';
import KBCharacterDetail from './KBCharacterDetail';
import KBCharacterList from './KBCharacterList';
import { isNewCharacterDiscovery, type KBCharacterChapterReference, type KBCharacterFactionReference } from './types';

type CharacterPanelTab = 'all' | 'pending' | 'new';

interface KBCharacterPanelProps {
  projectId: string;
  chapters?: KBCharacterChapterReference[];
  factions?: KBCharacterFactionReference[];
  onChapterSelect?: (chapterId: string) => void;
}

const TAB_LABELS: Record<CharacterPanelTab, string> = {
  all: '全部角色',
  pending: '待确认',
  new: '新发现',
};

export default function KBCharacterPanel({
  projectId,
  chapters = [],
  factions = [],
  onChapterSelect,
}: KBCharacterPanelProps) {
  const [activeTab, setActiveTab] = useState<CharacterPanelTab>('all');
  const {
    characters,
    loading,
    detailLoading,
    error,
    query,
    sortBy,
    selectedIds,
    selectedCharacter,
    setQuery,
    setSortBy,
    setSelectedIds,
    selectCharacter,
    updateCharacter,
    confirmCharacter,
    batchConfirmCharacters,
    markCharacterNotCharacter,
  } = useKBCharacter({ projectId });

  const filteredCharacters = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return characters.filter((character) => character.source === 'ai' && !character.confirmed);
      case 'new':
        return characters.filter((character) => isNewCharacterDiscovery(character));
      default:
        return characters;
    }
  }, [activeTab, characters]);

  const tabCounts = useMemo(
    () => ({
      all: characters.length,
      pending: characters.filter((character) => character.source === 'ai' && !character.confirmed).length,
      new: characters.filter((character) => isNewCharacterDiscovery(character)).length,
    }),
    [characters],
  );

  const chapterLabels = useMemo(
    () =>
      Object.fromEntries(
        characters.map((character) => {
          const chapter = chapters.find((item) => item.id === character.lastAppearanceChapterId);
          return [character.id, chapter?.title ?? character.lastAppearanceChapterId ?? '最近章节未知'];
        }),
      ),
    [chapters, characters],
  );

  const selectedFactionName = selectedCharacter?.factionId
    ? factions.find((faction) => faction.id === selectedCharacter.factionId)?.name
    : undefined;

  const selectedChapters = selectedCharacter
    ? selectedCharacter.chapterIds.map((chapterId) => chapters.find((chapter) => chapter.id === chapterId) ?? { id: chapterId, title: chapterId, order: 0 })
    : [];

  return (
    <div
      data-testid="kb-character-panel"
      className="flex h-full min-w-0 w-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-white"
    >
      <div
        data-testid="kb-character-panel-list-rail"
        className="flex w-[clamp(17rem,38%,22rem)] flex-shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-parchment)]/40"
      >
        <div className="border-b border-[var(--color-border)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-parchment)] text-[var(--color-amber)]">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-ink)]">角色知识库</h2>
              <p className="text-xs text-[var(--color-ink-light)]">AI 识别人物、确认与维护入口</p>
            </div>
          </div>
        </div>

        <div className="border-b border-[var(--color-border)] p-2">
          <div role="tablist" className="grid grid-cols-3 gap-2">
            {(['all', 'pending', 'new'] as CharacterPanelTab[]).map((tab) => {
              const Icon = tab === 'all' ? Users : tab === 'pending' ? BadgeHelp : Sparkles;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-label={TAB_LABELS[tab]}
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={[
                    'flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    activeTab === tab
                      ? 'bg-white text-[var(--color-amber)] shadow-sm'
                      : 'text-[var(--color-ink-light)] hover:bg-white/70 hover:text-[var(--color-ink)]',
                  ].join(' ')}
                >
                  <Icon size={14} />
                  {TAB_LABELS[tab]}
                  <span className="text-xs">{tabCounts[tab]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 p-4">
          <KBCharacterList
            characters={filteredCharacters}
            loading={loading}
            search={query}
            sortBy={sortBy}
            selectedIds={selectedIds}
            lastAppearanceLabels={chapterLabels}
            onSearchChange={setQuery}
            onSortChange={setSortBy}
            onCharacterSelect={(character) => void selectCharacter(character.id)}
            onSelectionChange={setSelectedIds}
            onConfirm={(id) => void confirmCharacter(id)}
            onMarkNotCharacter={(id) => void markCharacterNotCharacter(id)}
            onBatchConfirm={(ids) => void batchConfirmCharacters(ids)}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        {selectedCharacter ? (
          <KBCharacterDetail
            character={selectedCharacter}
            chapters={selectedChapters}
            factionName={selectedFactionName}
            onClose={() => void selectCharacter(null)}
            onConfirm={(id) => void confirmCharacter(id)}
            onMarkNotCharacter={(id) => void markCharacterNotCharacter(id)}
            onChapterSelect={onChapterSelect}
            onSave={(id, payload) => void updateCharacter(id, payload)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center px-8 text-center text-[var(--color-ink-light)]">
            <div>
              <p className="text-lg text-[var(--color-ink)]">{detailLoading ? '加载角色详情...' : '选择角色查看详情'}</p>
              <p className="mt-2 text-sm">从左侧列表选择角色，查看识别字段、章节出场和确认操作。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
