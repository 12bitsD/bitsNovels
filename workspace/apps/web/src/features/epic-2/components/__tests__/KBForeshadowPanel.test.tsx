import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KBForeshadowPanel from '../KBForeshadow/KBForeshadowPanel';
import * as useKBForeshadowModule from '../../hooks/useKBForeshadow';
import type { KBForeshadow } from '../KBForeshadow/types';

vi.mock('../../hooks/useKBForeshadow');

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

const mockUseKBForeshadow = (
  overrides: Partial<ReturnType<typeof useKBForeshadowModule.useKBForeshadow>> = {},
) => ({
  foreshadows: [] as KBForeshadow[],
  loading: false,
  detailLoading: false,
  saving: false,
  creating: false,
  error: null,
  search: '',
  statusFilter: 'all' as const,
  selectedForeshadow: null,
  setSearch: vi.fn(),
  setStatusFilter: vi.fn(),
  selectForeshadow: vi.fn(),
  clearSelection: vi.fn(),
  createForeshadow: vi.fn(),
  saveForeshadow: vi.fn(),
  updateForeshadowStatus: vi.fn(),
  updateExpectedResolveChapter: vi.fn(),
  confirmSuggestion: vi.fn(),
  refetch: vi.fn(),
  ...overrides,
});

describe('KBForeshadowPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders panel title', () => {
    vi.mocked(useKBForeshadowModule.useKBForeshadow).mockReturnValue(mockUseKBForeshadow());

    render(<KBForeshadowPanel projectId="project1" />);

    expect(screen.getByText('伏笔知识库')).toBeInTheDocument();
  });

  it('renders foreshadow list content', () => {
    vi.mocked(useKBForeshadowModule.useKBForeshadow).mockReturnValue(
      mockUseKBForeshadow({ foreshadows: [createForeshadow('1', { name: '镜中人' })] }),
    );

    render(<KBForeshadowPanel projectId="project1" />);

    expect(screen.getByText('镜中人')).toBeInTheDocument();
  });

  it('opens create dialog from header action', () => {
    vi.mocked(useKBForeshadowModule.useKBForeshadow).mockReturnValue(mockUseKBForeshadow());

    render(<KBForeshadowPanel projectId="project1" />);

    fireEvent.click(screen.getByRole('button', { name: '手动创建伏笔' }));
    expect(screen.getByText('手动创建伏笔')).toBeInTheDocument();
  });

  it('shows error state', () => {
    vi.mocked(useKBForeshadowModule.useKBForeshadow).mockReturnValue(
      mockUseKBForeshadow({ error: '加载失败' }),
    );

    render(<KBForeshadowPanel projectId="project1" />);

    expect(screen.getByText('加载失败')).toBeInTheDocument();
  });

  it('renders selected foreshadow detail', () => {
    vi.mocked(useKBForeshadowModule.useKBForeshadow).mockReturnValue(
      mockUseKBForeshadow({
        foreshadows: [createForeshadow('1', { name: '镜中人' })],
        selectedForeshadow: createForeshadow('1', { name: '镜中人' }),
      }),
    );

    render(<KBForeshadowPanel projectId="project1" />);

    expect(screen.getAllByDisplayValue('镜中人').length).toBeGreaterThan(0);
  });

  it('calls clearSelection when detail close is clicked', () => {
    const clearSelection = vi.fn();
    vi.mocked(useKBForeshadowModule.useKBForeshadow).mockReturnValue(
      mockUseKBForeshadow({
        selectedForeshadow: createForeshadow('1', { name: '镜中人' }),
        clearSelection,
      }),
    );

    render(<KBForeshadowPanel projectId="project1" />);

    fireEvent.click(screen.getByLabelText('关闭'));
    expect(clearSelection).toHaveBeenCalled();
  });
});
