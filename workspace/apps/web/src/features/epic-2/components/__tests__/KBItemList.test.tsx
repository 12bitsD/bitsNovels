import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import KBItemList from '../KBItem/KBItemList';
import type { KBItem, ItemType } from '../KBItem/types';

const createKBItem = (id: string, overrides: Partial<KBItem> = {}): KBItem => ({
  id,
  projectId: 'project1',
  type: 'item',
  source: 'manual',
  confirmed: true,
  name: `道具${id}`,
  aliases: [],
  itemType: 'weapon' as ItemType,
  summary: '测试摘要',
  ownerCharacterId: 'char-owner',
  ownershipHistory: [],
  chapterIds: ['chapter-1'],
  createdAt: '2026-04-01T08:00:00Z',
  updatedAt: '2026-04-01T08:00:00Z',
  ...overrides,
});

describe('KBItemList', () => {
  it('renders search and type filter controls', () => {
    render(<KBItemList items={[createKBItem('1')]} loading={false} />);

    expect(screen.getByPlaceholderText('搜索道具名称...')).toBeInTheDocument();
    expect(screen.getByLabelText('筛选道具类型')).toBeInTheDocument();
  });

  it('filters items by search text and type', () => {
    render(
      <KBItemList
        items={[
          createKBItem('1', { name: '玄铁剑', itemType: 'weapon' }),
          createKBItem('2', { name: '护心镜', itemType: 'armor' }),
        ]}
        loading={false}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('搜索道具名称...'), {
      target: { value: '护心' },
    });

    expect(screen.getByText('护心镜')).toBeInTheDocument();
    expect(screen.queryByText('玄铁剑')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('筛选道具类型'), {
      target: { value: 'armor' },
    });

    expect(screen.getByRole('button', { name: '道具: 护心镜' })).toHaveTextContent('护甲');
  });

  it('renders new discoveries at the top of the list', () => {
    const oldItem = createKBItem('1', { name: '旧道具', source: 'manual' });
    const newItem = createKBItem('2', {
      name: '新道具',
      source: 'ai',
      confirmed: false,
      createdAt: new Date().toISOString(),
    });

    render(<KBItemList items={[oldItem, newItem]} loading={false} />);

    const list = screen.getByRole('list');
    const cards = within(list).getAllByRole('button', { name: /道具:/ });

    expect(cards[0]).toHaveTextContent('新道具');
    expect(cards[1]).toHaveTextContent('旧道具');
  });

  it('supports batch confirm for selected items', () => {
    const onBulkConfirm = vi.fn();

    render(
      <KBItemList
        items={[createKBItem('1'), createKBItem('2', { itemType: 'token' })]}
        loading={false}
        selectedIds={['1', '2']}
        onBulkConfirm={onBulkConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '批量确认选中道具' }));

    expect(onBulkConfirm).toHaveBeenCalledWith(['1', '2']);
  });

  it('renders an empty state when there are no items', () => {
    render(<KBItemList items={[]} loading={false} />);

    expect(screen.getByText('暂无道具')).toBeInTheDocument();
  });
});
