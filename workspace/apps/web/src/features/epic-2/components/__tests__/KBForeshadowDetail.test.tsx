import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KBForeshadowDetail from '../KBForeshadow/KBForeshadowDetail';
import type { KBForeshadow } from '../KBForeshadow/types';

const createForeshadow = (overrides: Partial<KBForeshadow> = {}): KBForeshadow => ({
  id: 'foreshadow-1',
  projectId: 'project1',
  type: 'foreshadow',
  source: 'manual',
  confirmed: true,
  name: '镜中人',
  summary: '镜中倒影埋下身份伏笔',
  plantedChapterId: 'chapter-1',
  quote: '镜中那张脸比他慢了一拍。',
  status: 'unresolved',
  expectedResolveChapterId: 'chapter-2',
  aiSuggestions: [
    {
      chapterId: 'chapter-3',
      message: 'AI 猜测“镜中人”可能在本章得到回收。',
      confidence: 'medium',
      createdAt: '2026-04-08T10:00:00Z',
    },
  ],
  notifyState: { reminded: true, warned: false },
  createdAt: '2026-04-07T10:00:00Z',
  updatedAt: '2026-04-07T10:00:00Z',
  ...overrides,
});

describe('KBForeshadowDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders foreshadow detail fields', () => {
    render(
      <KBForeshadowDetail
        foreshadow={createForeshadow()}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onConfirmSuggestion={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('镜中人')).toBeInTheDocument();
    expect(screen.getByDisplayValue('镜中倒影埋下身份伏笔')).toBeInTheDocument();
    expect(screen.getByDisplayValue('镜中那张脸比他慢了一拍。')).toBeInTheDocument();
    expect(screen.getByText('AI 建议')).toBeInTheDocument();
  });

  it('requires resolution fields when saving resolved status', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <KBForeshadowDetail
        foreshadow={createForeshadow()}
        onClose={vi.fn()}
        onSave={onSave}
        onConfirmSuggestion={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('状态'), 'resolved');
    await user.click(screen.getByRole('button', { name: '保存伏笔' }));

    expect(screen.getByText('已回收状态需要填写回收章节和回收说明')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits updated status with resolution fields', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <KBForeshadowDetail
        foreshadow={createForeshadow()}
        onClose={vi.fn()}
        onSave={onSave}
        onConfirmSuggestion={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByLabelText('状态'), 'resolved');
    await user.clear(screen.getByLabelText('回收章节'));
    await user.type(screen.getByLabelText('回收章节'), 'chapter-3');
    await user.type(screen.getByLabelText('回收说明'), '主角终于确认了镜中人的真实身份');
    await user.click(screen.getByRole('button', { name: '保存伏笔' }));

    expect(onSave).toHaveBeenCalledWith({
      name: '镜中人',
      summary: '镜中倒影埋下身份伏笔',
      quote: '镜中那张脸比他慢了一拍。',
      status: 'resolved',
      expectedResolveChapterId: 'chapter-2',
      resolvedChapterId: 'chapter-3',
      resolveNote: '主角终于确认了镜中人的真实身份',
    });
  });

  it('confirms an AI suggestion', () => {
    const onConfirmSuggestion = vi.fn();
    render(
      <KBForeshadowDetail
        foreshadow={createForeshadow()}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onConfirmSuggestion={onConfirmSuggestion}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '确认 AI 建议' }));

    expect(onConfirmSuggestion).toHaveBeenCalledWith({
      chapterId: 'chapter-3',
      message: 'AI 猜测“镜中人”可能在本章得到回收。',
      confidence: 'medium',
      createdAt: '2026-04-08T10:00:00Z',
    });
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <KBForeshadowDetail
        foreshadow={createForeshadow()}
        onClose={onClose}
        onSave={vi.fn()}
        onConfirmSuggestion={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('关闭'));
    expect(onClose).toHaveBeenCalled();
  });
});
