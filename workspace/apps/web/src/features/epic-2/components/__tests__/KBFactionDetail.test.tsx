import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KBFactionDetail from '../KBFaction/KBFactionDetail';
import type { KBFaction, KBFactionReferences } from '../KBFaction/types';

const createFaction = (overrides: Partial<KBFaction> = {}): KBFaction => ({ type: "faction",
  id: 'faction1',
  projectId: 'project1',
  source: 'ai',
  confirmed: false,
  name: '青云宗',
  aliases: ['青云门'],
  factionType: 'sect',
  summary: '修仙大派',
  memberCharacterIds: ['char1', 'char2'],
  allyFactionIds: ['faction2'],
  rivalFactionIds: ['faction3'],
  chapterIds: ['ch1'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createReferences = (): KBFactionReferences => ({
  chapters: [
    { id: 'ch1', title: '第一章 初入修仙', order: 1 },
    { id: 'ch2', title: '第二章 宗门大比', order: 2 },
  ],
  characters: [
    { id: 'char1', name: '张三' },
    { id: 'char2', name: '李四' },
  ],
  factions: [
    { id: 'faction2', name: '天玄门' },
    { id: 'faction3', name: '天魔宫' },
  ],
});

describe('KBFactionDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render faction name', () => {
    const faction = createFaction();
    render(
      <KBFactionDetail
        faction={faction}
        references={null}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('青云宗')).toBeInTheDocument();
  });

  it('should render AI识别-待确认 badge for unconfirmed factions', () => {
    const faction = createFaction({ source: 'ai', confirmed: false });
    render(
      <KBFactionDetail
        faction={faction}
        references={null}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('AI识别-待确认')).toBeInTheDocument();
  });

  it('should render type label', () => {
    const faction = createFaction({ factionType: 'country' });
    render(
      <KBFactionDetail
        faction={faction}
        references={null}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('类型:')).toBeInTheDocument();
    expect(screen.getByText('国家')).toBeInTheDocument();
  });

  it('should render aliases', () => {
    const faction = createFaction({ aliases: ['别名1', '别名2'] });
    render(
      <KBFactionDetail
        faction={faction}
        references={null}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('别名:')).toBeInTheDocument();
    expect(screen.getByText('别名1, 别名2')).toBeInTheDocument();
  });

  it('should render summary', () => {
    const faction = createFaction({ summary: '这是一个修仙大派' });
    render(
      <KBFactionDetail
        faction={faction}
        references={null}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('这是一个修仙大派')).toBeInTheDocument();
  });

  it('should render confirmation buttons for unconfirmed factions', () => {
    const faction = createFaction({ source: 'ai', confirmed: false });
    render(
      <KBFactionDetail
        faction={faction}
        references={null}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('确认')).toBeInTheDocument();
    expect(screen.getByText('标记非势力')).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    const faction = createFaction({ source: 'ai', confirmed: false });
    const onConfirm = vi.fn();
    render(
      <KBFactionDetail
        faction={faction}
        references={null}
        loading={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        onReject={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('确认'));
    expect(onConfirm).toHaveBeenCalledWith('faction1');
  });

  it('should call onReject when reject button is clicked', () => {
    const faction = createFaction({ source: 'ai', confirmed: false });
    const onReject = vi.fn();
    render(
      <KBFactionDetail
        faction={faction}
        references={null}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={onReject}
      />
    );

    fireEvent.click(screen.getByText('标记非势力'));
    expect(onReject).toHaveBeenCalledWith('faction1');
  });

  it('should call onClose when close button is clicked', () => {
    const faction = createFaction();
    const onClose = vi.fn();
    render(
      <KBFactionDetail
        faction={faction}
        references={null}
        loading={false}
        onClose={onClose}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('关闭'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should render all tabs', () => {
    const faction = createFaction();
    render(
      <KBFactionDetail
        faction={faction}
        references={null}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByRole('tab', { name: /成员/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /同盟/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /对立/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /章节/ })).toBeInTheDocument();
  });

  it('should switch tabs when clicked', () => {
    const faction = createFaction();
    render(
      <KBFactionDetail
        faction={faction}
        references={null}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /同盟/ }));
    expect(screen.getByRole('tab', { name: /同盟/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('should show loading indicator when loading', () => {
    const faction = createFaction();
    render(
      <KBFactionDetail
        faction={faction}
        references={null}
        loading={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should render members when tab is selected', () => {
    const faction = createFaction();
    const refs = createReferences();
    render(
      <KBFactionDetail
        faction={faction}
        references={refs}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
  });

  it('should render allies when allies tab is selected', () => {
    const faction = createFaction();
    const refs = createReferences();
    render(
      <KBFactionDetail
        faction={faction}
        references={refs}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /同盟/ }));
    expect(screen.getByText('天玄门')).toBeInTheDocument();
  });

  it('should render rivals when rivals tab is selected', () => {
    const faction = createFaction();
    const refs = createReferences();
    render(
      <KBFactionDetail
        faction={faction}
        references={refs}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /对立/ }));
    expect(screen.getByText('天魔宫')).toBeInTheDocument();
  });

  it('should render chapters when chapters tab is selected', () => {
    const faction = createFaction();
    const refs = createReferences();
    render(
      <KBFactionDetail
        faction={faction}
        references={refs}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /章节/ }));
    expect(screen.getByText('第一章 初入修仙')).toBeInTheDocument();
  });

  it('should show empty state for members when no references', () => {
    const faction = createFaction({ memberCharacterIds: [] });
    render(
      <KBFactionDetail
        faction={faction}
        references={{ chapters: [], characters: [], factions: [] }}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('暂无成员信息')).toBeInTheDocument();
  });

  it('should show empty state for allies when no allies', () => {
    const faction = createFaction({ allyFactionIds: [] });
    render(
      <KBFactionDetail
        faction={faction}
        references={{ chapters: [], characters: [], factions: [] }}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /同盟/ }));
    expect(screen.getByText('暂无同盟势力')).toBeInTheDocument();
  });

  it('should show empty state for rivals when no rivals', () => {
    const faction = createFaction({ rivalFactionIds: [] });
    render(
      <KBFactionDetail
        faction={faction}
        references={{ chapters: [], characters: [], factions: [] }}
        loading={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /对立/ }));
    expect(screen.getByText('暂无对立势力')).toBeInTheDocument();
  });
});
