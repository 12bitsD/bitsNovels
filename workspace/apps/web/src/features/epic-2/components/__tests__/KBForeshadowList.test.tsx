import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KBForeshadowList from '../KBForeshadow/KBForeshadowList';
import type { KBForeshadow } from '../KBForeshadow/types';

const createForeshadow = (id: string, overrides: Partial<KBForeshadow> = {}): KBForeshadow => ({
  id,
  projectId: 'project1',
  type: 'foreshadow',
  source: 'manual',
  confirmed: true,
  name: `伏笔${id}`,
  summary: `摘要${id}`,
  plantedChapterId: 'chapter-1',
  quote: '原文引用',
  status: 'unresolved',
  aiSuggestions: [],
  notifyState: { reminded: false, warned: false },
  createdAt: '2026-04-07T10:00:00Z',
  updatedAt: '2026-04-07T10:00:00Z',
  ...overrides,
});

describe('KBForeshadowList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders grouped status sections', () => {
    render(
      <KBForeshadowList
        foreshadows={[
          createForeshadow('1', { name: '未回收伏笔', status: 'unresolved' }),
          createForeshadow('2', { name: '已回收伏笔', status: 'resolved' }),
        ]}
        loading={false}
        search=""
        statusFilter="all"
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onSelectForeshadow={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: '未回收' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '已回收' })).toBeInTheDocument();
    expect(screen.getByText('未回收伏笔')).toBeInTheDocument();
    expect(screen.getByText('已回收伏笔')).toBeInTheDocument();
  });

  it('calls search callback when typing', () => {
    const onSearchChange = vi.fn();
    render(
      <KBForeshadowList
        foreshadows={[]}
        loading={false}
        search=""
        statusFilter="all"
        onSearchChange={onSearchChange}
        onStatusFilterChange={vi.fn()}
        onSelectForeshadow={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('搜索伏笔名称...'), {
      target: { value: '血玉' },
    });

    expect(onSearchChange).toHaveBeenCalledWith('血玉');
  });

  it('calls status filter callback when selecting a status', () => {
    const onStatusFilterChange = vi.fn();
    render(
      <KBForeshadowList
        foreshadows={[]}
        loading={false}
        search=""
        statusFilter="all"
        onSearchChange={vi.fn()}
        onStatusFilterChange={onStatusFilterChange}
        onSelectForeshadow={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('筛选伏笔状态'), {
      target: { value: 'resolved' },
    });

    expect(onStatusFilterChange).toHaveBeenCalledWith('resolved');
  });

  it('shows loading state', () => {
    render(
      <KBForeshadowList
        foreshadows={[]}
        loading={true}
        search=""
        statusFilter="all"
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onSelectForeshadow={vi.fn()}
      />,
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('shows empty state when there are no foreshadows', () => {
    render(
      <KBForeshadowList
        foreshadows={[]}
        loading={false}
        search=""
        statusFilter="all"
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onSelectForeshadow={vi.fn()}
      />,
    );

    expect(screen.getByText('暂无伏笔')).toBeInTheDocument();
  });

  it('selects a foreshadow card when clicked', () => {
    const onSelectForeshadow = vi.fn();
    const foreshadow = createForeshadow('1', { name: '镜中人' });

    render(
      <KBForeshadowList
        foreshadows={[foreshadow]}
        loading={false}
        search=""
        statusFilter="all"
        onSearchChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onSelectForeshadow={onSelectForeshadow}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /伏笔: 镜中人/ }));

    expect(onSelectForeshadow).toHaveBeenCalledWith(foreshadow);
  });
});
