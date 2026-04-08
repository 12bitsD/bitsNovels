export type KBSource = 'ai' | 'manual';

export interface KBEntityBase {
  id: string;
  projectId: string;
  source: KBSource;
  confirmed: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  restoreUntil?: string;
}

export interface KBCharacter extends KBEntityBase {
  type: 'character';
  name: string;
  aliases: string[];
  gender?: string;
  occupation?: string;
  appearance?: string;
  personalityTags: string[];
  factionId?: string;
  chapterIds: string[];
  firstAppearanceChapterId?: string;
  lastAppearanceChapterId?: string;
  appearanceCount: number;
  rawAI?: Partial<KBCharacterAIFields>;
}

export interface KBCharacterAIFields {
  gender?: string;
  occupation?: string;
  appearance?: string;
  personalityTags?: string[];
  factionId?: string;
}

export interface KBCharacterListResponse {
  items: KBCharacter[];
  total: number;
}

export type CharacterSortBy = 'firstAppearance' | 'appearanceCount';

export interface KBCharacterChapterReference {
  id: string;
  title: string;
  order: number;
}

export interface KBCharacterFactionReference {
  id: string;
  name: string;
}

export interface UpdateKBCharacterInput {
  name?: string;
  aliases?: string[];
  gender?: string;
  occupation?: string;
  appearance?: string;
  personalityTags?: string[];
  factionId?: string;
  chapterIds?: string[];
  remark?: string;
}

export const NEW_CHARACTER_DISCOVERY_HOURS = 24;

export function isNewCharacterDiscovery(character: KBCharacter): boolean {
  if (character.source !== 'ai' || character.confirmed) {
    return false;
  }

  const createdAt = new Date(character.createdAt);
  const now = new Date();
  const diffHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return diffHours < NEW_CHARACTER_DISCOVERY_HOURS;
}
