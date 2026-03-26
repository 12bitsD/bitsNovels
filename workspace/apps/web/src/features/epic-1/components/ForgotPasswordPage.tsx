import React, { useState } from 'react';
import { client } from '../../../api/client';
import { AuthCard } from '../../../components/ui/AuthCard';
import { FormInput } from '../../../components/ui/FormInput';
import { SuccessView } from '../../../components/ui/SuccessView';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { Icons } from '../../../components/ui/icons';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await client.POST('/api/auth/forgot-password', {
      body: { email }
    });
    setLoading(false);
    setStatus('success');
  };

  if (status === 'success') {
    return (
      <AuthCard
        icon={<Icons.PenLine size={24} />}
        title="找回密码"
        description="输入邮箱以接收重置链接"
      >
        <SuccessView
          icon={<Icons.Check size={32} />}
          title="邮件已发送"
          description="如邮箱已注册，将收到重置邮件。请检查您的收件箱。"
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={<Icons.PenLine size={24} />}
      title="找回密码"
      description="输入邮箱以接收重置链接"
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
        <LoadingButton type="submit" loading={loading} loadingText="发送中...">
          发送重置邮件
        </LoadingButton>
      </form>
    </AuthCard>
  );
}
