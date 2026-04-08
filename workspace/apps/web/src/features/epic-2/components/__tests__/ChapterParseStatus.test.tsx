import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ChapterParseStatus from '../ParserStatus/ChapterParseStatus';

describe('ChapterParseStatus', () => {
  it.each([
    ['parsed', '已解析'],
    ['parsing', '解析中'],
    ['pending', '待解析'],
    ['failed', '解析失败'],
    ['no_content', '无内容'],
  ] as const)('renders %s state accessibly', (status, label) => {
    render(<ChapterParseStatus status={status} />);

    expect(screen.getByLabelText(label)).toBeInTheDocument();
  });

  it('shows the failure reason and retries failed chapters', () => {
    const onRetry = vi.fn();

    render(
      <ChapterParseStatus
        status="failed"
        failureReason="Parser timed out after 30 seconds"
        onRetry={onRetry}
        chapterTitle="第一章"
      />,
    );

    const retryButton = screen.getByRole('button', { name: '重试解析 第一章' });

    expect(retryButton).toHaveAttribute('title', 'Parser timed out after 30 seconds');

    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
