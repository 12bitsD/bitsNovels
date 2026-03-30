import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { Icons } from '../../../components/ui/icons';
import { AuthCard } from '../../../components/ui/AuthCard';
import { FormInput } from '../../../components/ui/FormInput';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingButton } from '../../../components/ui/LoadingButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password, rememberMe);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    }
  };

  const handleOAuth = (provider: string) => {
    // In real implementation this would redirect to /api/auth/oauth/:provider/start
    window.location.href = `/api/auth/oauth/${provider}/start`;
  };

  const oauthSection = (
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
  );

  const registerLink = (
    <div className="text-sm text-ink-light text-center mt-8">
      还没有账号？ <Link to="/register" className="text-amber font-medium hover:text-amber-dark transition-colors">去注册</Link>
    </div>
  );

  return (
    <AuthCard
      icon={<Icons.PenLine size={24} />}
      title="欢迎回来"
      description="登录您的账号继续创作"
      footer={<>{oauthSection}{registerLink}</>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          id="email"
          label="邮箱"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="your@email.com"
          required
        />
        
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-ink-light">密码</label>
            <Link to="/forgot-password" className="text-xs text-amber hover:text-amber-dark transition-colors">忘记密码？</Link>
          </div>
          <FormInput
            id="password"
            label=""
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            required
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

        {error && <ErrorAlert error={error} />}

        <LoadingButton loading={isLoading} loadingText="登录中...">
          登录
        </LoadingButton>
      </form>
    </AuthCard>
  );
}
