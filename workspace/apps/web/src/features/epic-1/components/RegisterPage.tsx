import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { client } from '../../../api/client';
import { AuthCard } from '../../../components/ui/AuthCard';
import { FormInput } from '../../../components/ui/FormInput';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { SuccessView } from '../../../components/ui/SuccessView';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { Icons } from '../../../components/ui/icons';

const validatePassword = (pwd: string) => {
  if (pwd.length < 8) return false;
  if (!/[A-Z]/.test(pwd)) return false;
  if (!/[a-z]/.test(pwd)) return false;
  if (!/[0-9]/.test(pwd)) return false;
  return true;
};

export default function RegisterPage() {
  const navigate = useNavigate();
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
        throw new Error((apiError as { detail?: string }).detail || '注册失败');
      }
      
      setStatus('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (val && !validatePassword(val)) {
      setError('密码长度至少 8 位，且同时包含大写字母、小写字母、数字');
    } else {
      setError('');
    }
  };

  if (status === 'success') {
    return (
      <AuthCard
        icon={<Icons.Sparkles size={24} />}
        title="创建账号"
        description="开启您的数字羊皮纸"
      >
        <SuccessView
          icon={<Icons.Success size={32} />}
          title="注册成功"
          description="请查收您的验证邮件以激活账号"
          action={{ label: '去登录', onClick: () => navigate('/login') }}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={<Icons.Sparkles size={24} />}
      title="创建账号"
      description="开启您的数字羊皮纸"
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
        
        <FormInput
          id="password"
          label="密码"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          placeholder="至少8位，包含大小写和数字"
          required
        />
        
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-ink-light mb-1.5">
            确认密码<span className="text-error ml-0.5">*</span>
          </label>
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

        {error && <ErrorAlert error={error} />}

        <LoadingButton type="submit" loading={loading} loadingText="注册中...">
          注册
        </LoadingButton>
        
        <div className="text-sm text-ink-light text-center mt-6">
          已有账号？ <Link to="/login" className="text-amber font-medium hover:text-amber-dark transition-colors">去登录</Link>
        </div>
      </form>
    </AuthCard>
  );
}
