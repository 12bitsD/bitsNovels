import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { client } from '../../../api/client';
import { AuthCard } from '../../../components/ui/AuthCard';
import { SuccessView } from '../../../components/ui/SuccessView';
import { ErrorAlert } from '../../../components/ui/ErrorAlert';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { Icons } from '../../../components/ui/icons';

export default function VerificationResultPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email') || '';
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

  if (status === 'loading') {
    return (
      <AuthCard
        icon={<Icons.Loading size={24} />}
        title="验证邮箱"
        description=""
      >
        <div className="flex flex-col items-center py-8">
          <div className="w-12 h-12 border-4 border-parchment border-t-amber rounded-full animate-spin mb-4"></div>
          <p className="text-ink-light">验证中...</p>
        </div>
      </AuthCard>
    );
  }

  if (status === 'success') {
    return (
      <AuthCard
        icon={<Icons.Check size={24} />}
        title="验证邮箱"
        description=""
      >
        <SuccessView
          icon={<Icons.Success size={32} />}
          title="验证成功！"
          description="您可以关闭此页面或返回登录。"
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={<Icons.Error size={24} />}
      title="验证邮箱"
      description=""
    >
      <div className="space-y-4">
        <ErrorAlert error="链接已过期或无效" />
        {resendStatus === 'success' ? (
          <p className="text-success text-sm bg-success/10 p-3 rounded">已重新发送验证邮件，请查收。</p>
        ) : (
          <LoadingButton onClick={handleResend} loading={false}>
            重新发送验证邮件
          </LoadingButton>
        )}
      </div>
    </AuthCard>
  );
}
