import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useKBLocation } from '../useKBLocation';
import type { KBLocation } from '../../components/KBLocation/types';

vi.mock('../../../../api/client', () => ({
  client: {
    GET: vi.fn(),
    POST: vi.fn(),
    PATCH: vi.fn(),
    DELETE: vi.fn(),
  },
}));

import { client } from '../../../../api/client';

const createKBLocation = (id: string, overrides: Partial<KBLocation> = {}): KBLocation => ({
  id,
  projectId: 'project1',
  source: 'ai',
  confirmed: false,
  name: `Location ${id}`,
  aliases: [],
  locationType: 'city',
  characterIds: [],
  chapterIds: [],
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('useKBLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with empty locations and loading state', () => {
      const { result } = renderHook(() => useKBLocation('project1'));
      
      expect(result.current.locations).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('fetchLocations', () => {
    it('should fetch locations on mount', async () => {
      const mockLocations = [
        createKBLocation('1', { name: 'Beijing' }),
        createKBLocation('2', { name: 'Shanghai' }),
      ];

      vi.mocked(client.GET).mockResolvedValueOnce({
        data: {
          items: mockLocations,
          total: 2,
          has_more: false,
        },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.locations).toHaveLength(2);
      expect(result.current.locations[0].name).toBe('Beijing');
    });

    it('should handle fetch error', async () => {
      vi.mocked(client.GET).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should fetch with search filter', async () => {
      vi.mocked(client.GET).mockResolvedValue({
        data: { items: [], total: 0, has_more: false },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1', { search: 'Beijing' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(client.GET).toHaveBeenCalledWith(
        '/api/projects/project1/kb/location?page=1&page_size=20&search=Beijing'
      );
    });

    it('should fetch with type filter', async () => {
      vi.mocked(client.GET).mockResolvedValue({
        data: { items: [], total: 0, has_more: false },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1', { locationType: 'city' }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(client.GET).toHaveBeenCalledWith(
        '/api/projects/project1/kb/location?page=1&page_size=20&location_type=city'
      );
    });

    it('should fetch with confirmed filter', async () => {
      vi.mocked(client.GET).mockResolvedValue({
        data: { items: [], total: 0, has_more: false },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1', { confirmed: false }));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(client.GET).toHaveBeenCalledWith(
        '/api/projects/project1/kb/location?page=1&page_size=20&confirmed=false'
      );
    });
  });

  describe('buildTree', () => {
    it('should build tree structure from flat list', async () => {
      const mockLocations = [
        createKBLocation('1', { name: 'China', parentId: undefined }),
        createKBLocation('2', { name: 'Beijing', parentId: '1' }),
        createKBLocation('3', { name: 'Beijing District', parentId: '2' }),
      ];

      vi.mocked(client.GET).mockResolvedValueOnce({
        data: { items: mockLocations, total: 3, has_more: false },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tree).toHaveLength(1);
      expect(result.current.tree[0].name).toBe('China');
      expect(result.current.tree[0].children).toHaveLength(1);
      expect(result.current.tree[0].children[0].name).toBe('Beijing');
      expect(result.current.tree[0].children[0].children).toHaveLength(1);
      expect(result.current.tree[0].children[0].children[0].name).toBe('Beijing District');
    });

    it('should handle root locations without parent', async () => {
      const mockLocations = [
        createKBLocation('1', { name: 'China' }),
        createKBLocation('2', { name: 'USA' }),
      ];

      vi.mocked(client.GET).mockResolvedValueOnce({
        data: { items: mockLocations, total: 2, has_more: false },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tree).toHaveLength(2);
    });
  });

  describe('createLocation', () => {
    it('should create a new location', async () => {
      const newLocation = createKBLocation('1', { name: 'New City' });

      vi.mocked(client.GET).mockResolvedValueOnce({
        data: { items: [], total: 0, has_more: false },
        error: undefined,
        response: new Response(),
      });

      vi.mocked(client.POST).mockResolvedValueOnce({
        data: newLocation,
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let createdLocation: KBLocation | null = null;
      await act(async () => {
        createdLocation = await result.current.createLocation({
          name: 'New City',
          locationType: 'city',
        });
      });

      expect(createdLocation).not.toBeNull();
      expect(createdLocation?.name).toBe('New City');
      expect(client.POST).toHaveBeenCalledWith('/api/projects/project1/kb/location', {
        body: { name: 'New City', locationType: 'city' },
      });
    });
  });

  describe('updateLocation', () => {
    it('should update an existing location', async () => {
      const mockLocations = [createKBLocation('1', { name: 'Old Name' })];

      vi.mocked(client.GET).mockResolvedValueOnce({
        data: { items: mockLocations, total: 1, has_more: false },
        error: undefined,
        response: new Response(),
      });

      vi.mocked(client.PATCH).mockResolvedValueOnce({
        data: { ...mockLocations[0], name: 'New Name' },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateLocation('1', { name: 'New Name' });
      });

      expect(client.PATCH).toHaveBeenCalledWith('/api/projects/project1/kb/location/1', {
        body: { name: 'New Name' },
      });
    });
  });

  describe('deleteLocation', () => {
    it('should soft delete a location', async () => {
      const mockLocations = [createKBLocation('1', { name: 'To Delete' })];

      vi.mocked(client.GET).mockResolvedValueOnce({
        data: { items: mockLocations, total: 1, has_more: false },
        error: undefined,
        response: new Response(),
      });

      vi.mocked(client.DELETE).mockResolvedValueOnce({
        data: { success: true },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteLocation('1');
      });

      expect(client.DELETE).toHaveBeenCalledWith('/api/projects/project1/kb/location/1');
    });
  });

  describe('confirmLocation', () => {
    it('should confirm a location', async () => {
      const mockLocations = [createKBLocation('1', { confirmed: false })];

      vi.mocked(client.GET).mockResolvedValueOnce({
        data: { items: mockLocations, total: 1, has_more: false },
        error: undefined,
        response: new Response(),
      });

      vi.mocked(client.POST).mockResolvedValueOnce({
        data: { ...mockLocations[0], confirmed: true },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.confirmLocation('1');
      });

      expect(client.POST).toHaveBeenCalledWith('/api/projects/project1/kb/location/1/confirm');
    });
  });

  describe('rejectLocation', () => {
    it('should reject a location', async () => {
      const mockLocations = [createKBLocation('1', { confirmed: false })];

      vi.mocked(client.GET).mockResolvedValueOnce({
        data: { items: mockLocations, total: 1, has_more: false },
        error: undefined,
        response: new Response(),
      });

      vi.mocked(client.POST).mockResolvedValueOnce({
        data: { ...mockLocations[0], confirmed: false, deletedAt: '2024-01-15T12:00:00Z' },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.rejectLocation('1');
      });

      expect(client.POST).toHaveBeenCalledWith('/api/projects/project1/kb/location/1/reject');
    });
  });

  describe('bulkConfirm', () => {
    it('should bulk confirm locations', async () => {
      const mockLocations = [
        createKBLocation('1', { confirmed: false }),
        createKBLocation('2', { confirmed: false }),
      ];

      vi.mocked(client.GET).mockResolvedValueOnce({
        data: { items: mockLocations, total: 2, has_more: false },
        error: undefined,
        response: new Response(),
      });

      vi.mocked(client.POST).mockResolvedValueOnce({
        data: { success: true, confirmed_count: 2 },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.bulkConfirm(['1', '2']);
      });

      expect(client.POST).toHaveBeenCalledWith('/api/projects/project1/kb/location/bulk-confirm', {
        body: { entity_ids: ['1', '2'] },
      });
    });
  });

  describe('mergeLocation', () => {
    it('should merge locations', async () => {
      const mockLocations = [
        createKBLocation('1', { name: 'Main' }),
        createKBLocation('2', { name: 'Alias' }),
      ];

      vi.mocked(client.GET).mockResolvedValueOnce({
        data: { items: mockLocations, total: 2, has_more: false },
        error: undefined,
        response: new Response(),
      });

      vi.mocked(client.POST).mockResolvedValueOnce({
        data: { ...mockLocations[0], merged_ids: ['2'] },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.mergeLocation('1', '2');
      });

      expect(client.POST).toHaveBeenCalledWith('/api/projects/project1/kb/location/1/merge', {
        body: { merge_with_id: '2' },
      });
    });
  });

  describe('fetchReferences', () => {
    it('should fetch location references', async () => {
      vi.mocked(client.GET)
        .mockResolvedValueOnce({
          data: { items: [], total: 0, has_more: false },
          error: undefined,
          response: new Response(),
        })
        .mockResolvedValueOnce({
          data: {
            chapters: [{ id: 'ch1', title: 'Chapter 1', order: 1 }],
            characters: [{ id: 'char1', name: 'John' }],
          },
          error: undefined,
          response: new Response(),
        });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const references = await result.current.fetchReferences('1');

      expect(client.GET).toHaveBeenCalledWith('/api/projects/project1/kb/location/1/references');
    });
  });

  describe('loadMore', () => {
    it('should load more locations', async () => {
      vi.mocked(client.GET)
        .mockResolvedValueOnce({
          data: { items: [createKBLocation('1')], total: 10, has_more: true },
          error: undefined,
          response: new Response(),
        })
        .mockResolvedValueOnce({
          data: { items: [createKBLocation('2')], total: 10, has_more: false },
          error: undefined,
          response: new Response(),
        });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.locations).toHaveLength(1);
      expect(result.current.hasMore).toBe(true);

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.locations).toHaveLength(2);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('refetch', () => {
    it('should refetch locations', async () => {
      vi.mocked(client.GET).mockResolvedValue({
        data: { items: [], total: 0, has_more: false },
        error: undefined,
        response: new Response(),
      });

      const { result } = renderHook(() => useKBLocation('project1'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(client.GET).toHaveBeenCalledTimes(2);
    });
  });
});
