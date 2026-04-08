import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import KBCharacterPanel from '../KBCharacter/KBCharacterPanel';
import type { KBCharacter } from '../KBCharacter/types';
import * as useKBCharacterModule from '../../hooks/useKBCharacter';

vi.mock('../../hooks/useKBCharacter');

const createCharacter = (overrides: Partial<KBCharacter> = {}): KBCharacter => ({
  id: 'char-1',
  projectId: 'project-1',
  type: 'character',
  source: 'ai',
  confirmed: false,
  name: '沈墨',
  aliases: [],
  occupation: '巡夜人',
  personalityTags: [],
  chapterIds: ['ch-1'],
  firstAppearanceChapterId: 'ch-1',
  lastAppearanceChapterId: 'ch-1',
  appearanceCount: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const mockUseKBCharacter = (
  overrides: Partial<ReturnType<typeof useKBCharacterModule.useKBCharacter>> = {},
): ReturnType<typeof useKBCharacterModule.useKBCharacter> => ({
  characters: [],
  loading: false,
  detailLoading: false,
  error: null,
  query: '',
  sortBy: 'firstAppearance',
  selectedIds: [],
  selectedCharacter: null,
  setQuery: vi.fn(),
  setSortBy: vi.fn(),
  setSelectedIds: vi.fn(),
  selectCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  confirmCharacter: vi.fn(),
  batchConfirmCharacters: vi.fn(),
  markCharacterNotCharacter: vi.fn(),
  refetch: vi.fn(),
  ...overrides,
});

describe('KBCharacterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders panel title and tabs', () => {
    vi.mocked(useKBCharacterModule.useKBCharacter).mockReturnValue(mockUseKBCharacter());

    render(<KBCharacterPanel projectId="project-1" />);

    expect(screen.getByText('角色知识库')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '全部角色' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '待确认' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '新发现' })).toBeInTheDocument();
  });

  it('filters characters when pending tab is selected', () => {
    vi.mocked(useKBCharacterModule.useKBCharacter).mockReturnValue(
      mockUseKBCharacter({
        characters: [
          createCharacter({ id: 'pending', name: '待确认角色', source: 'ai', confirmed: false }),
          createCharacter({ id: 'confirmed', name: '已确认角色', source: 'manual', confirmed: true }),
        ],
      }),
    );

    render(<KBCharacterPanel projectId="project-1" />);

    fireEvent.click(screen.getByRole('tab', { name: '待确认' }));

    expect(screen.getByText('待确认角色')).toBeInTheDocument();
    expect(screen.queryByText('已确认角色')).not.toBeInTheDocument();
  });

  it('renders selected character detail and forwards chapter jump callback', () => {
    const onChapterSelect = vi.fn();
    vi.mocked(useKBCharacterModule.useKBCharacter).mockReturnValue(
      mockUseKBCharacter({
        characters: [createCharacter()],
        selectedCharacter: createCharacter(),
      }),
    );

    render(
      <KBCharacterPanel
        projectId="project-1"
        chapters={[{ id: 'ch-1', title: '第一章 夜巡', order: 1 }]}
        factions={[{ id: 'faction-1', name: '夜行司' }]}
        onChapterSelect={onChapterSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '跳转到章节 第一章 夜巡' }));
    expect(onChapterSelect).toHaveBeenCalledWith('ch-1');
  });

  it('shows empty state when there are no characters', () => {
    vi.mocked(useKBCharacterModule.useKBCharacter).mockReturnValue(mockUseKBCharacter());

    render(<KBCharacterPanel projectId="project-1" />);

    expect(screen.getByText('暂无角色')).toBeInTheDocument();
  });
});
