import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import KBCharacterDetail from '../KBCharacter/KBCharacterDetail';
import type { KBCharacter, KBCharacterChapterReference } from '../KBCharacter/types';

const createCharacter = (overrides: Partial<KBCharacter> = {}): KBCharacter => ({
  id: 'char-1',
  projectId: 'project-1',
  type: 'character',
  source: 'ai',
  confirmed: false,
  name: '沈墨',
  aliases: ['阿墨', '墨哥'],
  gender: '男',
  occupation: '巡夜人',
  appearance: '黑衣、瘦高',
  personalityTags: ['冷静', '敏锐'],
  factionId: 'faction-1',
  chapterIds: ['ch-1', 'ch-2'],
  firstAppearanceChapterId: 'ch-1',
  lastAppearanceChapterId: 'ch-2',
  appearanceCount: 2,
  remark: '与夜巡案相关。',
  createdAt: '2026-04-07T10:00:00Z',
  updatedAt: '2026-04-07T10:00:00Z',
  ...overrides,
});

const chapters: KBCharacterChapterReference[] = [
  { id: 'ch-1', title: '第一章 夜巡', order: 1 },
  { id: 'ch-2', title: '第二章 风起', order: 2 },
];

describe('KBCharacterDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders full character detail fields', () => {
    render(
      <KBCharacterDetail
        character={createCharacter()}
        factionName="夜行司"
        chapters={chapters}
      />,
    );

    expect(screen.getByText('沈墨')).toBeInTheDocument();
    expect(screen.getByText('阿墨、墨哥')).toBeInTheDocument();
    expect(screen.getByText('男')).toBeInTheDocument();
    expect(screen.getByText('巡夜人')).toBeInTheDocument();
    expect(screen.getByText('黑衣、瘦高')).toBeInTheDocument();
    expect(screen.getByText('冷静')).toBeInTheDocument();
    expect(screen.getByText('敏锐')).toBeInTheDocument();
    expect(screen.getByText('夜行司')).toBeInTheDocument();
    expect(screen.getByText('与夜巡案相关。')).toBeInTheDocument();
  });

  it('jumps to chapter content when a chapter is clicked', () => {
    const onChapterSelect = vi.fn();

    render(
      <KBCharacterDetail
        character={createCharacter()}
        chapters={chapters}
        onChapterSelect={onChapterSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '跳转到章节 第一章 夜巡' }));
    expect(onChapterSelect).toHaveBeenCalledWith('ch-1');
  });

  it('shows confirm and non-character actions for pending AI entries', () => {
    const onConfirm = vi.fn();
    const onMarkNotCharacter = vi.fn();

    render(
      <KBCharacterDetail
        character={createCharacter()}
        chapters={chapters}
        onConfirm={onConfirm}
        onMarkNotCharacter={onMarkNotCharacter}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '确认角色 沈墨' }));
    fireEvent.click(screen.getByRole('button', { name: '标记 沈墨 为非角色' }));

    expect(onConfirm).toHaveBeenCalledWith('char-1');
    expect(onMarkNotCharacter).toHaveBeenCalledWith('char-1');
  });

  it('submits edited character fields', () => {
    const onSave = vi.fn();

    render(
      <KBCharacterDetail
        character={createCharacter()}
        chapters={chapters}
        factionName="夜行司"
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '编辑角色 沈墨' }));
    fireEvent.change(screen.getByLabelText('角色姓名'), { target: { value: '沈砚' } });
    fireEvent.change(screen.getByLabelText('别名'), { target: { value: '阿砚, 砚哥' } });
    fireEvent.change(screen.getByLabelText('性格标签'), { target: { value: '克制, 谨慎' } });
    fireEvent.change(screen.getByLabelText('备注'), { target: { value: '新的备注' } });
    fireEvent.click(screen.getByRole('button', { name: '保存角色 沈墨' }));

    expect(onSave).toHaveBeenCalledWith('char-1', {
      name: '沈砚',
      aliases: ['阿砚', '砚哥'],
      gender: '男',
      occupation: '巡夜人',
      appearance: '黑衣、瘦高',
      personalityTags: ['克制', '谨慎'],
      factionId: 'faction-1',
      remark: '新的备注',
    });
  });
});
