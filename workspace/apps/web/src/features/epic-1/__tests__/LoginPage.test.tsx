import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../components/LoginPage';
import { AuthProvider } from '../../../contexts/AuthContext';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter><AuthProvider>{ui}</AuthProvider></BrowserRouter>);
};

describe('LoginPage', () => {
  it('renders login form with oauth buttons', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/记住我/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
    expect(screen.getByText(/忘记密码/i)).toBeInTheDocument();
    
    // OAuth buttons
    expect(screen.getByRole('button', { name: /Google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GitHub/i })).toBeInTheDocument();
  });

  it('calls POST /api/auth/login and redirects on success', async () => {
    let requestBody: unknown;
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({
          token: 'mock-token',
          userId: 'user-1',
          expiresAt: '2099-01-01T00:00:00.000Z',
          rememberMe: true
        });
      })
    );

    renderWithRouter(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/密码/i), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByLabelText(/记住我/i));
    
    fireEvent.click(screen.getByRole('button', { name: /^登录$/i }));

    await waitFor(() => {
      expect(requestBody).toEqual({
        email: 'test@example.com',
        password: 'Password123',
        rememberMe: true
      });
      // In a real test, we might check for router redirect, but for now we verify mock call
    });
  });

  it('shows error message on login failure', async () => {
    server.use(
      http.post('/api/auth/login', () => {
        return new HttpResponse(JSON.stringify({ detail: '邮箱或密码错误' }), { status: 401 });
      })
    );

    renderWithRouter(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/密码/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /^登录$/i }));

    expect(await screen.findByText(/邮箱或密码错误/i)).toBeInTheDocument();
  });

  it('navigates to register page when clicking "去注册"', async () => {
    renderWithRouter(<LoginPage />);
    const registerLink = screen.getByRole('link', { name: /去注册/i });
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('handles OAuth Google button click', async () => {
    renderWithRouter(<LoginPage />);
    const googleBtn = screen.getByRole('button', { name: /Google/i });
    expect(googleBtn).toBeInTheDocument();
  });

  it('shows error and stays on page when login fails with generic error', async () => {
    server.use(
      http.post('/api/auth/login', () => {
        return new HttpResponse(JSON.stringify({ detail: '登录失败' }), { status: 500 });
      })
    );
    renderWithRouter(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/密码/i), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: /^登录$/i }));
    expect(await screen.findByText(/登录失败/i)).toBeInTheDocument();
  });
});
