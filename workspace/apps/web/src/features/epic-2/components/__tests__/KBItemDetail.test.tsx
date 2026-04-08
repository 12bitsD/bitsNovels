import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import KBItemDetail from '../KBItem/KBItemDetail';
import type { KBItem } from '../KBItem/types';

const createKBItem = (overrides: Partial<KBItem> = {}): KBItem => ({
  id: 'item-1',
  projectId: 'project1',
  type: 'item',
  source: 'ai',
  confirmed: false,
  name: '玄铁剑',
  aliases: ['黑剑', '重锋'],
  itemType: 'weapon',
  summary: '玄铁打造，可破灵气护体。',
  ownerCharacterId: 'char-lisi',
  ownershipHistory: [
    {
      fromCharacterId: 'char-zhangsan',
      toCharacterId: 'char-lisi',
      chapterId: 'chapter-8',
      note: '论剑获胜所得',
      createdAt: '2026-04-07T12:00:00Z',
    },
  ],
  chapterIds: ['chapter-3', 'chapter-8'],
  remark: '存放于祖祠密室。',
  createdAt: '2026-04-07T08:00:00Z',
  updatedAt: '2026-04-07T12:00:00Z',
  ...overrides,
});

describe('KBItemDetail', () => {
  it('renders item detail sections', () => {
    render(<KBItemDetail item={createKBItem()} onClose={vi.fn()} />);

    expect(screen.getByText('玄铁剑')).toBeInTheDocument();
    expect(screen.getByText('黑剑, 重锋')).toBeInTheDocument();
    expect(screen.getByText('玄铁打造，可破灵气护体。')).toBeInTheDocument();
    expect(screen.getAllByText('char-lisi').length).toBeGreaterThan(0);
    expect(screen.getByText('chapter-3')).toBeInTheDocument();
    expect(screen.getByText('论剑获胜所得')).toBeInTheDocument();
    expect(screen.getByText('存放于祖祠密室。')).toBeInTheDocument();
  });

  it('renders an empty ownership history state', () => {
    render(
      <KBItemDetail
        item={createKBItem({
          ownershipHistory: [],
          ownerCharacterId: undefined,
          chapterIds: [],
          remark: undefined,
        })}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText('暂无持有者变更记录')).toBeInTheDocument();
    expect(screen.getAllByText('未指定').length).toBeGreaterThan(0);
    expect(screen.getByText('暂无章节记录')).toBeInTheDocument();
  });

  it('calls close, confirm, and reject handlers', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const onReject = vi.fn();

    render(
      <KBItemDetail item={createKBItem()} onClose={onClose} onConfirm={onConfirm} onReject={onReject} />,
    );

    fireEvent.click(screen.getByLabelText('关闭'));
    fireEvent.click(screen.getByRole('button', { name: '确认道具条目' }));
    fireEvent.click(screen.getByRole('button', { name: '标记为非道具条目' }));

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledWith('item-1');
    expect(onReject).toHaveBeenCalledWith('item-1');
  });
});
