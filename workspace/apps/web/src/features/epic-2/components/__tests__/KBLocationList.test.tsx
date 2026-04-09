import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KBLocationList from '../KBLocation/KBLocationList';
import type { KBLocation, KBLocationTreeNode } from '../KBLocation/types';

vi.mock('../hooks/useKBLocation');

const createKBLocation = (overrides: Partial<KBLocation> = {}): KBLocation => ({ type: "location",
  id: '1',
  projectId: 'project1',
  source: 'ai',
  confirmed: false,
  name: 'Beijing',
  aliases: [],
  locationType: 'city',
  characterIds: [],
  chapterIds: [],
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

const createTreeNode = (overrides: Partial<KBLocationTreeNode> & { id: string; name: string }): KBLocationTreeNode => ({
  ...createKBLocation({ id: overrides.id, name: overrides.name }),
  children: overrides.children || [],
  ...overrides,
});

describe('KBLocationList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input', () => {
    const locations = [createKBLocation()];
    const tree = [createTreeNode({ id: '1', name: 'Beijing' })];
    
    render(
      <KBLocationList
        locations={locations}
        tree={tree}
        loading={false}
        onLocationClick={vi.fn()}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    expect(screen.getByPlaceholderText('搜索地点名称...')).toBeInTheDocument();
  });

  it('should call onSearchChange when search input changes', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const locations = [createKBLocation()];
    const tree = [createTreeNode({ id: '1', name: 'Beijing' })];
    
    render(
      <KBLocationList
        locations={locations}
        tree={tree}
        loading={false}
        onLocationClick={vi.fn()}
        onSearchChange={onSearchChange}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    await user.type(screen.getByPlaceholderText('搜索地点名称...'), 'Beijing');
    expect(onSearchChange).toHaveBeenCalledWith('Beijing');
  });

  it('should render type filter dropdown', () => {
    const locations = [createKBLocation()];
    const tree = [createTreeNode({ id: '1', name: 'Beijing' })];
    
    render(
      <KBLocationList
        locations={locations}
        tree={tree}
        loading={false}
        onLocationClick={vi.fn()}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should render location cards', () => {
    const locations = [
      createKBLocation({ id: '1', name: 'Beijing' }),
      createKBLocation({ id: '2', name: 'Shanghai' }),
    ];
    const tree = [
      createTreeNode({ id: '1', name: 'Beijing' }),
      createTreeNode({ id: '2', name: 'Shanghai' }),
    ];
    
    render(
      <KBLocationList
        locations={locations}
        tree={tree}
        loading={false}
        onLocationClick={vi.fn()}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    expect(screen.getByText('Beijing')).toBeInTheDocument();
    expect(screen.getByText('Shanghai')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <KBLocationList
        locations={[]}
        tree={[]}
        loading={true}
        onLocationClick={vi.fn()}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should show empty state when no locations', () => {
    render(
      <KBLocationList
        locations={[]}
        tree={[]}
        loading={false}
        onLocationClick={vi.fn()}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    expect(screen.getByText('暂无地点')).toBeInTheDocument();
  });

  it('should show empty state with search results', () => {
    render(
      <KBLocationList
        locations={[]}
        tree={[]}
        loading={false}
        search="NonExistent"
        onLocationClick={vi.fn()}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    expect(screen.getByText('未找到匹配「NonExistent」的地点')).toBeInTheDocument();
  });

  it('should render tree view toggle button', () => {
    const locations = [createKBLocation()];
    const tree = [createTreeNode({ id: '1', name: 'Beijing' })];
    
    render(
      <KBLocationList
        locations={locations}
        tree={tree}
        loading={false}
        onLocationClick={vi.fn()}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    expect(screen.getByRole('button', { name: '树状视图' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '列表视图' })).toBeInTheDocument();
  });

  it('should show bulk confirm button when viewMode is list and has unconfirmed', () => {
    const locations = [
      createKBLocation({ id: '1', source: 'ai', confirmed: false }),
      createKBLocation({ id: '2', source: 'ai', confirmed: false }),
    ];
    const tree = locations.map(l => createTreeNode({ id: l.id, name: l.name }));
    
    render(
      <KBLocationList
        locations={locations}
        tree={tree}
        loading={false}
        viewMode="list"
        selectedIds={['1', '2']}
        onLocationClick={vi.fn()}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    expect(screen.getByText('批量确认')).toBeInTheDocument();
  });

  it('should call onBulkConfirm when bulk confirm button is clicked', () => {
    const onBulkConfirm = vi.fn();
    const locations = [
      createKBLocation({ id: '1', source: 'ai', confirmed: false }),
      createKBLocation({ id: '2', source: 'ai', confirmed: false }),
    ];
    const tree = locations.map(l => createTreeNode({ id: l.id, name: l.name }));
    
    render(
      <KBLocationList
        locations={locations}
        tree={tree}
        loading={false}
        viewMode="list"
        selectedIds={['1', '2']}
        onLocationClick={vi.fn()}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={onBulkConfirm}
      />
    );
    
    fireEvent.click(screen.getByText('批量确认'));
    expect(onBulkConfirm).toHaveBeenCalledWith(['1', '2']);
  });

  it('should render tree structure when viewMode is tree', () => {
    const locations = [
      createKBLocation({ id: '1', name: 'China' }),
      createKBLocation({ id: '2', name: 'Beijing', parentId: '1' }),
    ];
    const tree = [
      createTreeNode({ 
        id: '1', 
        name: 'China',
        children: [createTreeNode({ id: '2', name: 'Beijing' })]
      }),
    ];
    
    render(
      <KBLocationList
        locations={locations}
        tree={tree}
        loading={false}
        viewMode="tree"
        onLocationClick={vi.fn()}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    expect(screen.getByText('China')).toBeInTheDocument();
    expect(screen.getByText('Beijing')).toBeInTheDocument();
  });

  it('should show selected count', () => {
    const locations = [
      createKBLocation({ id: '1', source: 'ai', confirmed: false }),
      createKBLocation({ id: '2', source: 'ai', confirmed: false }),
    ];
    const tree = locations.map(l => createTreeNode({ id: l.id, name: l.name }));
    
    render(
      <KBLocationList
        locations={locations}
        tree={tree}
        loading={false}
        viewMode="list"
        selectedIds={['1']}
        onLocationClick={vi.fn()}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    expect(screen.getByText('已选择1项')).toBeInTheDocument();
  });

  it('should call onSelectionChange when card is selected', () => {
    const onSelectionChange = vi.fn();
    const locations = [
      createKBLocation({ id: '1', source: 'ai', confirmed: false }),
    ];
    const tree = [createTreeNode({ id: '1', name: 'Beijing' })];
    
    render(
      <KBLocationList
        locations={locations}
        tree={tree}
        loading={false}
        viewMode="list"
        selectedIds={[]}
        onLocationClick={vi.fn()}
        onSelectionChange={onSelectionChange}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    const selectButtons = screen.getAllByRole('button', { name: '选择' });
    fireEvent.click(selectButtons[0]);
    expect(onSelectionChange).toHaveBeenCalledWith(['1']);
  });

  it('should show new discovery count badge', () => {
    const recentDate = new Date().toISOString();
    const locations = [
      createKBLocation({ id: '1', source: 'ai', confirmed: false, createdAt: recentDate, updatedAt: recentDate }),
      createKBLocation({ id: '2', source: 'ai', confirmed: false, createdAt: recentDate, updatedAt: recentDate }),
      createKBLocation({ id: '3', confirmed: true }),
    ];
    const tree = locations.map(l => createTreeNode({ id: l.id, name: l.name }));
    
    render(
      <KBLocationList
        locations={locations}
        tree={tree}
        loading={false}
        onLocationClick={vi.fn()}
        onSearchChange={vi.fn()}
        onTypeFilterChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        onBulkConfirm={vi.fn()}
      />
    );
    
    expect(screen.getByText('新发现 2')).toBeInTheDocument();
  });
});
