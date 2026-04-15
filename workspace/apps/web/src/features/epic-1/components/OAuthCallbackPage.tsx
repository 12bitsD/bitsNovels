import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function readHashParams(hash: string) {
  const normalized = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(normalized);
}

export default function OAuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = readHashParams(window.location.hash);
    const token = params.get('token');
    const ok = params.get('ok');

    if (ok === '1' && token) {
      localStorage.setItem('token', token);
      navigate('/dashboard', { replace: true });
      return;
    }

    navigate('/login', { replace: true, state: { oauthError: true } });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment text-ink">
      正在完成登录...
    </div>
  );
}
