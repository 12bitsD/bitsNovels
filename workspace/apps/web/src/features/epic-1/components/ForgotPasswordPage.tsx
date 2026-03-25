import React, { useState } from 'react';
import { client } from '../../../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await client.POST('/api/auth/forgot-password', {
      body: { email }
    });
    setStatus('success');
  };

  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center p-4 font-sans text-ink">
      <div 
        className="bg-white/80 backdrop-blur-xl p-10 rounded-xl border border-white/60 max-w-md w-full animate-in fade-in zoom-in-95 duration-500"
        style={{ boxShadow: 'var(--shadow-card), var(--shadow-inner-light)' }}
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-amber/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber/20 shadow-sm">
            <span className="text-2xl text-amber opacity-90">🗝️</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">找回密码</h2>
          <p className="text-ink-light text-sm mt-2">输入邮箱以接收重置链接</p>
        </div>
        
        {status === 'success' ? (
          <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-success">✉️</span>
            </div>
            <p className="text-success font-medium text-lg">邮件已发送</p>
            <p className="text-ink-light mt-2 text-sm">如邮箱已注册，将收到重置邮件。请检查您的收件箱。</p>
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
            <button
              type="submit"
              className="btn-primary mt-2"
            >
              发送重置邮件
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
