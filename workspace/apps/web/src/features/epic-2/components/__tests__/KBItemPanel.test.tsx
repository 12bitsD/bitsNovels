import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import KBItemPanel from '../KBItem/KBItemPanel';
import * as useKBItemModule from '../../hooks/useKBItem';
import type { KBItem, ItemType } from '../KBItem/types';

vi.mock('../../hooks/useKBItem');

const createKBItem = (id: string, overrides: Partial<KBItem> = {}): KBItem => ({
  id,
  projectId: 'project1',
  type: 'item',
  source: 'ai',
  confirmed: false,
  name: `道具${id}`,
  aliases: [],
  itemType: 'weapon' as ItemType,
  summary: '测试摘要',
  ownerCharacterId: 'char-owner',
  ownershipHistory: [],
  chapterIds: ['chapter-1'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const mockUseKBItem = (overrides: Partial<ReturnType<typeof useKBItemModule.useKBItem>> = {}) => {
  const defaultValue: ReturnType<typeof useKBItemModule.useKBItem> = {
    items: [] as KBItem[],
    loading: false,
    detailLoading: false,
    error: null,
    search: '',
    itemType: 'all',
    selectedIds: [],
    selectedItemId: null,
    selectedItem: null,
    setSearch: vi.fn(),
    setItemType: vi.fn(),
    setSelectedIds: vi.fn(),
    setSelectedItemId: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    confirmItem: vi.fn(),
    markAsNotItem: vi.fn(),
    batchConfirm: vi.fn(),
    refetch: vi.fn(),
  };

  return { ...defaultValue, ...overrides };
};

describe('KBItemPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the panel header and item count', () => {
    vi.mocked(useKBItemModule.useKBItem).mockReturnValue(
      mockUseKBItem({ items: [createKBItem('1'), createKBItem('2')] }),
    );

    render(<KBItemPanel projectId="project1" />);

    expect(screen.getByText('道具知识库')).toBeInTheDocument();
    expect(screen.getByText(/2 个道具/)).toBeInTheDocument();
  });

  it('shows an empty detail state when no item is selected', () => {
    vi.mocked(useKBItemModule.useKBItem).mockReturnValue(mockUseKBItem());

    render(<KBItemPanel projectId="project1" />);

    expect(screen.getByText('选择道具查看详情')).toBeInTheDocument();
  });

  it('renders the selected item detail and allows closing it', () => {
    const setSelectedItemId = vi.fn();
    const selectedItem = createKBItem('1', { name: '玄铁剑' });
    vi.mocked(useKBItemModule.useKBItem).mockReturnValue(
      mockUseKBItem({
        items: [selectedItem],
        selectedItemId: '1',
        selectedItem,
        setSelectedItemId,
      }),
    );

    render(<KBItemPanel projectId="project1" />);

    fireEvent.click(screen.getByLabelText('关闭'));

    expect(screen.getAllByText('玄铁剑').length).toBeGreaterThan(0);
    expect(setSelectedItemId).toHaveBeenCalledWith(null);
  });

  it('shows loading and error states from the hook', () => {
    vi.mocked(useKBItemModule.useKBItem).mockReturnValue(
      mockUseKBItem({ loading: true, error: '加载失败' }),
    );

    render(<KBItemPanel projectId="project1" />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.getByText('加载失败')).toBeInTheDocument();
  });
});
