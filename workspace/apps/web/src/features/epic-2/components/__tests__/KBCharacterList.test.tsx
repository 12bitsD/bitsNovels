import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KBCharacterList from '../KBCharacter/KBCharacterList';
import type { CharacterSortBy, KBCharacter } from '../KBCharacter/types';

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
  lastAppearanceChapterId: 'ch-2',
  appearanceCount: 1,
  createdAt: '2026-04-07T10:00:00Z',
  updatedAt: '2026-04-07T10:00:00Z',
  ...overrides,
});

describe('KBCharacterList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search and sort controls', () => {
    render(
      <KBCharacterList
        characters={[createCharacter()]}
        loading={false}
        search=""
        sortBy={'firstAppearance' satisfies CharacterSortBy}
      />,
    );

    expect(screen.getByPlaceholderText('搜索角色名称...')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '角色排序方式' })).toBeInTheDocument();
  });

  it('forwards search and sort changes', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onSortChange = vi.fn();

    render(
      <KBCharacterList
        characters={[createCharacter()]}
        loading={false}
        search=""
        sortBy="firstAppearance"
        onSearchChange={onSearchChange}
        onSortChange={onSortChange}
      />,
    );

    await user.type(screen.getByPlaceholderText('搜索角色名称...'), '沈');
    fireEvent.change(screen.getByRole('combobox', { name: '角色排序方式' }), {
      target: { value: 'appearanceCount' },
    });

    expect(onSearchChange).toHaveBeenLastCalledWith('沈');
    expect(onSortChange).toHaveBeenCalledWith('appearanceCount');
  });

  it('keeps new discoveries at the top of the list', () => {
    const characters = [
      createCharacter({
        id: 'old',
        name: '旧角色',
        createdAt: '2026-04-01T10:00:00Z',
        updatedAt: '2026-04-01T10:00:00Z',
      }),
      createCharacter({
        id: 'new',
        name: '新角色',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ];

    render(
      <KBCharacterList
        characters={characters}
        loading={false}
        search=""
        sortBy="firstAppearance"
      />,
    );

    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(within(items[0]).getByText('新角色')).toBeInTheDocument();
  });

  it('shows selection summary and batch confirm action', () => {
    const onBatchConfirm = vi.fn();

    render(
      <KBCharacterList
        characters={[
          createCharacter({ id: 'char-1' }),
          createCharacter({ id: 'char-2', name: '顾砚' }),
        ]}
        loading={false}
        search=""
        sortBy="firstAppearance"
        selectedIds={['char-1', 'char-2']}
        onBatchConfirm={onBatchConfirm}
      />,
    );

    expect(screen.getByText('已选择 2 项待确认角色')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '批量确认角色' }));
    expect(onBatchConfirm).toHaveBeenCalledWith(['char-1', 'char-2']);
  });

  it('forwards per-card selection changes', () => {
    const onSelectionChange = vi.fn();

    render(
      <KBCharacterList
        characters={[createCharacter({ id: 'char-1' })]}
        loading={false}
        search=""
        sortBy="firstAppearance"
        selectedIds={[]}
        onSelectionChange={onSelectionChange}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: '选择角色 沈墨' }));
    expect(onSelectionChange).toHaveBeenCalledWith(['char-1']);
  });
});
