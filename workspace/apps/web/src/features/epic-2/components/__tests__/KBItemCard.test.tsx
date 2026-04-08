import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import KBItemCard from '../KBItem/KBItemCard';
import type { KBItem, ItemType } from '../KBItem/types';

const createKBItem = (overrides: Partial<KBItem> = {}): KBItem => ({
  id: 'item-1',
  projectId: 'project1',
  type: 'item',
  source: 'manual',
  confirmed: true,
  name: '玄铁剑',
  aliases: ['黑剑'],
  itemType: 'weapon' as ItemType,
  summary: '沉重锋利',
  ownerCharacterId: 'char-zhangsan',
  ownershipHistory: [],
  chapterIds: ['chapter-1', 'chapter-2'],
  remark: '藏于祖祠',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('KBItemCard', () => {
  it('renders item metadata on the card', () => {
    render(<KBItemCard item={createKBItem()} />);

    expect(screen.getByText('玄铁剑')).toBeInTheDocument();
    expect(screen.getByText('武器')).toBeInTheDocument();
    expect(screen.getByText(/当前持有者: char-zhangsan/)).toBeInTheDocument();
    expect(screen.getByText(/出现 2 次/)).toBeInTheDocument();
  });

  it('shows AI pending and new discovery badges for recent parser items', () => {
    render(
      <KBItemCard
        item={createKBItem({
          source: 'ai',
          confirmed: false,
          createdAt: new Date().toISOString(),
        })}
      />,
    );

    expect(screen.getByText('AI识别-待确认')).toBeInTheDocument();
    expect(screen.getByText('新发现')).toBeInTheDocument();
  });

  it('calls confirm and reject actions without triggering the card click', () => {
    const onClick = vi.fn();
    const onConfirm = vi.fn();
    const onReject = vi.fn();

    render(
      <KBItemCard
        item={createKBItem({ source: 'ai', confirmed: false })}
        onClick={onClick}
        onConfirm={onConfirm}
        onReject={onReject}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '确认道具' }));
    fireEvent.click(screen.getByRole('button', { name: '标记非道具' }));

    expect(onConfirm).toHaveBeenCalledWith('item-1');
    expect(onReject).toHaveBeenCalledWith('item-1');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('supports keyboard selection', () => {
    const onClick = vi.fn();

    render(<KBItemCard item={createKBItem()} onClick={onClick} />);

    fireEvent.keyDown(screen.getByRole('button', { name: '道具: 玄铁剑' }), { key: 'Enter' });

    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-1' }));
  });
});
