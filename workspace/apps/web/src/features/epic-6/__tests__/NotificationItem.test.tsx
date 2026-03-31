import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationItem from '../components/NotificationItem';
import type { Notification, NotificationType } from '../hooks/useNotifications';

const createNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: '1',
  userId: 'user1',
  type: 'parse_done' as NotificationType,
  title: 'Test Notification',
  body: 'This is a test notification body',
  read: false,
  createdAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

describe('NotificationItem', () => {
  it('should render notification title and body', () => {
    const notification = createNotification({
      title: '解析完成',
      body: '您的项目解析已完成',
    });

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('解析完成')).toBeInTheDocument();
    expect(screen.getByText('您的项目解析已完成')).toBeInTheDocument();
  });

  it('should display unread styling for unread notifications', () => {
    const notification = createNotification({ read: false });

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const item = screen.getByRole('listitem');
    expect(item).toHaveClass('font-medium');
  });

  it('should display read styling for read notifications', () => {
    const notification = createNotification({ read: true });

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const item = screen.getByRole('listitem');
    expect(item).toHaveClass('opacity-60');
  });

  it('should call onMarkAsRead when clicked', () => {
    const notification = createNotification({ id: '123', read: false });
    const onMarkAsRead = vi.fn();

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={onMarkAsRead}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('listitem'));
    expect(onMarkAsRead).toHaveBeenCalledWith('123');
  });

  it('should not call onMarkAsRead when already read', () => {
    const notification = createNotification({ id: '123', read: true });
    const onMarkAsRead = vi.fn();

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={onMarkAsRead}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('listitem'));
    expect(onMarkAsRead).not.toHaveBeenCalled();
  });

  it('should call onDelete when delete button is clicked', () => {
    const notification = createNotification({ id: '456' });
    const onDelete = vi.fn();

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByLabelText('删除通知'));
    expect(onDelete).toHaveBeenCalledWith('456');
  });

  it('should stop propagation when delete button is clicked', () => {
    const notification = createNotification({ id: '456', read: false });
    const onMarkAsRead = vi.fn();
    const onDelete = vi.fn();

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={onMarkAsRead}
        onDelete={onDelete}
      />
    );

    const deleteButton = screen.getByLabelText('删除通知');
    fireEvent.click(deleteButton);

    expect(onMarkAsRead).not.toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('456');
  });

  it('should display correct icon for parse_done type', () => {
    const notification = createNotification({ type: 'parse_done' });

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByLabelText('AI解析')).toBeInTheDocument();
  });

  it('should display correct icon for backup_done type', () => {
    const notification = createNotification({ type: 'backup_done' });

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByLabelText('备份导出')).toBeInTheDocument();
  });

  it('should display correct icon for storage_warning type', () => {
    const notification = createNotification({ type: 'storage_warning' });

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByLabelText('系统通知')).toBeInTheDocument();
  });

  it('should display correct icon for consistency_issue type', () => {
    const notification = createNotification({ type: 'consistency_issue' });

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByLabelText('一致性')).toBeInTheDocument();
  });

  it('should format relative time correctly', () => {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    const notification = createNotification({
      createdAt: twoMinutesAgo.toISOString(),
    });

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('2分钟前')).toBeInTheDocument();
  });

  it('should format hours ago correctly', () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const notification = createNotification({
      createdAt: threeHoursAgo.toISOString(),
    });

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('3小时前')).toBeInTheDocument();
  });

  it('should format days ago correctly', () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const notification = createNotification({
      createdAt: twoDaysAgo.toISOString(),
    });

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('2天前')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    const notification = createNotification({ read: false });

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('aria-label', '未读通知: Test Notification');
  });

  it('should have ARIA label for read notification', () => {
    const notification = createNotification({ read: true });

    render(
      <NotificationItem
        notification={notification}
        onMarkAsRead={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('aria-label', '已读通知: Test Notification');
  });
});
