import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from '../components/ResetPasswordPage';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/reset-password?token=mock-token']}>
      {ui}
    </MemoryRouter>
  );
};

describe('ResetPasswordPage', () => {
  it('renders new password, confirm password inputs', () => {
    renderWithRouter(<ResetPasswordPage />);
    expect(screen.getByLabelText(/^新密码/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/确认新密码/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重置密码/i })).toBeInTheDocument();
  });

  it('validates new password strength', async () => {
    renderWithRouter(<ResetPasswordPage />);
    const passwordInput = screen.getByLabelText(/^新密码/i);
    
    fireEvent.change(passwordInput, { target: { value: 'weak' } });
    expect(await screen.findByText(/至少 8 位，且同时包含大写字母、小写字母、数字/i)).toBeInTheDocument();
  });

  it('calls POST /api/auth/reset-password and shows success message', async () => {
    let requestBody: any;
    server.use(
      http.post('/api/auth/reset-password', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ message: 'Success' });
      })
    );

    renderWithRouter(<ResetPasswordPage />);
    fireEvent.change(screen.getByLabelText(/^新密码/i), { target: { value: 'StrongPass123' } });
    fireEvent.change(screen.getByLabelText(/确认新密码/i), { target: { value: 'StrongPass123' } });
    fireEvent.click(screen.getByRole('button', { name: /重置密码/i }));

    expect(await screen.findByText(/密码已重置/i)).toBeInTheDocument();
    expect(requestBody).toEqual({
      token: 'mock-token',
      new_password: 'StrongPass123'
    });
  });
});
