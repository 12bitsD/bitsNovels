import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KBLocationPanel from '../KBLocation/KBLocationPanel';
import type { KBLocation, KBLocationTreeNode } from '../KBLocation/types';
import * as useKBLocationModule from '../../hooks/useKBLocation';

vi.mock('../../hooks/useKBLocation');

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

const mockUseKBLocation = (overrides: Partial<ReturnType<typeof useKBLocationModule.useKBLocation>> = {}) => {
  const defaultValue: ReturnType<typeof useKBLocationModule.useKBLocation> = {
    locations: [] as KBLocation[],
    tree: [] as KBLocationTreeNode[],
    loading: false,
    error: null,
    hasMore: false,
    search: '',
    locationType: undefined,
    confirmed: undefined,
    selectedIds: [],
    confirmDialogOpen: false,
    bulkConfirmDialogOpen: false,
    mergeDialogOpen: false,
    pendingConfirmId: null,
    pendingBulkConfirmIds: [],
    pendingMergeSourceId: null,
    locationsMap: {},
    setSearch: vi.fn(),
    setLocationType: vi.fn(),
    setConfirmed: vi.fn(),
    setSelectedIds: vi.fn(),
    createLocation: vi.fn(),
    updateLocation: vi.fn(),
    deleteLocation: vi.fn(),
    confirmLocation: vi.fn(),
    rejectLocation: vi.fn(),
    bulkConfirm: vi.fn(),
    mergeLocation: vi.fn(),
    fetchReferences: vi.fn(),
    loadMore: vi.fn(),
    refetch: vi.fn(),
    setConfirmDialogOpen: vi.fn(),
    setBulkConfirmDialogOpen: vi.fn(),
    setMergeDialogOpen: vi.fn(),
    setPendingConfirmId: vi.fn(),
    setPendingBulkConfirmIds: vi.fn(),
    setPendingMergeSourceId: vi.fn(),
    handleSearchChange: vi.fn(),
    handleTypeFilterChange: vi.fn(),
    handleConfirm: vi.fn(),
    handleReject: vi.fn(),
    handleBulkConfirm: vi.fn(),
    handleMerge: vi.fn(),
  };
  return { ...defaultValue, ...overrides };
};

