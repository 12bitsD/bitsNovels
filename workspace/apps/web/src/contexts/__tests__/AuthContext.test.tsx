import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/setup';

const TestConsumer = () => {
  const { user, token, isAuthenticated, isLoading, isVerified, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="token">{token ?? 'no-token'}</span>
      <span data-testid="user">{user?.email ?? 'no-user'}</span>
      <span data-testid="verified">{String(isVerified)}</span>
      <button onClick={() => login('test@test.com', 'password')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('throws when useAuth called outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth() must be used within <AuthProvider>');
    spy.mockRestore();
  });

  it('initializes with token from localStorage', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('test-token');
    render(<TestConsumer />, { wrapper: AuthProvider });
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('test-token'));
  });

  it('login sets token and fetches user', async () => {
    server.use(
      http.post('/api/auth/login', () => HttpResponse.json({ token: 'new-token' })),
      http.get('/api/auth/me', () => HttpResponse.json({
        user: { id: '1', email: 'test@test.com' },
        is_verified: true
      }))
    );

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await result.current.login('test@test.com', 'password');
    await waitFor(() => expect(result.current.token).toBe('new-token'));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isVerified).toBe(true);
  });

  it('logout clears token and user', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('test-token');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.logout());
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
