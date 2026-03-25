import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UnverifiedPrompt from '../components/UnverifiedPrompt';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';

describe('UnverifiedPrompt', () => {
  it('renders prompt with resend button', () => {
    render(<UnverifiedPrompt email="test@example.com" />);
    expect(screen.getByText(/请验证您的邮箱以确保账号安全/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重新发送/i })).toBeInTheDocument();
  });

  it('calls POST /api/auth/resend-verification on click', async () => {
    let requestBody: any;
    server.use(
      http.post('/api/auth/resend-verification', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ message: 'Resent' });
      })
    );

    render(<UnverifiedPrompt email="test@example.com" />);
    fireEvent.click(screen.getByRole('button', { name: /重新发送/i }));

    expect(await screen.findByText(/已发送/i)).toBeInTheDocument();
    expect(requestBody).toEqual({ email: 'test@example.com' });
  });
});
