/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChapterPanel } from '../ChapterPanel';
import * as useChapterPanelModule from '../../../hooks/useChapterPanel';

vi.mock('../../../hooks/useChapterPanel', () => ({
  useChapterPanel: vi.fn(),
}));

describe('ChapterPanel', () => {
  it('should render loading state', () => {
    vi.spyOn(useChapterPanelModule, 'useChapterPanel').mockReturnValue({
      volumes: [],
      chapters: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      createVolume: vi.fn(),
      createChapter: vi.fn(),
      renameVolume: vi.fn(),
      renameChapter: vi.fn(),
      deleteVolume: vi.fn(),
      deleteChapter: vi.fn(),
      moveVolume: vi.fn(),
      moveChapter: vi.fn(),
      updateChapterSummary: vi.fn(),
      updateChapterNotes: vi.fn(),
    } as any);

    render(
      <ChapterPanel
        projectId="project1"
        activeChapterId={null}
        onChapterSelect={vi.fn()}
      />
    );
  });

  it('should render content', () => {
    vi.spyOn(useChapterPanelModule, 'useChapterPanel').mockReturnValue({
      volumes: [
        { 
          id: 'v1', projectId: 'p1', title: 'Volume 1', sortOrder: 1, createdAt: '', updatedAt: '',
          chapters: [
            { id: 'c1', volumeId: 'v1', title: 'Chapter 1', sortOrder: 1, summary: '', notes: '', wordCount: 0, projectId: 'p1', createdAt: '', updatedAt: '' }
          ]
        }
      ],
      chapters: [
        { id: 'c1', volumeId: 'v1', title: 'Chapter 1', sortOrder: 1, summary: '', notes: '', wordCount: 0, projectId: 'p1', createdAt: '', updatedAt: '' }
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      createVolume: vi.fn(),
      createChapter: vi.fn(),
      renameVolume: vi.fn(),
      renameChapter: vi.fn(),
      deleteVolume: vi.fn(),
      deleteChapter: vi.fn(),
      moveVolume: vi.fn(),
      moveChapter: vi.fn(),
      updateChapterSummary: vi.fn(),
      updateChapterNotes: vi.fn(),
    } as any);

    render(
      <ChapterPanel
        projectId="project1"
        activeChapterId="c1"
        onChapterSelect={vi.fn()}
      />
    );
    expect(screen.getByText('章节')).toBeInTheDocument();
    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
  });
});
