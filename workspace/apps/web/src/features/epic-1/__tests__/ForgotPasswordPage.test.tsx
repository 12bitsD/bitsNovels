import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ForgotPasswordPage from '../components/ForgotPasswordPage';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('ForgotPasswordPage', () => {
  it('renders email input and submit button', () => {
    renderWithRouter(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /发送重置邮件/i })).toBeInTheDocument();
  });

  it('calls POST /api/auth/forgot-password and shows success message', async () => {
    let requestBody: unknown;
    server.use(
      http.post('/api/auth/forgot-password', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ message: 'Success' });
      })
    );

    renderWithRouter(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText(/邮箱/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /发送重置邮件/i }));

    expect(await screen.findByText(/如邮箱已注册，将收到重置邮件/i)).toBeInTheDocument();
    expect(requestBody).toEqual({ email: 'test@example.com' });
  });
});
