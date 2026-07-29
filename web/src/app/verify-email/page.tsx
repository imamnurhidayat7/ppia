'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { AlertCircle, CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import AuthNotice from '@/components/auth/AuthNotice';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      // Async so the state write is not synchronous inside the effect body.
      (async () => {
        setError('Verification token is missing');
        setIsLoading(false);
      })();
      return;
    }

    const verify = async () => {
      try {
        await api.verifyEmail(token);
      } catch (err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || 'Failed to verify email');
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [token]);

  if (isLoading) {
    return (
      <AuthNotice eyebrow="Please wait" title="Verifying your e-mail" icon={Loader2} tone="info">
        <p className="text-center">This only takes a moment.</p>
      </AuthNotice>
    );
  }

  if (error) {
    return (
      <AuthNotice
        eyebrow="Verification"
        title="Verification failed"
        icon={AlertCircle}
        tone="error"
        actions={[
          { label: 'Go to sign in', href: '/login' },
          { label: 'Back to home', href: '/', variant: 'secondary' },
        ]}
      >
        <p className="text-center">{error}</p>
      </AuthNotice>
    );
  }

  return (
    <AuthNotice
      eyebrow="Verification"
      title="E-mail verified"
      icon={CheckCircle2}
      tone="success"
      actions={[{ label: 'Go to dashboard', href: '/dashboard' }]}
    >
      <p className="text-center">
        Your e-mail address is confirmed. Once your membership is approved you can use every part of PPIA Auckland.
      </p>
    </AuthNotice>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell
      eyebrow="E-mail confirmation"
      headline={
        <>
          Confirming
          <br />
          your address
        </>
      }
      blurb="Confirming your e-mail lets us reach you about your membership and the events you register for."
    >
      <Suspense
        fallback={
          <AuthNotice eyebrow="Please wait" title="Verifying your e-mail" icon={MailCheck} tone="info">
            <p className="text-center">This only takes a moment.</p>
          </AuthNotice>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </AuthShell>
  );
}
