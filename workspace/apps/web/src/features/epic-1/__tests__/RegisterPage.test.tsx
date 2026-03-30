import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from '../components/RegisterPage';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('RegisterPage', () => {
  it('renders email, password, confirm password inputs and submit button', () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^密码/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/确认密码/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /注册/i })).toBeInTheDocument();
  });

  it('validates password strength in real-time', async () => {
    renderWithRouter(<RegisterPage />);
    const passwordInput = screen.getByLabelText(/^密码/i);
    
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    expect(await screen.findByText(/至少 8 位，且同时包含大写字母、小写字母、数字/i)).toBeInTheDocument();

    fireEvent.change(passwordInput, { target: { value: 'StrongPass123' } });
    await waitFor(() => {
      expect(screen.queryByText(/至少 8 位，且同时包含大写字母、小写字母、数字/i)).not.toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    renderWithRouter(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/^密码/i), { target: { value: 'StrongPass123' } });
    fireEvent.change(screen.getByLabelText(/确认密码/i), { target: { value: 'StrongPass456' } });
    fireEvent.blur(screen.getByLabelText(/确认密码/i));
    
    expect(await screen.findByText(/密码不一致/i)).toBeInTheDocument();
  });

  it('navigates to login when clicking "已有账号"', async () => {
    renderWithRouter(<RegisterPage />);
    const loginLink = screen.getByRole('link', { name: /去登录/i });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('shows error when submitting with invalid password', async () => {
    renderWithRouter(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^密码/i), { target: { value: 'weak' } });
    fireEvent.click(screen.getByRole('button', { name: /注册/i }));
    
    expect(await screen.findByText(/至少 8 位，且同时包含大写字母、小写字母、数字/i)).toBeInTheDocument();
  });

  it('clears error when password becomes valid after being invalid', async () => {
    renderWithRouter(<RegisterPage />);
    const passwordInput = screen.getByLabelText(/^密码/i);
    
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    expect(await screen.findByText(/至少 8 位/i)).toBeInTheDocument();
    
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123' } });
    await waitFor(() => {
      expect(screen.queryByText(/至少 8 位/i)).not.toBeInTheDocument();
    });
  });

  it('shows error when API returns generic error', async () => {
    server.use(
      http.post('/api/auth/register', () => {
        return new HttpResponse(JSON.stringify({ detail: '注册失败' }), { status: 500 });
      })
    );
    renderWithRouter(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^密码/i), { target: { value: 'StrongPass123' } });
    fireEvent.change(screen.getByLabelText(/确认密码/i), { target: { value: 'StrongPass123' } });
    fireEvent.click(screen.getByRole('button', { name: /注册/i }));
    expect(await screen.findByText(/注册失败/i)).toBeInTheDocument();
  });

  it('calls POST /api/auth/register on valid submit and shows success message', async () => {
    let requestBody: unknown;
    server.use(
      http.post('/api/auth/register', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ message: 'Success' });
      })
    );

    renderWithRouter(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^密码/i), { target: { value: 'StrongPass123' } });
    fireEvent.change(screen.getByLabelText(/确认密码/i), { target: { value: 'StrongPass123' } });
    
    fireEvent.click(screen.getByRole('button', { name: /注册/i }));

    expect(await screen.findByText(/请查收您的验证邮件以激活账号/i)).toBeInTheDocument();
    expect(requestBody).toEqual({
      email: 'test@example.com',
      password: 'StrongPass123'
    });
  });
});
