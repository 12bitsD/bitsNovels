import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { client } from '../../../api/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { data, error: apiError } = await client.POST('/api/auth/login', {
        body: { email, password, remember_me: rememberMe }
      });
      
      if (apiError) {
        throw new Error((apiError as { detail?: string }).detail || '登录失败');
      }
      
      if (data && data.token) {
        localStorage.setItem('token', data.token);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: string) => {
    // In real implementation this would redirect to /api/auth/oauth/:provider/start
    window.location.href = `/api/auth/oauth/${provider}/start`;
  };

  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center p-4 font-sans text-ink">
      <div 
        className="bg-white/80 backdrop-blur-xl p-10 rounded-xl border border-white/60 max-w-md w-full animate-in fade-in zoom-in-95 duration-500"
        style={{ boxShadow: 'var(--shadow-card), var(--shadow-inner-light)' }}
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-amber/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber/20 shadow-sm">
            <span className="text-2xl text-amber opacity-90">✒️</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">欢迎回来</h2>
          <p className="text-ink-light text-sm mt-2">登录您的账号继续创作</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-light mb-1.5">邮箱</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-base"
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-ink-light">密码</label>
              <Link to="/forgot-password" className="text-xs text-amber hover:text-amber-dark transition-colors">忘记密码？</Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-base"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-border text-amber focus:ring-amber/30 transition-all cursor-pointer"
            />
            <label htmlFor="remember" className="ml-2 text-sm text-ink-light cursor-pointer select-none">记住我</label>
          </div>

          {error && <p className="text-error text-sm bg-error/10 p-2 rounded">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-2"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-ink-light/70 text-xs tracking-wide">或使用第三方登录</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              onClick={() => handleOAuth('google')}
              className="btn-secondary flex justify-center items-center gap-2"
            >
              Google
            </button>
            <button
              onClick={() => handleOAuth('github')}
              className="btn-secondary flex justify-center items-center gap-2"
            >
              GitHub
            </button>
          </div>
        </div>
        
        <div className="text-sm text-ink-light text-center mt-8">
          还没有账号？ <Link to="/register" className="text-amber font-medium hover:text-amber-dark transition-colors">去注册</Link>
        </div>
      </div>
    </div>
  );
}
