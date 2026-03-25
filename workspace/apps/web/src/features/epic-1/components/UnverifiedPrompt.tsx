import React, { useState } from 'react';
import { client } from '../../../api/client';

export default function UnverifiedPrompt({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleResend = async () => {
    setStatus('loading');
    try {
      await client.POST('/api/auth/resend-verification', {
        body: { email }
      });
      setStatus('success');
    } catch (e) {
      setStatus('idle');
    }
  };

  return (
    <div className="bg-[#B8860B] text-white px-4 py-2 flex items-center justify-between text-sm">
      <span>请验证您的邮箱以确保账号安全</span>
      {status === 'success' ? (
        <span>已发送验证邮件</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={status === 'loading'}
          className="underline hover:text-[#E8D9B8] disabled:opacity-50"
        >
          重新发送
        </button>
      )}
    </div>
  );
}
