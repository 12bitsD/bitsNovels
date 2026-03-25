import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { client } from '../../../api/client';

export default function VerificationResultPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email') || ''; // Add email to resend link if needed
  const [status, setStatus] = useState<'loading' | 'success' | 'expired'>('loading');
  const [resendStatus, setResendStatus] = useState<'idle' | 'success'>('idle');

  useEffect(() => {
    if (!token) return;
    
    client.POST('/api/auth/verify-email', {
      body: { token }
    }).then(({ error }) => {
      if (!error) setStatus('success');
      else setStatus('expired');
    }).catch(() => setStatus('expired'));
  }, [token]);

  const handleResend = async () => {
    await client.POST('/api/auth/resend-verification', {
      body: { email }
    });
    setResendStatus('success');
  };

  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center p-4 font-sans text-ink">
      <div 
        className="bg-white/80 backdrop-blur-xl p-10 rounded-xl border border-white/60 max-w-md w-full animate-in fade-in zoom-in-95 duration-500 text-center"
        style={{ boxShadow: 'var(--shadow-card), var(--shadow-inner-light)' }}
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-parchment border-t-amber rounded-full animate-spin mb-4"></div>
            <p className="text-ink-light">验证中...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-success">✓</span>
            </div>
            <p className="text-success font-medium text-lg">验证成功！</p>
            <p className="text-ink-light mt-2 text-sm">您可以关闭此页面或返回登录。</p>
          </div>
        )}
        
        {status === 'expired' && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-error">✕</span>
            </div>
            <p className="text-error font-medium text-lg">链接已过期或无效</p>
            
            {resendStatus === 'success' ? (
              <p className="text-success text-sm bg-success/10 p-3 rounded">已重新发送验证邮件，请查收。</p>
            ) : (
              <button
                onClick={handleResend}
                className="btn-primary mt-4"
              >
                重新发送验证邮件
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
