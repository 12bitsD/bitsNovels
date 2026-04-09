/* eslint-disable @typescript-eslint/no-explicit-any */
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../api/client';
import { useCallback, useEffect } from 'react';

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
  const queryClient = useQueryClient();

  const queryKey = ['notifications', category];

  const fetchNotifications = async ({ pageParam = 1 }): Promise<NotificationResponse> => {
    const params = new URLSearchParams();
    if (category !== 'all') {
      params.append('category', category);
    }
    params.append('page', pageParam.toString());
    params.append('page_size', PAGE_SIZE.toString());
    
    return fetchApi<NotificationResponse>('GET', `/api/me/notifications?${params.toString()}`);
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    error: queryError,
    refetch
  } = useInfiniteQuery({
    queryKey,
    queryFn: fetchNotifications,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.has_more ? allPages.length + 1 : undefined;
    },
  });

  const { data: unreadData, refetch: refetchUnreadCount } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => fetchApi<{ count: number }>('GET', '/api/me/notifications/unread-count'),
    refetchInterval: POLLING_INTERVAL,
  });

  useEffect(() => {
    refetchUnreadCount();
  }, [refetchUnreadCount]);

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => fetchApi('POST', `/api/me/notifications/${id}/read`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: Notification) => 
              item.id === id ? { ...item, read: true } : item
            )
          }))
        };
      });

      queryClient.setQueryData(['notifications', 'unreadCount'], (old: any) => {
        if (!old) return old;
        return { count: Math.max(0, old.count - 1) };
      });

      return { previousData };
    },
    onError: (_err, _newTodo, context) => {
      queryClient.setQueryData(queryKey, context?.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => fetchApi('POST', '/api/me/notifications/read-all'),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: Notification) => ({ ...item, read: true }))
          }))
        };
      });

      queryClient.setQueryData(['notifications', 'unreadCount'], { count: 0 });

      return { previousData };
    },
    onError: (_err, _newTodo, context) => {
      queryClient.setQueryData(queryKey, context?.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => fetchApi('DELETE', `/api/me/notifications/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData(queryKey);
      let wasUnread = false;

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => {
            const itemToDelete = page.items.find((item: Notification) => item.id === id);
            if (itemToDelete && !itemToDelete.read) {
              wasUnread = true;
            }
            return {
              ...page,
              items: page.items.filter((item: Notification) => item.id !== id)
            };
          })
        };
      });

      if (wasUnread) {
        queryClient.setQueryData(['notifications', 'unreadCount'], (old: any) => {
          if (!old) return old;
          return { count: Math.max(0, old.count - 1) };
        });
      }

      return { previousData };
    },
    onError: (_err, _newTodo, context) => {
      queryClient.setQueryData(queryKey, context?.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });

  const notifications = data?.pages.flatMap(page => page.items) || [];

  return {
    notifications,
    loading: isLoading,
    error: queryError instanceof Error ? queryError.message : (queryError ? String(queryError) : null),
    unreadCount: unreadData?.count || 0,
    hasMore: !!hasNextPage,
    markAsRead: (id: string) => markAsReadMutation.mutateAsync(id),
    markAllAsRead: () => markAllAsReadMutation.mutateAsync(),
    deleteNotification: (id: string) => deleteNotificationMutation.mutateAsync(id),
    loadMore: useCallback(() => {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]),
    refetch: () => refetch(),
  };
}
