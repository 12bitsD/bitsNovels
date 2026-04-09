/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotifications } from '../hooks/useNotifications';

vi.mock('../../../api/client', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    fetchApi: vi.fn(),
  };
});

import { fetchApi } from '../../../api/client';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchApi).mockImplementation(async (_method, path) => {
      if (path === '/api/me/notifications/unread-count') {
        return { count: 0 };
      }
      return { items: [], total: 0, has_more: false };
    });
  });

  describe('initial state', () => {
    it('should start with empty notifications and loading state', () => {
      const { result } = renderHook(() => useNotifications(), { wrapper });
      
      expect(result.current.notifications).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.unreadCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('fetchNotifications', () => {
    it('should fetch notifications on mount', async () => {
      const mockNotifications = [
        {
          id: '1',
          userId: 'user1',
          type: 'parse_done' as const,
          title: '解析完成',
          body: '项目解析已完成',
          read: false,
          createdAt: '2024-01-15T10:00:00Z',
        },
      ];

      vi.mocked(fetchApi).mockResolvedValueOnce({
        items: mockNotifications,
        total: 1,
        has_more: false,
      });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('解析完成');
    });

    it('should handle fetch error', async () => {
      vi.mocked(fetchApi).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should fetch with category filter', async () => {
      vi.mocked(fetchApi).mockResolvedValueOnce({ items: [], total: 0, has_more: false });

      const { result } = renderHook(() => useNotifications('ai_parse'), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(fetchApi).toHaveBeenCalledWith(
        'GET',
        '/api/me/notifications?category=ai_parse&page=1&page_size=20'
      );
    });

    it('should fetch unread count on mount', async () => {
      vi.mocked(fetchApi)
        .mockResolvedValueOnce({ items: [], total: 0, has_more: false })
        .mockResolvedValueOnce({ count: 3 });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(fetchApi).toHaveBeenCalledWith('GET', '/api/me/notifications/unread-count');
      });
    });
  });

  describe('markAsRead', () => {
    it('should optimistically update read status', async () => {
      const mockNotifications = [
        { id: '1', type: 'parse_done', title: 'Test', body: '', read: false, createdAt: '2024-01-15T10:00:00Z', userId: 'u1' },
      ];

      vi.mocked(fetchApi).mockResolvedValueOnce({ items: mockNotifications, total: 1, has_more: false });
      vi.mocked(fetchApi).mockResolvedValueOnce({ count: 1 });
      vi.mocked(fetchApi).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      expect(result.current.notifications[0].read).toBe(false);

      await act(async () => {
        await result.current.markAsRead('1');
      });

      await waitFor(() => {
        expect(result.current.notifications[0].read).toBe(true);
      });
      expect(fetchApi).toHaveBeenCalledWith('POST', '/api/me/notifications/1/read');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const mockNotifications = [
        { id: '1', type: 'parse_done', title: 'Test1', body: '', read: false, createdAt: '2024-01-15T10:00:00Z', userId: 'u1' },
        { id: '2', type: 'backup_done', title: 'Test2', body: '', read: false, createdAt: '2024-01-15T11:00:00Z', userId: 'u1' },
      ];

      vi.mocked(fetchApi).mockResolvedValueOnce({ items: mockNotifications, total: 2, has_more: false });
      vi.mocked(fetchApi).mockResolvedValueOnce({ count: 2 });
      vi.mocked(fetchApi).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      await act(async () => {
        await result.current.markAllAsRead();
      });

      await waitFor(() => {
        expect(result.current.notifications.every(n => n.read)).toBe(true);
      });
      expect(fetchApi).toHaveBeenCalledWith('POST', '/api/me/notifications/read-all');
    });
  });

  describe('deleteNotification', () => {
    it('should remove notification from list', async () => {
      const mockNotifications = [
        { id: '1', type: 'parse_done', title: 'Test', body: '', read: true, createdAt: '2024-01-15T10:00:00Z', userId: 'u1' },
      ];

      vi.mocked(fetchApi).mockResolvedValueOnce({ items: mockNotifications, total: 1, has_more: false });
      vi.mocked(fetchApi).mockResolvedValueOnce({ count: 1 });
      vi.mocked(fetchApi).mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteNotification('1');
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(0);
      });
      expect(fetchApi).toHaveBeenCalledWith('DELETE', '/api/me/notifications/1');
    });
  });

  describe('refetch', () => {
    it('should refetch notifications', async () => {
      vi.mocked(fetchApi).mockResolvedValue({ items: [], total: 0, has_more: false });

      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(fetchApi).toHaveBeenCalledTimes(3);
    });
  });
});
