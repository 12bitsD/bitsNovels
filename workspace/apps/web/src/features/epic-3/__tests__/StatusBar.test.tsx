import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from '../components/StatusBar';
import type { SaveStatus } from '../hooks/useAutoSave';

describe('StatusBar', () => {
  const renderStatusBar = (props: {
    wordCount: number;
    selectionCount: number;
    saveStatus: SaveStatus;
    lastSavedAt: Date | null;
  }) => {
    return render(<StatusBar {...props} />);
  };

  it('should display word count correctly', () => {
    renderStatusBar({
      wordCount: 1234,
      selectionCount: 0,
      saveStatus: 'idle',
      lastSavedAt: null,
    });

    expect(screen.getByText('字数:')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('should display zero word count', () => {
    renderStatusBar({
      wordCount: 0,
      selectionCount: 0,
      saveStatus: 'idle',
      lastSavedAt: null,
    });

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should display selection count when greater than 0', () => {
    renderStatusBar({
      wordCount: 1000,
      selectionCount: 50,
      saveStatus: 'idle',
      lastSavedAt: null,
    });

    expect(screen.getByText('选中:')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('should not display selection count when equal to 0', () => {
    renderStatusBar({
      wordCount: 1000,
      selectionCount: 0,
      saveStatus: 'idle',
      lastSavedAt: null,
    });

    expect(screen.queryByText('选中:')).not.toBeInTheDocument();
  });

  it('should show saving status with spinner', () => {
    const { container } = renderStatusBar({
      wordCount: 500,
      selectionCount: 0,
      saveStatus: 'saving',
      lastSavedAt: null,
    });

    expect(screen.getByText('保存中...')).toBeInTheDocument();
    // Check for the spinning border element (spinner)
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show saved status with time', () => {
    const lastSavedAt = new Date();
    lastSavedAt.setHours(14, 30);

    renderStatusBar({
      wordCount: 500,
      selectionCount: 0,
      saveStatus: 'saved',
      lastSavedAt,
    });

    expect(screen.getByText('已保存 14:30')).toBeInTheDocument();
    // Check for the checkmark icon
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('should show saved status without time when lastSavedAt is null', () => {
    renderStatusBar({
      wordCount: 500,
      selectionCount: 0,
      saveStatus: 'saved',
      lastSavedAt: null,
    });

    expect(screen.getByText('已保存')).toBeInTheDocument();
  });

  it('should show error status', () => {
    renderStatusBar({
      wordCount: 500,
      selectionCount: 0,
      saveStatus: 'error',
      lastSavedAt: null,
    });

    expect(screen.getByText('保存失败')).toBeInTheDocument();
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('should show idle status with empty text', () => {
    const { container } = renderStatusBar({
      wordCount: 500,
      selectionCount: 0,
      saveStatus: 'idle',
      lastSavedAt: null,
    });

    const statusSection = container.querySelector('.text-ink-light, .dark\\:text-gray-400');
    expect(statusSection).toBeInTheDocument();
  });

  it('should format time correctly with single digit hours and minutes', () => {
    const lastSavedAt = new Date();
    lastSavedAt.setHours(9, 5);

    renderStatusBar({
      wordCount: 500,
      selectionCount: 0,
      saveStatus: 'saved',
      lastSavedAt,
    });

    expect(screen.getByText('已保存 09:05')).toBeInTheDocument();
  });

  it('should format time correctly at midnight', () => {
    const lastSavedAt = new Date();
    lastSavedAt.setHours(0, 0);

    renderStatusBar({
      wordCount: 500,
      selectionCount: 0,
      saveStatus: 'saved',
      lastSavedAt,
    });

    expect(screen.getByText('已保存 00:00')).toBeInTheDocument();
  });

  it('should format time correctly at end of day', () => {
    const lastSavedAt = new Date();
    lastSavedAt.setHours(23, 59);

    renderStatusBar({
      wordCount: 500,
      selectionCount: 0,
      saveStatus: 'saved',
      lastSavedAt,
    });

    expect(screen.getByText('已保存 23:59')).toBeInTheDocument();
  });

  it('should display both word count and selection count', () => {
    renderStatusBar({
      wordCount: 5000,
      selectionCount: 250,
      saveStatus: 'saving',
      lastSavedAt: new Date(),
    });

    expect(screen.getByText('5000')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('保存中...')).toBeInTheDocument();
  });

  it('should apply correct CSS classes', () => {
    const { container } = renderStatusBar({
      wordCount: 100,
      selectionCount: 10,
      saveStatus: 'saved',
      lastSavedAt: new Date(),
    });

    const statusBar = container.firstChild as HTMLElement;
    expect(statusBar).toHaveClass(
      'flex',
      'items-center',
      'justify-between',
      'px-4',
      'py-2',
      'bg-amber-50',
      'border-t',
      'border-amber-200',
      'text-sm'
    );
  });

  it('should use monospace font for word count', () => {
    renderStatusBar({
      wordCount: 999,
      selectionCount: 0,
      saveStatus: 'idle',
      lastSavedAt: null,
    });

    const wordCountElement = screen.getByText('999');
    expect(wordCountElement).toHaveClass('font-mono');
  });

  it('should use monospace font for selection count', () => {
    renderStatusBar({
      wordCount: 999,
      selectionCount: 111,
      saveStatus: 'idle',
      lastSavedAt: null,
    });

    const selectionCountElement = screen.getByText('111');
    expect(selectionCountElement).toHaveClass('font-mono');
  });
});
