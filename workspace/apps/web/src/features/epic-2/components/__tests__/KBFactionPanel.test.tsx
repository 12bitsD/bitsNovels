import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KBFactionPanel from '../KBFaction/KBFactionPanel';
import * as useKBFactionModule from '../../hooks/useKBFaction';
import type { KBFaction, FactionType } from '../KBFaction/types';

const createFaction = (id: string, overrides: Partial<KBFaction> = {}): KBFaction => ({
  id,
  projectId: 'project1',
  source: 'ai',
  confirmed: false,
  name: `势力${id}`,
  aliases: [],
  factionType: 'sect' as FactionType,
  memberCharacterIds: [],
  allyFactionIds: [],
  rivalFactionIds: [],
  chapterIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

vi.mock('../../hooks/useKBFaction');

const mockUseKBFaction = (overrides: Partial<ReturnType<typeof useKBFactionModule.useKBFaction>> = {}) => {
  const defaultValue: ReturnType<typeof useKBFactionModule.useKBFaction> = {
    factions: [] as KBFaction[],
    loading: false,
    error: null,
    hasMore: false,
    search: '',
    setSearch: vi.fn(),
    typeFilter: 'all' as FactionType | 'all',
    setTypeFilter: vi.fn(),
    selectedFaction: null,
    setSelectedFaction: vi.fn(),
    selectedFactionRefs: null,
    loadingRefs: false,
    loadMore: vi.fn(),
    confirmFaction: vi.fn(),
    rejectFaction: vi.fn(),
    refetch: vi.fn(),
  };
  return { ...defaultValue, ...overrides };
};

describe('KBFactionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render title', () => {
    vi.mocked(useKBFactionModule.useKBFaction).mockReturnValue(mockUseKBFaction());

    render(<KBFactionPanel projectId="project1" />);

    expect(screen.getByText('势力知识库')).toBeInTheDocument();
  });

  it('should render faction count', () => {
    const factions = [createFaction('1', { name: '青云宗' })];
    vi.mocked(useKBFactionModule.useKBFaction).mockReturnValue(
      mockUseKBFaction({ factions })
    );

    render(<KBFactionPanel projectId="project1" />);

    expect(screen.getByText('1 个势力')).toBeInTheDocument();
  });

  it('should render empty state when no faction selected', () => {
    vi.mocked(useKBFactionModule.useKBFaction).mockReturnValue(mockUseKBFaction());

    render(<KBFactionPanel projectId="project1" />);

    expect(screen.getByText('选择势力查看详情')).toBeInTheDocument();
  });

  it('should render selected faction detail', () => {
    const faction = createFaction('1', { name: '青云宗' });
    vi.mocked(useKBFactionModule.useKBFaction).mockReturnValue(
      mockUseKBFaction({ selectedFaction: faction })
    );

    render(<KBFactionPanel projectId="project1" />);

    expect(screen.getByText('青云宗')).toBeInTheDocument();
  });

  it('should call setSelectedFaction with null when close is clicked', () => {
    const faction = createFaction('1', { name: '青云宗' });
    const setSelectedFaction = vi.fn();
    vi.mocked(useKBFactionModule.useKBFaction).mockReturnValue(
      mockUseKBFaction({ selectedFaction: faction, setSelectedFaction })
    );

    render(<KBFactionPanel projectId="project1" />);

    fireEvent.click(screen.getByLabelText('关闭'));
    expect(setSelectedFaction).toHaveBeenCalledWith(null);
  });

  it('should render with two-panel layout', () => {
    vi.mocked(useKBFactionModule.useKBFaction).mockReturnValue(mockUseKBFaction());

    render(<KBFactionPanel projectId="project1" />);

    expect(screen.getByText('势力知识库')).toBeInTheDocument();
    expect(screen.getByText('选择势力查看详情')).toBeInTheDocument();
  });
});
