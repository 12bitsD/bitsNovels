import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationBell from '../components/NotificationBell';
import * as useNotificationsModule from '../hooks/useNotifications';

vi.mock('../hooks/useNotifications');

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render bell icon', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      unreadCount: 0,
      hasMore: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<NotificationBell />);

    expect(screen.getByRole('button', { name: '打开通知面板' })).toBeInTheDocument();
  });

  it('should show unread count badge when there are unread notifications', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      unreadCount: 5,
      hasMore: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<NotificationBell />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should show 99+ badge when unread count exceeds 99', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      unreadCount: 150,
      hasMore: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<NotificationBell />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('should not show badge when no unread notifications', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      unreadCount: 0,
      hasMore: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<NotificationBell />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should open panel when bell is clicked', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      unreadCount: 0,
      hasMore: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<NotificationBell />);

    const bell = screen.getByRole('button', { name: '打开通知面板' });
    fireEvent.click(bell);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should close panel when bell is clicked again', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      unreadCount: 0,
      hasMore: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<NotificationBell />);

    const bell = screen.getByRole('button');
    fireEvent.click(bell);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(bell);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should close panel when clicking outside', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      unreadCount: 0,
      hasMore: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(
      <div>
        <NotificationBell />
        <div data-testid="outside">Outside</div>
      </div>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should change aria-label when panel is open', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      unreadCount: 0,
      hasMore: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<NotificationBell />);

    const bell = screen.getByRole('button');
    expect(bell).toHaveAttribute('aria-label', '打开通知面板');

    fireEvent.click(bell);
    expect(bell).toHaveAttribute('aria-label', '关闭通知面板');
  });

  it('should have aria-expanded attribute', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      unreadCount: 0,
      hasMore: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<NotificationBell />);

    const bell = screen.getByRole('button');
    expect(bell).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(bell);
    expect(bell).toHaveAttribute('aria-expanded', 'true');
  });

  it('should render panel with correct category', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      unreadCount: 0,
      hasMore: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('tab', { name: '全部' })).toHaveAttribute('aria-selected', 'true');
  });

  it('should update category when tab is clicked', () => {
    vi.mocked(useNotificationsModule.useNotifications).mockReturnValue({
      notifications: [],
      loading: false,
      error: null,
      unreadCount: 0,
      hasMore: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('tab', { name: '系统' }));

    expect(screen.getByRole('tab', { name: '系统' })).toHaveAttribute('aria-selected', 'true');
  });
});
