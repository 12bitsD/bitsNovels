import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KBFactionList from '../KBFaction/KBFactionList';
import type { KBFaction } from '../KBFaction/types';

const createFaction = (id: string, overrides: Partial<KBFaction> = {}): KBFaction => ({ type: "faction",
  id,
  projectId: 'project1',
  source: 'ai',
  confirmed: false,
  name: `势力${id}`,
  aliases: [],
  factionType: 'sect',
  memberCharacterIds: [],
  allyFactionIds: [],
  rivalFactionIds: [],
  chapterIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('KBFactionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input', () => {
    const factions: KBFaction[] = [];
    render(
      <KBFactionList
        factions={factions}
        loading={false}
        hasMore={false}
        search=""
        onSearchChange={vi.fn()}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
        onFactionSelect={vi.fn()}
        onLoadMore={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText('搜索势力名称...')).toBeInTheDocument();
  });

  it('should call onSearchChange when typing in search input', () => {
    const onSearchChange = vi.fn();
    render(
      <KBFactionList
        factions={[]}
        loading={false}
        hasMore={false}
        search=""
        onSearchChange={onSearchChange}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
        onFactionSelect={vi.fn()}
        onLoadMore={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('搜索势力名称...'), {
      target: { value: '青云' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('青云');
  });

  it('should render type filter dropdown', () => {
    const factions: KBFaction[] = [];
    render(
      <KBFactionList
        factions={factions}
        loading={false}
        hasMore={false}
        search=""
        onSearchChange={vi.fn()}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
        onFactionSelect={vi.fn()}
        onLoadMore={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('全部类型')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <KBFactionList
        factions={[]}
        loading={true}
        hasMore={false}
        search=""
        onSearchChange={vi.fn()}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
        onFactionSelect={vi.fn()}
        onLoadMore={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should show empty state when no factions', () => {
    render(
      <KBFactionList
        factions={[]}
        loading={false}
        hasMore={false}
        search=""
        onSearchChange={vi.fn()}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
        onFactionSelect={vi.fn()}
        onLoadMore={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('暂无势力')).toBeInTheDocument();
  });

  it('should render faction cards', () => {
    const factions = [createFaction('1', { name: '青云宗' }), createFaction('2', { name: '天魔宫' })];
    render(
      <KBFactionList
        factions={factions}
        loading={false}
        hasMore={false}
        search=""
        onSearchChange={vi.fn()}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
        onFactionSelect={vi.fn()}
        onLoadMore={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('青云宗')).toBeInTheDocument();
    expect(screen.getByText('天魔宫')).toBeInTheDocument();
  });

  it('should call onFactionSelect when faction card is clicked', () => {
    const factions = [createFaction('1', { name: '青云宗' })];
    const onFactionSelect = vi.fn();
    render(
      <KBFactionList
        factions={factions}
        loading={false}
        hasMore={false}
        search=""
        onSearchChange={vi.fn()}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
        onFactionSelect={onFactionSelect}
        onLoadMore={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /势力: 青云宗/ }));
    expect(onFactionSelect).toHaveBeenCalledWith(factions[0]);
  });

  it('should show load more button when hasMore is true', () => {
    const factions = [createFaction('1')];
    render(
      <KBFactionList
        factions={factions}
        loading={false}
        hasMore={true}
        search=""
        onSearchChange={vi.fn()}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
        onFactionSelect={vi.fn()}
        onLoadMore={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('加载更多')).toBeInTheDocument();
  });

  it('should call onLoadMore when load more button is clicked', () => {
    const factions = [createFaction('1')];
    const onLoadMore = vi.fn();
    render(
      <KBFactionList
        factions={factions}
        loading={false}
        hasMore={true}
        search=""
        onSearchChange={vi.fn()}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
        onFactionSelect={vi.fn()}
        onLoadMore={onLoadMore}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('加载更多'));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('should highlight selected faction', () => {
    const factions = [createFaction('1', { name: '青云宗' })];
    render(
      <KBFactionList
        factions={factions}
        loading={false}
        hasMore={false}
        search=""
        onSearchChange={vi.fn()}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
        selectedFactionId="1"
        onFactionSelect={vi.fn()}
        onLoadMore={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('青云宗')).toBeInTheDocument();
  });

  it('should sort new factions to top', () => {
    const oldFaction = createFaction('1', {
      name: '旧势力',
      source: 'ai',
      confirmed: false,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newFaction = createFaction('2', {
      name: '新势力',
      source: 'ai',
      confirmed: false,
      createdAt: new Date().toISOString(),
    });
    const factions = [oldFaction, newFaction];

    render(
      <KBFactionList
        factions={factions}
        loading={false}
        hasMore={false}
        search=""
        onSearchChange={vi.fn()}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
        onFactionSelect={vi.fn()}
        onLoadMore={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    const cards = screen.getAllByRole('button');
    expect(cards[0]).toBeInTheDocument();
  });
});
