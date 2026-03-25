import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import VerificationResultPage from '../components/VerificationResultPage';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/verify?token=mock-token']}>
      {ui}
    </MemoryRouter>
  );
};

describe('VerificationResultPage', () => {
  it('shows success message on successful verification', async () => {
    server.use(
      http.post('/api/auth/verify-email', () => {
        return HttpResponse.json({ message: 'Success' });
      })
    );

    renderWithRouter(<VerificationResultPage />);
    expect(await screen.findByText(/验证成功/i)).toBeInTheDocument();
  });

  it('shows expired message and resend button on failure', async () => {
    server.use(
      http.post('/api/auth/verify-email', () => {
        return new HttpResponse(JSON.stringify({ message: 'Token expired' }), { status: 400 });
      })
    );

    renderWithRouter(<VerificationResultPage />);
    expect(await screen.findByText(/链接已过期/i)).toBeInTheDocument();
    
    const resendBtn = screen.getByRole('button', { name: /重新发送/i });
    expect(resendBtn).toBeInTheDocument();
  });

  it('calls POST /api/auth/resend-verification when clicking resend', async () => {
    server.use(
      http.post('/api/auth/verify-email', () => {
        return new HttpResponse(JSON.stringify({ message: 'Token expired' }), { status: 400 });
      }),
      http.post('/api/auth/resend-verification', () => {
        return HttpResponse.json({ message: 'Resent' });
      })
    );

    renderWithRouter(<VerificationResultPage />);
    const resendBtn = await screen.findByRole('button', { name: /重新发送/i });
    
    fireEvent.click(resendBtn);
    expect(await screen.findByText(/已重新发送/i)).toBeInTheDocument();
  });
});
