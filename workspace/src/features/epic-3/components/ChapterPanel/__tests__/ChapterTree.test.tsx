import { render } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import { ChapterTree } from '../ChapterTree';

describe('ChapterTree', () => {
  it('renders', () => {
    render(<ChapterTree 
      volumes={[{ id: 'v1', projectId: 'p1', title: 'Volume 1', sortOrder: 1, createdAt: '', updatedAt: '', chapters: [{ id: 'c1', volumeId: 'v1', title: 'Chapter 1', sortOrder: 1, summary: '', notes: '', wordCount: 0, projectId: 'p1', createdAt: '', updatedAt: '' }] }]} 
      activeChapterId="c1" 
      onSelect={vi.fn()} 
      onContextMenu={vi.fn()} 
      onMove={vi.fn()} 
    />);
  });
});
