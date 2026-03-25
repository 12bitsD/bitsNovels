import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { client } from '../../../api/client';

const validatePassword = (pwd: string) => {
  if (pwd.length < 8) return false;
  if (!/[A-Z]/.test(pwd)) return false;
  if (!/[a-z]/.test(pwd)) return false;
  if (!/[0-9]/.test(pwd)) return false;
  return true;
};

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword(password)) {
      setError('密码长度至少 8 位，且同时包含大写字母、小写字母、数字');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);
    try {
      const { error: apiError } = await client.POST('/api/auth/register', {
        body: { email, password }
      });
      
      if (apiError) {
        throw new Error((apiError as any).detail || '注册失败');
      }
      
      setStatus('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (val && !validatePassword(val)) {
      setError('密码长度至少 8 位，且同时包含大写字母、小写字母、数字');
    } else {
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center p-4 font-sans text-ink">
      <div 
        className="bg-white/80 backdrop-blur-xl p-10 rounded-xl border border-white/60 max-w-md w-full animate-in fade-in zoom-in-95 duration-500"
        style={{ boxShadow: 'var(--shadow-card), var(--shadow-inner-light)' }}
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-amber/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber/20 shadow-sm">
            <span className="text-2xl text-amber opacity-90">✨</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">创建账号</h2>
          <p className="text-ink-light text-sm mt-2">开启您的数字羊皮纸</p>
        </div>
        
        {status === 'success' ? (
          <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-success">✓</span>
            </div>
            <p className="text-success font-medium text-lg">注册成功</p>
            <p className="text-ink-light mt-2 text-sm">请查收您的验证邮件以激活账号</p>
            <Link to="/login" className="btn-primary mt-6 inline-block w-auto px-8">去登录</Link>
          </div>
        ) : (
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
              <label htmlFor="password" className="block text-sm font-medium text-ink-light mb-1.5">密码</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={handlePasswordChange}
                className="input-base"
                placeholder="至少8位，包含大小写和数字"
              />
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-ink-light mb-1.5">确认密码</label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  if (error === '两次密码不一致') setError('');
                }}
                onBlur={() => {
                  if (password && confirmPassword && password !== confirmPassword) {
                    setError('两次密码不一致');
                  }
                }}
                className="input-base"
                placeholder="再次输入密码"
              />
            </div>

            {error && <p className="text-error text-sm bg-error/10 p-2 rounded">{error}</p>}

            <button
              type="submit"
              className="btn-primary mt-2"
            >
              注册
            </button>
            
            <div className="text-sm text-ink-light text-center mt-6">
              已有账号？ <Link to="/login" className="text-amber font-medium hover:text-amber-dark transition-colors">去登录</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
