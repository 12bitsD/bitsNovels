import { useState, useEffect, useCallback, useRef } from 'react';
import { client } from '../../../api/client';

export type NotificationType =
  | 'parse_done'
  | 'parse_failed'
  | 'backup_done'
  | 'backup_failed'
  | 'export_done'
  | 'consistency_issue'
  | 'foreshadow_reminder'
  | 'foreshadow_warning'
  | 'recycle_expire'
  | 'snapshot_expire'
  | 'storage_warning'
  | 'storage_critical'
  | 'system_announcement';

export type NotificationCenterCategory =
  | 'all'
  | 'ai_parse'
  | 'backup_export'
  | 'consistency_foreshadow'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  projectId?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationResponse {
  items: Notification[];
  total: number;
  has_more: boolean;
}

const POLLING_INTERVAL = 30000;
const PAGE_SIZE = 20;

export function useNotifications(category: NotificationCenterCategory = 'all') {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buildQueryString = useCallback((pageNum: number) => {
    const params = new URLSearchParams();
    if (category !== 'all') {
      params.append('category', category);
    }
    params.append('page', pageNum.toString());
    params.append('page_size', PAGE_SIZE.toString());
    return params.toString();
  }, [category]);

  const fetchNotifications = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const queryString = buildQueryString(pageNum);
      const { data, error: apiError } = await client.GET(`/api/me/notifications?${queryString}`);

      if (apiError) {
        throw new Error('Failed to fetch notifications');
      }

      const response = data as NotificationResponse;

      if (append) {
        setNotifications(prev => [...prev, ...response.items]);
      } else {
        setNotifications(response.items);
      }

      setHasMore(response.has_more);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data, error: apiError } = await client.GET('/api/me/notifications/unread-count');

      if (apiError) {
        return;
      }

      setUnreadCount((data as { count: number }).count);
    } catch {
      // Silent fail for unread count polling
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    const originalNotifications = [...notifications];

    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      const { error: apiError } = await client.POST(`/api/me/notifications/${id}/read`);

      if (apiError) {
        throw new Error('Failed to mark as read');
      }

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      setNotifications(originalNotifications);
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    const originalNotifications = [...notifications];

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      const { error: apiError } = await client.POST('/api/me/notifications/read-all');

      if (apiError) {
        throw new Error('Failed to mark all as read');
      }

      setUnreadCount(0);
    } catch {
      setNotifications(originalNotifications);
    }
  }, [notifications]);

  const deleteNotification = useCallback(async (id: string) => {
    const originalNotifications = [...notifications];
    const deletedNotification = notifications.find(n => n.id === id);

    setNotifications(prev => prev.filter(n => n.id !== id));

    try {
      const { error: apiError } = await client.DELETE(`/api/me/notifications/${id}`);

      if (apiError) {
        throw new Error('Failed to delete notification');
      }

      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      setNotifications(originalNotifications);
    }
  }, [notifications]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchNotifications(page + 1, true);
  }, [hasMore, loading, page, fetchNotifications]);

  useEffect(() => {
    fetchNotifications(1, false);
  }, [category, fetchNotifications]);

  useEffect(() => {
    fetchUnreadCount();

    pollingRef.current = setInterval(fetchUnreadCount, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchUnreadCount]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
    refetch: () => fetchNotifications(1, false),
  };
}
