import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProjectDashboard from '../components/ProjectDashboard';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ProjectDashboard', () => {
  it('should display loading state initially', () => {
    renderWithRouter(<ProjectDashboard />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should render project cards with correct info', async () => {
    renderWithRouter(<ProjectDashboard />);
    
    // Wait for projects to load from mock API
    expect(await screen.findByText('The Great Novel')).toBeInTheDocument();
    expect(screen.getByText('Short Story')).toBeInTheDocument();
    
    // Check specific details
    expect(screen.getByText(/15,000/)).toBeInTheDocument();
    expect(screen.getAllByText(/10/)[0]).toBeInTheDocument();
    expect(screen.getByText('玄幻')).toBeInTheDocument();
  });

  it('should display empty state when no projects exist', async () => {
    server.use(
      http.get('/api/projects', () => {
        return HttpResponse.json([]);
      })
    );

    renderWithRouter(<ProjectDashboard />);
    
    expect(await screen.findByText(/新建项目/)).toBeInTheDocument();
    expect(screen.getByText(/开始您的第一部作品/)).toBeInTheDocument();
  });

  it('should filter projects by search query', async () => {
    renderWithRouter(<ProjectDashboard />);
    
    await screen.findByText('The Great Novel');
    
    const searchInput = screen.getByPlaceholderText(/搜索项目/i);
    fireEvent.change(searchInput, { target: { value: 'Short' } });
    
    expect(screen.getByText('Short Story')).toBeInTheDocument();
    expect(screen.queryByText('The Great Novel')).not.toBeInTheDocument();
  });

  it('should show not found state when search yields no results', async () => {
    renderWithRouter(<ProjectDashboard />);
    
    await screen.findByText('The Great Novel');
    
    const searchInput = screen.getByPlaceholderText(/搜索项目/i);
    fireEvent.change(searchInput, { target: { value: 'XYZ' } });
    
    expect(screen.getByText(/未找到匹配项目/i)).toBeInTheDocument();
  });

  it('should toggle between card and list view', async () => {
    renderWithRouter(<ProjectDashboard />);
    await screen.findByText('The Great Novel');

    const listViewBtn = screen.getByLabelText(/列表视图/i);
    fireEvent.click(listViewBtn);
    
    expect(screen.getByTestId('list-view-container')).toBeInTheDocument();
    
    const cardViewBtn = screen.getByLabelText(/卡片视图/i);
    fireEvent.click(cardViewBtn);
    
    expect(screen.getByTestId('card-view-container')).toBeInTheDocument();
  });
});