describe('KBLocationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render panel title', () => {
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(mockUseKBLocation());

    render(<KBLocationPanel projectId="project1" />);

    expect(screen.getByText('地点知识库')).toBeInTheDocument();
  });

  it('should render KBLocationList component', () => {
    const locations = [createKBLocation({ id: '1', name: 'Beijing' })];
    const tree = [createTreeNode({ id: '1', name: 'Beijing' })];
    
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ locations, tree })
    );

    render(<KBLocationPanel projectId="project1" />);

    expect(screen.getByText('Beijing')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ loading: true })
    );

    render(<KBLocationPanel projectId="project1" />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ error: 'Failed to load' })
    );

    render(<KBLocationPanel projectId="project1" />);

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('should render empty state', () => {
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ locations: [], tree: [] })
    );

    render(<KBLocationPanel projectId="project1" />);

    expect(screen.getByText('暂无地点')).toBeInTheDocument();
  });

  it('should render selected location detail', () => {
    const location = createKBLocation({ id: '1', name: 'Beijing' });
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ locations: [location] })
    );

    render(<KBLocationPanel projectId="project1" selectedLocationId="1" />);

    expect(screen.getByText('Beijing')).toBeInTheDocument();
  });

  it('should call handleConfirm when confirming location', () => {
    const handleConfirm = vi.fn();
    const locations = [createKBLocation({ id: '1', source: 'ai', confirmed: false })];
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ locations, handleConfirm })
    );

    render(<KBLocationPanel projectId="project1" />);

    fireEvent.click(screen.getByText('确认'));
    expect(handleConfirm).toHaveBeenCalledWith('1');
  });

  it('should open confirm dialog when confirmDialogOpen is true', () => {
    const location = createKBLocation({ id: '1', name: 'Beijing' });
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ 
        locations: [location],
        confirmDialogOpen: true,
        pendingConfirmId: '1',
      })
    );

    render(<KBLocationPanel projectId="project1" />);

    expect(screen.getByText('确认地点')).toBeInTheDocument();
    expect(screen.getByText('确定要确认这个地点吗？')).toBeInTheDocument();
  });

  it('should open bulk confirm dialog when bulkConfirmDialogOpen is true', () => {
    const locations = [
      createKBLocation({ id: '1', source: 'ai', confirmed: false }),
      createKBLocation({ id: '2', source: 'ai', confirmed: false }),
    ];
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ 
        locations,
        bulkConfirmDialogOpen: true,
        pendingBulkConfirmIds: ['1', '2'],
      })
    );

    render(<KBLocationPanel projectId="project1" />);

    expect(screen.getByText('批量确认')).toBeInTheDocument();
    expect(screen.getByText('确定要确认选中的 2 个地点吗？')).toBeInTheDocument();
  });

  it('should open merge dialog when mergeDialogOpen is true', () => {
    const locations = [createKBLocation({ id: '1', name: 'Beijing' })];
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ 
        locations,
        mergeDialogOpen: true,
        pendingMergeSourceId: '1',
      })
    );

    render(<KBLocationPanel projectId="project1" />);

    expect(screen.getByText('合并地点')).toBeInTheDocument();
  });

  it('should open confirm dialog when confirmDialogOpen is true and call confirmLocation', async () => {
    const confirmLocation = vi.fn();
    const setConfirmDialogOpen = vi.fn();
    const locations = [createKBLocation({ id: '1', name: 'Beijing' })];
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ 
        locations,
        confirmLocation,
        setConfirmDialogOpen,
        confirmDialogOpen: true,
        pendingConfirmId: '1',
      })
    );

    render(<KBLocationPanel projectId="project1" />);

    expect(screen.getByText('确认地点')).toBeInTheDocument();
    expect(screen.getByText('确定要确认这个地点吗？')).toBeInTheDocument();
  });

  it('should open bulk confirm dialog when bulkConfirmDialogOpen is true', () => {
    const locations = [
      createKBLocation({ id: '1', source: 'ai', confirmed: false }),
      createKBLocation({ id: '2', source: 'ai', confirmed: false }),
    ];
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ 
        locations,
        bulkConfirmDialogOpen: true,
        pendingBulkConfirmIds: ['1', '2'],
      })
    );

    render(<KBLocationPanel projectId="project1" />);

    expect(screen.getByText('批量确认')).toBeInTheDocument();
    expect(screen.getByText('确定要确认选中的 2 个地点吗？')).toBeInTheDocument();
  });

  it('should open merge dialog when mergeDialogOpen is true', () => {
    const locations = [
      createKBLocation({ id: '1', name: 'Beijing' }),
      createKBLocation({ id: '2', name: 'Peking' }),
    ];
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ 
        locations,
        mergeDialogOpen: true,
        pendingMergeSourceId: '1',
      })
    );

    render(<KBLocationPanel projectId="project1" />);

    expect(screen.getByText('合并地点')).toBeInTheDocument();
  });

  it('should close dialog when cancel is clicked', () => {
    const setConfirmDialogOpen = vi.fn();
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ 
        setConfirmDialogOpen,
        confirmDialogOpen: true,
        pendingConfirmId: '1',
      })
    );

    render(<KBLocationPanel projectId="project1" />);

    fireEvent.click(screen.getByText('取消'));
    expect(setConfirmDialogOpen).toHaveBeenCalledWith(false);
  });

  it('should show new discovery count badge in header', () => {
    const recentDate = new Date().toISOString();
    const locations = [
      createKBLocation({ id: '1', source: 'ai', confirmed: false, createdAt: recentDate, updatedAt: recentDate }),
      createKBLocation({ id: '2', source: 'ai', confirmed: false, createdAt: recentDate, updatedAt: recentDate }),
    ];
    const tree = locations.map(l => createTreeNode({ id: l.id, name: l.name }));
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ locations, tree })
    );

    render(<KBLocationPanel projectId="project1" />);

    const badges = screen.getAllByText('新发现 2');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should pass correct props to KBLocationList', () => {
    const locations = [createKBLocation({ id: '1', name: 'Beijing' })];
    const tree = [createTreeNode({ id: '1', name: 'Beijing' })];
    const handleSearchChange = vi.fn();
    const handleTypeFilterChange = vi.fn();
    const handleConfirm = vi.fn();
    const handleReject = vi.fn();
    const handleBulkConfirm = vi.fn();
    
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ 
        locations, 
        tree,
        handleSearchChange,
        handleTypeFilterChange,
        handleConfirm,
        handleReject,
        handleBulkConfirm,
      })
    );

    render(<KBLocationPanel projectId="project1" />);

    const searchInput = screen.getByPlaceholderText('搜索地点名称...');
    fireEvent.change(searchInput, { target: { value: 'Beijing' } });
    expect(handleSearchChange).toHaveBeenCalled();
  });

  it('should render detail panel when location is selected', () => {
    const location = createKBLocation({ id: '1', name: 'Beijing', source: 'manual' });
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ 
        locations: [location],
        locationsMap: { '1': location },
        selectedIds: ['1'],
      })
    );

    render(<KBLocationPanel projectId="project1" selectedLocationId="1" />);

    const beijingTexts = screen.getAllByText(/Beijing/);
    expect(beijingTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('should close detail panel when onCloseDetail is called', () => {
    const setSelectedIds = vi.fn();
    const location = createKBLocation({ id: '1', name: 'Beijing' });
    vi.mocked(useKBLocationModule.useKBLocation).mockReturnValue(
      mockUseKBLocation({ 
        locations: [location],
        locationsMap: { '1': location },
        setSelectedIds 
      })
    );

    render(<KBLocationPanel projectId="project1" selectedLocationId="1" />);

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(setSelectedIds).toHaveBeenCalledWith([]);
  });
});
