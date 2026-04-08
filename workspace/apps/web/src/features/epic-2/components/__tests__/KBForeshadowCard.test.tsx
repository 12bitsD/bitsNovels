import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KBForeshadowCard from '../KBForeshadow/KBForeshadowCard';
import type { KBForeshadow } from '../KBForeshadow/types';

const createForeshadow = (overrides: Partial<KBForeshadow> = {}): KBForeshadow => ({
  id: 'foreshadow-1',
  projectId: 'project1',
  type: 'foreshadow',
  source: 'manual',
  confirmed: true,
  name: '血玉反噬',
  summary: '血玉在后续会反噬主人',
  plantedChapterId: 'chapter-1',
  quote: '那枚血玉在月光下像活物般跳动。',
  status: 'unresolved',
  expectedResolveChapterId: 'chapter-3',
  aiSuggestions: [],
  notifyState: { reminded: false, warned: false },
  createdAt: '2026-04-07T10:00:00Z',
  updatedAt: '2026-04-07T10:00:00Z',
  ...overrides,
});

describe('KBForeshadowCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders core foreshadow metadata', () => {
    render(<KBForeshadowCard foreshadow={createForeshadow()} />);

    expect(screen.getByText('血玉反噬')).toBeInTheDocument();
    expect(screen.getByText('未回收')).toBeInTheDocument();
    expect(screen.getByText('埋设章节 chapter-1')).toBeInTheDocument();
    expect(screen.getByText('预期回收 chapter-3')).toBeInTheDocument();
  });

  it('renders AI badge for unconfirmed parser results', () => {
    render(
      <KBForeshadowCard
        foreshadow={createForeshadow({ source: 'ai', confirmed: false })}
      />,
    );

    expect(screen.getByText('AI识别-待确认')).toBeInTheDocument();
  });

  it('shows overdue warning highlight when warned', () => {
    render(
      <KBForeshadowCard
        foreshadow={createForeshadow({ notifyState: { reminded: true, warned: true } })}
      />,
    );

    const card = screen.getByRole('button', { name: /伏笔: 血玉反噬/ });
    expect(card).toHaveClass('border-[var(--color-error)]');
    expect(screen.getByText('超期警告')).toBeInTheDocument();
  });

  it('shows suggestion count when AI suggestions exist', () => {
    render(
      <KBForeshadowCard
        foreshadow={createForeshadow({
          aiSuggestions: [
            {
              chapterId: 'chapter-2',
              message: 'AI 猜测这一伏笔可能在本章得到回收。',
              confidence: 'medium',
              createdAt: '2026-04-08T10:00:00Z',
            },
          ],
        })}
      />,
    );

    expect(screen.getByText('AI建议 1')).toBeInTheDocument();
  });

  it('calls onClick when card is selected', () => {
    const onClick = vi.fn();
    const foreshadow = createForeshadow();
    render(<KBForeshadowCard foreshadow={foreshadow} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: /伏笔: 血玉反噬/ }));

    expect(onClick).toHaveBeenCalledWith(foreshadow);
  });
});
