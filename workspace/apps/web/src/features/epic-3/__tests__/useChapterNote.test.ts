import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChapterNote } from '../hooks/useChapterNote';
import { client } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  client: {
    GET: vi.fn().mockResolvedValue({ data: null, error: null, response: new Response() }),
    PATCH: vi.fn().mockResolvedValue({ data: null, error: null, response: new Response() }),
  },
  extractApiErrorMessage: (error: { detail?: string; error?: { message?: string } } | null | undefined, fallback: string) =>
    error?.detail ?? error?.error?.message ?? fallback,
}));

describe('useChapterNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockNote = {
    id: 'note-1',
    chapterId: 'chapter-1',
    content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Test note"}]}]}',
    charCount: 8,
    autoSavedAt: '2026-04-03T10:00:00Z',
    createdAt: '2026-04-03T09:00:00Z',
    updatedAt: '2026-04-03T10:00:00Z',
  };

  it('should initialize with loading state', () => {
    vi.mocked(client.GET).mockResolvedValueOnce({ 
      data: null, error: null, response: new Response() 
    } as never);
    
    const { result } = renderHook(() => useChapterNote('chapter-1', { projectId: 'project-1' }));
    
    expect(result.current.loading).toBe(true);
  });

  it('should fetch note successfully', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({ 
      data: { note: mockNote }, error: null, response: new Response() 
    } as never);
    
    const { result } = renderHook(() => useChapterNote('chapter-1', { projectId: 'project-1' }));
    
    await waitFor(() => {
      expect(result.current.note).toEqual(mockNote);
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({ 
      data: null, error: { detail: 'Not found' }, response: new Response() 
    } as never);
    
    const { result } = renderHook(() => useChapterNote('chapter-1', { projectId: 'project-1' }));
    
    await waitFor(() => {
      expect(result.current.error).toBe('Not found');
    });
    
    expect(result.current.note).toBeNull();
  });

  it('should update content when updateContent is called', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({ 
      data: { note: mockNote }, error: null, response: new Response() 
    } as never);
    vi.mocked(client.PATCH).mockResolvedValueOnce({ 
      data: { note: mockNote }, error: null, response: new Response() 
    } as never);
    
    const { result } = renderHook(() => useChapterNote('chapter-1', { projectId: 'project-1' }));
    
    await waitFor(() => {
      expect(result.current.content).toBe(mockNote.content);
    });
    
    act(() => {
      result.current.updateContent('new content');
    });
    
    expect(result.current.content).toBe('new content');
  });

  it('should calculate charCount correctly', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({ 
      data: { note: mockNote }, error: null, response: new Response() 
    } as never);
    
    const { result } = renderHook(() => useChapterNote('chapter-1', { projectId: 'project-1' }));
    
    await waitFor(() => {
      expect(result.current.content).toBe(mockNote.content);
    });
    
    expect(result.current.charCount).toBe(8);
  });

  it('should handle empty note', async () => {
    vi.mocked(client.GET).mockResolvedValueOnce({ 
      data: null, error: null, response: new Response() 
    } as never);
    
    const { result } = renderHook(() => useChapterNote('chapter-1', { projectId: 'project-1' }));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.note).toBeNull();
    expect(result.current.content).toBe('');
    expect(result.current.charCount).toBe(0);
  });

  it('should call refetch to reload note', async () => {
    vi.mocked(client.GET)
      .mockResolvedValueOnce({ data: { note: mockNote }, error: null, response: new Response() } as never)
      .mockResolvedValueOnce({ data: { note: { ...mockNote, content: 'updated' } }, error: null, response: new Response() } as never);
    
    const { result } = renderHook(() => useChapterNote('chapter-1', { projectId: 'project-1' }));
    
    await waitFor(() => {
      expect(result.current.content).toBe(mockNote.content);
    });
    
    await act(async () => {
      await result.current.refetch();
    });
    
    expect(result.current.content).toBe('updated');
  });
});
