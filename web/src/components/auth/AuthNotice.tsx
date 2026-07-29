'use client';

/**
 * Single-message auth screen: verification results, expired links, and the
 * "application received" state.
 *
 * These four screens each had their own hand-built card (`glass-light`, a
 * tinted icon circle, a 2xl radius) which is why the auth flow looked like it
 * belonged to a different site. They now share one sheet, one porthole and one
 * type scale — body copy at 15px, labels at 12px.
 */

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';

const TONE: Record<Tone, { ring: string; halo: string; icon: string }> = {
  // 4.7:1+ against white for the icon colours.
  success: { ring: '#A7F3D0', halo: 'rgba(4,120,87,0.10)', icon: '#047857' },
  error: { ring: '#F3C9C6', halo: 'rgba(176,24,18,0.10)', icon: '#B01812' },
  info: { ring: '#C3D2E0', halo: 'rgba(15,27,51,0.08)', icon: '#0F1B33' },
};

export interface AuthNoticeAction {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
}

export default function AuthNotice({
  eyebrow,
  title,
  icon: Icon,
  tone = 'info',
  children,
  actions = [],
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  tone?: Tone;
  children?: React.ReactNode;
  actions?: AuthNoticeAction[];
}) {
  const palette = TONE[tone];

  return (
    <div className="text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white"
        style={{ boxShadow: `inset 0 0 0 1px ${palette.ring}, 0 0 0 5px ${palette.halo}` }}
      >
        <Icon size={28} strokeWidth={2.2} style={{ color: palette.icon }} />
      </span>

      <p className="data-type accent-label mt-6 text-[12px] font-bold uppercase">{eyebrow}</p>
      <h1
        className="mt-2 text-2xl font-black ink-strong"
        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
      >
        {title}
      </h1>

      <span aria-hidden="true" className="rope-rule mx-auto mt-5 block w-24 opacity-70" />

      {children && <div className="mt-5 space-y-4 text-left text-[15px] leading-relaxed ink-body">{children}</div>}

      {actions.length > 0 && (
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {actions.map((action) => (
            <Link
              key={action.href + action.label}
              href={action.href}
              className={
                action.variant === 'secondary'
                  ? 'inline-flex items-center justify-center rounded-[4px] border border-[#C3D2E0] bg-white px-6 py-3 text-[15px] font-semibold ink-strong transition-colors hover:bg-[#F5FAFD]'
                  : 'inline-flex items-center justify-center rounded-[4px] bg-[#C41E16] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#A81812]'
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
