import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import KBCharacterCard from '../KBCharacter/KBCharacterCard';
import type { KBCharacter } from '../KBCharacter/types';

const createCharacter = (overrides: Partial<KBCharacter> = {}): KBCharacter => ({
  id: 'char-1',
  projectId: 'project-1',
  type: 'character',
  source: 'ai',
  confirmed: false,
  name: '沈墨',
  aliases: ['阿墨'],
  gender: '男',
  occupation: '巡夜人',
  appearance: '黑衣、瘦高',
  personalityTags: ['冷静', '敏锐'],
  factionId: 'faction-1',
  chapterIds: ['ch-1', 'ch-2'],
  firstAppearanceChapterId: 'ch-1',
  lastAppearanceChapterId: 'ch-2',
  appearanceCount: 2,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('KBCharacterCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders character summary fields', () => {
    render(
      <KBCharacterCard
        character={createCharacter()}
        lastAppearanceLabel="第二章 风起"
      />,
    );

    expect(screen.getByText('沈墨')).toBeInTheDocument();
    expect(screen.getByText('巡夜人')).toBeInTheDocument();
    expect(screen.getByText('2 次出场')).toBeInTheDocument();
    expect(screen.getByText('最近出场：第二章 风起')).toBeInTheDocument();
  });

  it('renders AI pending and new discovery badges', () => {
    render(<KBCharacterCard character={createCharacter()} isNew={true} />);

    expect(screen.getByText('AI识别-待确认')).toBeInTheDocument();
    expect(screen.getByText('新发现')).toBeInTheDocument();
  });

  it('calls selection and action handlers', () => {
    const onSelect = vi.fn();
    const onConfirm = vi.fn();
    const onMarkNotCharacter = vi.fn();

    render(
      <KBCharacterCard
        character={createCharacter()}
        selected={true}
        onSelect={onSelect}
        onConfirm={onConfirm}
        onMarkNotCharacter={onMarkNotCharacter}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: '选择角色 沈墨' }));
    fireEvent.click(screen.getByRole('button', { name: '确认角色 沈墨' }));
    fireEvent.click(screen.getByRole('button', { name: '标记 沈墨 为非角色' }));

    expect(onSelect).toHaveBeenCalledWith('char-1', false);
    expect(onConfirm).toHaveBeenCalledWith('char-1');
    expect(onMarkNotCharacter).toHaveBeenCalledWith('char-1');
  });

  it('calls onClick when card is activated', () => {
    const character = createCharacter();
    const onClick = vi.fn();

    render(<KBCharacterCard character={character} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '角色: 沈墨' }));

    expect(onClick).toHaveBeenCalledWith(character);
  });
});
