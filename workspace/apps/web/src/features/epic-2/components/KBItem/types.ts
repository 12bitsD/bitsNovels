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

export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'token' | 'other';

export interface KBOwnershipRecord {
  fromCharacterId?: string;
  toCharacterId?: string;
  chapterId: string;
  note?: string;
  createdAt: string;
}

export interface KBItem extends KBEntityBase {
  type: 'item';
  name: string;
  aliases: string[];
  itemType: ItemType;
  summary?: string;
  ownerCharacterId?: string;
  ownershipHistory: KBOwnershipRecord[];
  chapterIds: string[];
  rawAI?: {
    summary?: string;
    ownerCharacterId?: string;
  };
  isRejected?: boolean;
}

export interface KBItemListResponse {
  items: KBItem[];
  total: number;
}

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
  consumable: '消耗品',
  token: '信物',
  other: '其他',
};
