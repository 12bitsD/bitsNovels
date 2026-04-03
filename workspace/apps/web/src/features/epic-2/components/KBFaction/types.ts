// KBFaction types matching contract.md

export type KBSource = 'ai' | 'manual';

export type KBEntityType =
  | 'character'
  | 'location'
  | 'item'
  | 'faction'
  | 'foreshadow'
  | 'setting';

export interface KBEntityBase {
  id: string;
  projectId: string;
  source: KBSource;
  confirmed: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type FactionType = 'country' | 'sect' | 'company' | 'gang' | 'military' | 'other';

export interface KBFaction extends KBEntityBase {
  type: 'faction';
  name: string;
  aliases: string[];
  factionType: FactionType;
  summary?: string;
  memberCharacterIds: string[];
  allyFactionIds: string[];
  rivalFactionIds: string[];
  chapterIds: string[];
  rawAI?: Partial<KBFactionAIFields>;
}

export interface KBFactionAIFields {
  summary?: string;
  memberCharacterIds?: string[];
  allyFactionIds?: string[];
  rivalFactionIds?: string[];
}

export interface KBFactionListResponse {
  items: KBFaction[];
  total: number;
  has_more: boolean;
}

export interface KBFactionReferences {
  chapters: Array<{
    id: string;
    title: string;
    order: number;
  }>;
  characters: Array<{
    id: string;
    name: string;
  }>;
  factions: Array<{
    id: string;
    name: string;
  }>;
}

export const FACTION_TYPE_LABELS: Record<FactionType, string> = {
  country: '国家',
  sect: '门派/宗门',
  company: '公司/商会',
  gang: '帮派/黑道',
  military: '军队/军事组织',
  other: '其他',
};

export const FACTION_TYPE_ICONS: Record<FactionType, string> = {
  country: 'Globe',
  sect: 'Building',
  company: 'Briefcase',
  gang: 'Users',
  military: 'Shield',
  other: 'Flag',
};
