// KBLocation types matching contract.md

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

export type LocationType = 'city' | 'village' | 'building' | 'nature' | 'virtual' | 'other';

export interface KBLocation extends KBEntityBase {
  type: 'location';
  name: string;
  aliases: string[];
  locationType: LocationType;
  parentId?: string;
  description?: string;
  characterIds: string[];
  chapterIds: string[];
  rawAI?: Partial<KBLocationAIFields>;
}

export interface KBLocationAIFields {
  description?: string;
  parentId?: string;
  characterIds?: string[];
}

export interface KBLocationTreeNode extends KBLocation {
  children: KBLocationTreeNode[];
}

export interface KBLocationListResponse {
  items: KBLocation[];
  total: number;
  has_more: boolean;
}

export interface KBLocationReferences {
  chapters: Array<{
    id: string;
    title: string;
    order: number;
  }>;
  characters: Array<{
    id: string;
    name: string;
  }>;
}

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  city: '城市',
  village: '村庄',
  building: '建筑',
  nature: '自然',
  virtual: '虚拟',
  other: '其他',
};

export const LOCATION_TYPE_ICONS: Record<LocationType, string> = {
  city: 'City',
  village: 'Home',
  building: 'Building',
  nature: 'TreePine',
  virtual: 'Globe',
  other: 'MapPin',
};
