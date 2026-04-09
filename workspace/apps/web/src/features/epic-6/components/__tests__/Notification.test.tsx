/* eslint-disable @typescript-eslint/no-explicit-any */
import { render } from '@testing-library/react';
import { describe, it, vi } from 'vitest';
import NotificationBell from '../NotificationBell';
import NotificationItem from '../NotificationItem';
import NotificationPanel from '../NotificationPanel';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProvider = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Epic 6 Components', () => {
  it('renders NotificationBell', () => {
    renderWithProvider(<NotificationBell />);
  });
  
  it('renders NotificationItem', () => {
    renderWithProvider(<NotificationItem notification={{ id: '1', title: 'test', message: 'test', type: 'parse_done', read: false, createdAt: '2023-01-01' } as any} onMarkAsRead={vi.fn()} onDelete={vi.fn()} />);
  });

  it('renders NotificationPanel', () => {
    renderWithProvider(<NotificationPanel category="all" onCategoryChange={vi.fn()} />);
  });
});
