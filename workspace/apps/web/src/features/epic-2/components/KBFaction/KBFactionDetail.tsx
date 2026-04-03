import { useState } from 'react';
import { X, Check, AlertCircle, Loader2, Users, Heart, Swords, BookOpen, Tag } from 'lucide-react';
import type { KBFaction, KBFactionReferences } from './types';
import { FACTION_TYPE_LABELS } from './types';

type DetailTab = 'members' | 'allies' | 'rivals' | 'chapters';

interface KBFactionDetailProps {
  faction: KBFaction;
  references: KBFactionReferences | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}

const TABS: { id: DetailTab; label: string; icon: typeof Users }[] = [
  { id: 'members', label: '成员', icon: Users },
  { id: 'allies', label: '同盟', icon: Heart },
  { id: 'rivals', label: '对立', icon: Swords },
  { id: 'chapters', label: '章节', icon: BookOpen },
];

export default function KBFactionDetail({
  faction,
  references,
  loading,
  onClose,
  onConfirm,
  onReject,
}: KBFactionDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('members');

  const isUnconfirmed = !faction.confirmed && faction.source === 'ai';
  const typeLabel = FACTION_TYPE_LABELS[faction.factionType];

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-[var(--color-amber)]" size={24} />
        </div>
      );
    }

    switch (activeTab) {
      case 'members':
        if (!references?.characters?.length) {
          return (
            <div className="text-center py-8 text-[var(--color-ink-light)]">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无成员信息</p>
            </div>
          );
        }
        return (
          <ul className="space-y-2">
            {references.characters.map(char => (
              <li
                key={char.id}
                className="flex items-center gap-2 p-2 rounded-md bg-[var(--color-parchment)]"
              >
                <Users size={16} className="text-[var(--color-ink-light)]" />
                <span className="text-sm text-[var(--color-ink)]">{char.name}</span>
              </li>
            ))}
          </ul>
        );

      case 'allies':
        if (!references?.factions?.filter(f => faction.allyFactionIds.includes(f.id)).length) {
          return (
            <div className="text-center py-8 text-[var(--color-ink-light)]">
              <Heart size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无同盟势力</p>
            </div>
          );
        }
        return (
          <ul className="space-y-2">
            {references.factions
              .filter(f => faction.allyFactionIds.includes(f.id))
              .map(f => (
                <li
                  key={f.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-emerald-50 border border-emerald-100"
                >
                  <Heart size={16} className="text-emerald-600" />
                  <span className="text-sm text-[var(--color-ink)]">{f.name}</span>
                </li>
              ))}
          </ul>
        );

      case 'rivals':
        if (!references?.factions?.filter(f => faction.rivalFactionIds.includes(f.id)).length) {
          return (
            <div className="text-center py-8 text-[var(--color-ink-light)]">
              <Swords size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无对立势力</p>
            </div>
          );
        }
        return (
          <ul className="space-y-2">
            {references.factions
              .filter(f => faction.rivalFactionIds.includes(f.id))
              .map(f => (
                <li
                  key={f.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-red-50 border border-red-100"
                >
                  <Swords size={16} className="text-red-600" />
                  <span className="text-sm text-[var(--color-ink)]">{f.name}</span>
                </li>
              ))}
          </ul>
        );

      case 'chapters':
        if (!references?.chapters?.length) {
          return (
            <div className="text-center py-8 text-[var(--color-ink-light)]">
              <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
              <p>暂无章节引用</p>
            </div>
          );
        }
        return (
          <ul className="space-y-2">
            {references.chapters.map(ch => (
              <li
                key={ch.id}
                className="flex items-center gap-2 p-2 rounded-md bg-[var(--color-parchment)]"
              >
                <BookOpen size={16} className="text-[var(--color-ink-light)]" />
                <span className="text-sm text-[var(--color-ink)]">{ch.title}</span>
              </li>
            ))}
          </ul>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg text-[var(--color-ink)]">{faction.name}</h2>
          {isUnconfirmed && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
              AI识别-待确认
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-[var(--color-ink-light)] hover:text-[var(--color-ink)] hover:bg-[var(--color-parchment)] transition-colors"
          aria-label="关闭"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-parchment)]/50">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Tag size={14} className="text-[var(--color-ink-light)]" />
            <span className="text-[var(--color-ink-light)]">类型:</span>
            <span className="text-[var(--color-ink)]">{typeLabel}</span>
          </div>

          {faction.aliases.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--color-ink-light)]">别名:</span>
              <span className="text-[var(--color-ink)]">{faction.aliases.join(', ')}</span>
            </div>
          )}

          {faction.summary && (
            <p className="text-sm text-[var(--color-ink-light)] mt-2">{faction.summary}</p>
          )}

          {isUnconfirmed && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onConfirm(faction.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium
                           bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                <Check size={16} />
                确认
              </button>
              <button
                onClick={() => onReject(faction.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium
                           bg-white text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
              >
                <AlertCircle size={16} />
                标记非势力
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="border-b border-[var(--color-border)]">
        <nav className="flex" role="tablist">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const count =
              tab.id === 'members'
                ? faction.memberCharacterIds.length
                : tab.id === 'allies'
                  ? faction.allyFactionIds.length
                  : tab.id === 'rivals'
                    ? faction.rivalFactionIds.length
                    : faction.chapterIds.length;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium
                  transition-colors relative
                  ${activeTab === tab.id
                    ? 'text-[var(--color-amber)]'
                    : 'text-[var(--color-ink-light)] hover:text-[var(--color-ink)] hover:bg-[var(--color-parchment)]/50'
                  }
                `}
              >
                <Icon size={14} />
                {tab.label}
                <span
                  className={`
                    ml-0.5 text-xs
                    ${activeTab === tab.id ? 'text-[var(--color-amber)]' : 'text-[var(--color-ink-light)]'}
                  `}
                >
                  {count}
                </span>
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-amber)]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {renderTabContent()}
      </div>
    </div>
  );
}
