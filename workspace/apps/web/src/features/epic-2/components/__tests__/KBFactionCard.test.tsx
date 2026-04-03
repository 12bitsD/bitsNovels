import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KBFactionCard from '../KBFaction/KBFactionCard';
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

describe('KBFactionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render faction name', () => {
    const faction = createFaction('1', { name: '青云宗' });
    render(<KBFactionCard faction={faction} />);

    expect(screen.getByText('青云宗')).toBeInTheDocument();
  });

  it('should render faction type label', () => {
    const faction = createFaction('1', { factionType: 'sect' });
    render(<KBFactionCard faction={faction} />);

    expect(screen.getByText('门派/宗门')).toBeInTheDocument();
  });

  it('should render member count', () => {
    const faction = createFaction('1', { memberCharacterIds: ['char1', 'char2'] });
    render(<KBFactionCard faction={faction} />);

    expect(screen.getByText(/成员/)).toBeInTheDocument();
  });

  it('should render ally count', () => {
    const faction = createFaction('1', { allyFactionIds: ['f1', 'f2'] });
    render(<KBFactionCard faction={faction} />);

    expect(screen.getByText(/同盟/)).toBeInTheDocument();
  });

  it('should render rival count', () => {
    const faction = createFaction('1', { rivalFactionIds: ['f1'] });
    render(<KBFactionCard faction={faction} />);

    expect(screen.getByText(/对立/)).toBeInTheDocument();
  });

  it('should render AI识别-待确认 badge for unconfirmed AI factions', () => {
    const faction = createFaction('1', { source: 'ai', confirmed: false });
    render(<KBFactionCard faction={faction} />);

    expect(screen.getByText('AI识别-待确认')).toBeInTheDocument();
  });

  it('should not render AI识别-待确认 badge for confirmed factions', () => {
    const faction = createFaction('1', { source: 'ai', confirmed: true });
    render(<KBFactionCard faction={faction} />);

    expect(screen.queryByText('AI识别-待确认')).not.toBeInTheDocument();
  });

  it('should not render AI识别-待确认 badge for manual factions', () => {
    const faction = createFaction('1', { source: 'manual', confirmed: false });
    render(<KBFactionCard faction={faction} />);

    expect(screen.queryByText('AI识别-待确认')).not.toBeInTheDocument();
  });

  it('should render 新发现 badge when isNew is true', () => {
    const faction = createFaction('1', {});
    render(<KBFactionCard faction={faction} isNew={true} />);

    expect(screen.getByText('新发现')).toBeInTheDocument();
  });

  it('should render aliases when present', () => {
    const faction = createFaction('1', { aliases: ['别名1', '别名2'] });
    render(<KBFactionCard faction={faction} />);

    expect(screen.getByText(/别名/)).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const faction = createFaction('1');
    const onClick = vi.fn();
    render(<KBFactionCard faction={faction} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(faction);
  });

  it('should apply selected styles when selected', () => {
    const faction = createFaction('1');
    render(<KBFactionCard faction={faction} isSelected={true} />);

    const article = screen.getByRole('button');
    expect(article).toHaveClass('border-[var(--color-amber)]');
  });

  it('should apply new faction styles when isNew', () => {
    const faction = createFaction('1');
    render(<KBFactionCard faction={faction} isNew={true} />);

    const article = screen.getByRole('button');
    expect(article).toHaveClass('ring-2');
  });
});
