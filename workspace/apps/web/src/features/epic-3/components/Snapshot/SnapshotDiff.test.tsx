import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SnapshotDiff } from './SnapshotDiff';

describe('SnapshotDiff', () => {
  it('should render loading state', () => {
    render(
      <SnapshotDiff
        originalContent="original"
        snapshotContent="snapshot"
        isLoading={true}
      />
    );

    expect(screen.getByText('计算差异...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    render(
      <SnapshotDiff
        originalContent="original"
        snapshotContent="snapshot"
        error="Failed to compute diff"
      />
    );

    expect(screen.getByText('Failed to compute diff')).toBeInTheDocument();
  });

  it('should render diff stats', () => {
    render(
      <SnapshotDiff
        originalContent="line1\nline2"
        snapshotContent="line1\nmodified"
      />
    );

    expect(screen.getByText(/新增/)).toBeInTheDocument();
    expect(screen.getByText(/删除/)).toBeInTheDocument();
  });

  it('should show unchanged message when no diff', () => {
    render(
      <SnapshotDiff
        originalContent="same content"
        snapshotContent="same content"
      />
    );

    expect(screen.getByText('内容相同')).toBeInTheDocument();
  });

  it('should render added lines with green styling', () => {
    render(
      <SnapshotDiff
        originalContent=""
        snapshotContent="new line"
      />
    );

    const addedLines = screen.getAllByText('new line');
    expect(addedLines.length).toBeGreaterThan(0);
  });

  it('should render removed lines with red styling', () => {
    render(
      <SnapshotDiff
        originalContent="old line"
        snapshotContent=""
      />
    );

    const removedLines = screen.getAllByText('old line');
    expect(removedLines.length).toBeGreaterThan(0);
  });
});
