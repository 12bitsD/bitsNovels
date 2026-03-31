import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationPanel from '../components/NotificationPanel';
import * as useNotificationsModule from '../hooks/useNotifications';
import type { Notification, NotificationCenterCategory } from '../hooks/useNotifications';

vi.mock('../hooks/useNotifications');

const createNotification = (id: string, overrides: Partial<Notification> = {}): Notification => ({
  id,
  userId: 'user1',
  type: 'parse_done',
  title: `Notification ${id}`,
  body: `Body ${id}`,
  read: false,
  createdAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

const mockUseNotifications = (overrides: Partial<ReturnType<typeof useNotificationsModule.useNotifications>> = {}) => {
  const defaultValue = {
    notifications: [] as Notification[],
    loading: false,
    error: null,
    unreadCount: 0,
    hasMore: false,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    loadMore: vi.fn(),
    refetch: vi.fn(),
  };
  return { ...defaultValue, ...overrides };
};

describe('NotificationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all category tabs', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(mockUseNotifications());

    render(<NotificationPanel category="all" onCategoryChange={vi.fn()} />);

    expect(screen.getByRole('tab', { name: '全部' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AI解析' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '备份导出' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '一致性' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '系统' })).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(mockUseNotifications());

    render(<NotificationPanel category="ai_parse" onCategoryChange={vi.fn()} />);

    const aiTab = screen.getByRole('tab', { name: 'AI解析' });
    expect(aiTab).toHaveAttribute('aria-selected', 'true');
  });

  it('should call onCategoryChange when tab is clicked', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(mockUseNotifications());
    const onCategoryChange = vi.fn();

    render(<NotificationPanel category="all" onCategoryChange={onCategoryChange} />);

    fireEvent.click(screen.getByRole('tab', { name: '系统' }));
    expect(onCategoryChange).toHaveBeenCalledWith('system');
  });

  it('should render notification list', () => {
    const notifications = [
      createNotification('1', { title: 'First' }),
      createNotification('2', { title: 'Second' }),
    ];

    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(
      mockUseNotifications({ notifications })
    );

    render(<NotificationPanel category="all" onCategoryChange={vi.fn()} />);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(
      mockUseNotifications({ loading: true })
    );

    render(<NotificationPanel category="all" onCategoryChange={vi.fn()} />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should show empty state when no notifications', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(
      mockUseNotifications({ notifications: [] })
    );

    render(<NotificationPanel category="all" onCategoryChange={vi.fn()} />);

    expect(screen.getByText('暂无通知')).toBeInTheDocument();
  });

  it('should show empty state for filtered category', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(
      mockUseNotifications({ notifications: [] })
    );

    render(<NotificationPanel category="system" onCategoryChange={vi.fn()} />);

    expect(screen.getByText('该系统分类下暂无通知')).toBeInTheDocument();
  });

  it('should call markAllAsRead when button clicked', () => {
    const markAllAsRead = vi.fn();
    const notifications = [createNotification('1', { read: false })];

    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(
      mockUseNotifications({ markAllAsRead, notifications })
    );

    render(<NotificationPanel category="all" onCategoryChange={vi.fn()} />);

    fireEvent.click(screen.getByText('全部已读'));
    expect(markAllAsRead).toHaveBeenCalled();
  });

  it('should disable mark all as read when no unread notifications', () => {
    const notifications = [createNotification('1', { read: true })];

    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(
      mockUseNotifications({ notifications })
    );

    render(<NotificationPanel category="all" onCategoryChange={vi.fn()} />);

    const button = screen.getByText('全部已读');
    expect(button).toBeDisabled();
  });

  it('should call delete read notifications when clear clicked', () => {
    const deleteNotification = vi.fn();
    const notifications = [
      createNotification('1', { read: true }),
      createNotification('2', { read: false }),
    ];

    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(
      mockUseNotifications({ notifications, deleteNotification })
    );

    render(<NotificationPanel category="all" onCategoryChange={vi.fn()} />);

    fireEvent.click(screen.getByText('清空已读'));
    expect(deleteNotification).toHaveBeenCalledWith('1');
    expect(deleteNotification).not.toHaveBeenCalledWith('2');
  });

  it('should disable clear read when no read notifications', () => {
    const notifications = [createNotification('1', { read: false })];

    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(
      mockUseNotifications({ notifications })
    );

    render(<NotificationPanel category="all" onCategoryChange={vi.fn()} />);

    const button = screen.getByText('清空已读');
    expect(button).toBeDisabled();
  });

  it('should show load more button when hasMore is true', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(
      mockUseNotifications({ hasMore: true })
    );

    render(<NotificationPanel category="all" onCategoryChange={vi.fn()} />);

    expect(screen.getByText('加载更多')).toBeInTheDocument();
  });

  it('should call loadMore when button clicked', () => {
    const loadMore = vi.fn();
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(
      mockUseNotifications({ hasMore: true, loadMore })
    );

    render(<NotificationPanel category="all" onCategoryChange={vi.fn()} />);

    fireEvent.click(screen.getByText('加载更多'));
    expect(loadMore).toHaveBeenCalled();
  });

  it('should render as dropdown when variant is dropdown', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(mockUseNotifications());

    render(
      <NotificationPanel 
        category="all" 
        onCategoryChange={vi.fn()} 
        variant="dropdown" 
      />
    );

    expect(screen.getByRole('dialog')).toHaveClass('absolute');
  });

  it('should render as standalone when variant is standalone', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue(mockUseNotifications());

    render(
      <NotificationPanel 
        category="all" 
        onCategoryChange={vi.fn()} 
        variant="standalone" 
      />
    );

    expect(screen.getByRole('region')).toHaveClass('max-w-2xl');
  });
});
