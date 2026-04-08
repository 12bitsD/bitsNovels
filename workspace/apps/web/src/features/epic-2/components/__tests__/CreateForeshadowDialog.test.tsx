import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateForeshadowDialog from '../KBForeshadow/CreateForeshadowDialog';

describe('CreateForeshadowDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog fields when open', () => {
    render(<CreateForeshadowDialog open={true} onClose={vi.fn()} onCreate={vi.fn()} />);

    expect(screen.getByText('手动创建伏笔')).toBeInTheDocument();
    expect(screen.getByLabelText('伏笔名称')).toBeInTheDocument();
    expect(screen.getByLabelText('摘要')).toBeInTheDocument();
    expect(screen.getByLabelText('埋设章节')).toBeInTheDocument();
  });

  it('validates required fields before submit', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<CreateForeshadowDialog open={true} onClose={vi.fn()} onCreate={onCreate} />);

    await user.click(screen.getByRole('button', { name: '创建伏笔' }));

    expect(screen.getByText('请填写伏笔名称')).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('submits manual create payload', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<CreateForeshadowDialog open={true} onClose={vi.fn()} onCreate={onCreate} />);

    await user.type(screen.getByLabelText('伏笔名称'), '青铜门的钥匙');
    await user.type(screen.getByLabelText('摘要'), '第一章埋下钥匙线索');
    await user.type(screen.getByLabelText('埋设章节'), 'chapter-1');
    await user.type(screen.getByLabelText('原文引用'), '门缝里似乎闪过一道青光。');
    await user.type(screen.getByLabelText('预期回收章节'), 'chapter-8');
    await user.click(screen.getByRole('button', { name: '创建伏笔' }));

    expect(onCreate).toHaveBeenCalledWith({
      name: '青铜门的钥匙',
      summary: '第一章埋下钥匙线索',
      plantedChapterId: 'chapter-1',
      quote: '门缝里似乎闪过一道青光。',
      expectedResolveChapterId: 'chapter-8',
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<CreateForeshadowDialog open={true} onClose={onClose} onCreate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(onClose).toHaveBeenCalled();
  });
});
