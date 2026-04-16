import { useMemo, useState } from 'react';

import KBCharacterPanel from './KBCharacter/KBCharacterPanel';
import KBFactionPanel from './KBFaction/KBFactionPanel';
import KBForeshadowPanel from './KBForeshadow/KBForeshadowPanel';
import KBItemPanel from './KBItem/KBItemPanel';
import KBLocationPanel from './KBLocation/KBLocationPanel';
import KBSettingPanel from './KBSetting/KBSettingPanel';

type KnowledgeBaseTab = 'character' | 'location' | 'item' | 'faction' | 'foreshadow' | 'setting';

const TAB_LABELS: Record<KnowledgeBaseTab, string> = {
  character: '角色',
  location: '地点',
  item: '道具',
  faction: '势力',
  foreshadow: '伏笔',
  setting: '设定',
};

interface KnowledgeBasePanelProps {
  projectId: string;
}

export default function KnowledgeBasePanel({ projectId }: KnowledgeBasePanelProps) {
  const [activeTab, setActiveTab] = useState<KnowledgeBaseTab>('character');

  const panel = useMemo(() => {
    switch (activeTab) {
      case 'character':
        return <KBCharacterPanel projectId={projectId} />;
      case 'location':
        return <KBLocationPanel projectId={projectId} />;
      case 'item':
        return <KBItemPanel projectId={projectId} />;
      case 'faction':
        return <KBFactionPanel projectId={projectId} />;
      case 'foreshadow':
        return <KBForeshadowPanel projectId={projectId} />;
      case 'setting':
        return <KBSettingPanel projectId={projectId} />;
      default:
        return <KBCharacterPanel projectId={projectId} />;
    }
  }, [activeTab, projectId]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TAB_LABELS) as KnowledgeBaseTab[]).map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-[var(--color-amber)]/45 bg-[var(--color-amber-light)]/70 text-[var(--color-text-primary)]'
                  : 'border-border bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-panel-muted)]'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1">{panel}</div>
    </div>
  );
}

