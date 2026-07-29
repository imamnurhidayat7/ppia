'use client';

import { CheckCircle2, Clock, MessageCircle } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import AuthNotice from '@/components/auth/AuthNotice';

export default function RegistrationPendingPage() {
  return (
    <AuthShell
      eyebrow="Application received"
      headline={
        <>
          You are on
          <br />
          the manifest
        </>
      }
      blurb="A committee member reviews every application by hand. We will e-mail you as soon as it has been checked."
    >
      <AuthNotice
        eyebrow="Awaiting approval"
        title="Registration submitted"
        icon={CheckCircle2}
        tone="success"
        actions={[
          { label: 'Back to sign in', href: '/login' },
          { label: 'Back to home', href: '/', variant: 'secondary' },
        ]}
      >
        <p>
          Thank you for registering with PPIA Auckland. Your application has been received and is now{' '}
          <strong className="ink-strong">awaiting admin approval</strong>.
        </p>

        <div className="rounded-[4px] border border-[#FDE68A] bg-[#FFFBEB] p-4">
          <p className="data-type flex items-center gap-2 text-[12px] font-bold uppercase" style={{ color: '#92400E' }}>
            <Clock size={14} aria-hidden="true" />
            What happens next
          </p>
          <p className="mt-2 text-[15px] leading-relaxed" style={{ color: '#78350F' }}>
            Our team reviews your application. Once approved you can sign in and join the PPIA WhatsApp community
            group.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-[4px] border border-[#DCE7F1] bg-white p-4">
          <MessageCircle size={17} className="mt-0.5 shrink-0 text-[#0F7A3D]" aria-hidden="true" />
          <p className="text-[15px] leading-relaxed ink-body">
            The invite link arrives with your approval e-mail.
          </p>
        </div>

        <p className="text-center text-[14px] ink-muted">
          Questions? Reach us on Instagram{' '}
          <a
            href="https://instagram.com/ppiauckland"
            target="_blank"
            rel="noopener noreferrer"
            className="accent-label font-semibold hover:underline"
          >
            @ppiauckland
          </a>
        </p>
      </AuthNotice>
    </AuthShell>
  );
}
