import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { client } from '../../../api/client';
import { AuthCard } from '../../../components/ui/AuthCard';
import { FormInput } from '../../../components/ui/FormInput';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { SuccessView } from '../../../components/ui/SuccessView';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { Icons } from '../../../components/ui/icons';
import { usePasswordValidation } from '../../../hooks';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { password, setPassword: setPasswordAndValidate, isValid } = usePasswordValidation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError('密码长度至少 8 位，且同时包含大写字母、小写字母、数字');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }
    
    setLoading(true);
    await client.POST('/api/auth/reset-password', {
      body: { token, new_password: password }
    });
    setLoading(false);
    setStatus('success');
  };

  const handlePasswordChange = (val: string) => {
    const validation = setPasswordAndValidate(val);
    if (val && !validation.isValid) {
      setError('密码长度至少 8 位，且同时包含大写字母、小写字母、数字');
    } else {
      setError('');
    }
  };

  if (status === 'success') {
    return (
      <AuthCard
        icon={<Icons.Close size={24} />}
        title="重置密码"
        description="请设置您的新密码"
      >
        <SuccessView
          icon={<Icons.Success size={32} />}
          title="密码已重置"
          description="请使用新密码重新登录"
          action={{ label: '去登录', onClick: () => window.location.href = '/login' }}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={<Icons.Close size={24} />}
      title="重置密码"
      description="请设置您的新密码"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          id="new-password"
          label="新密码"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          placeholder="至少8位，包含大小写和数字"
          required
        />
        <FormInput
          id="confirm-password"
          label="确认新密码"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="再次输入新密码"
          required
        />
        {error && <ErrorAlert error={error} />}
        <LoadingButton type="submit" loading={loading} loadingText="重置中...">
          重置密码
        </LoadingButton>
      </form>
    </AuthCard>
  );
}
