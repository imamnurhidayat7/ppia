'use client';

/**
 * Shared frame for the sign-in, registration and account-recovery routes.
 *
 * Composition: one object, not two half-screens.
 *
 * The first attempt split the viewport into a dark 46% panel and a light
 * remainder with the form floating in it. At desktop width that left the card
 * adrift in a wide empty field, and the two halves read as two unrelated pages
 * placed side by side. Now the page is entirely the deep-sea surface and the
 * panel is the *left column of the same card* as the form. The two are visibly
 * one piece, the whole thing is centred, and the proportion holds at any width
 * because it is set by the card, not by the viewport.
 *
 * These are also the only public pages where a visitor has to type, so the form
 * column is white with 12px labels and 15px fields rather than the 10px
 * metadata scale used decoratively elsewhere.
 */

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AuthShellProps {
  /** Small uppercase label above the panel headline. */
  eyebrow: string;
  /** Panel headline; accepts a <br /> for a deliberate line break. */
  headline: React.ReactNode;
  /** Supporting sentence under the headline. */
  blurb: string;
  /** Optional extra panel content, e.g. registration's stage list. */
  panelFooter?: React.ReactNode;
  /** Registration needs a wider form column than sign-in. */
  formWidth?: 'md' | 'lg';
  children: React.ReactNode;
}

function Compass({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className={className}>
      <circle cx="60" cy="60" r="52" fill="none" stroke="white" strokeOpacity="0.18" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="white" strokeOpacity="0.1" strokeDasharray="3 6" />
      <path d="M60 10 L68 56 L60 110 L52 56 Z" fill="#FF8A80" fillOpacity="0.9" />
      <path d="M10 60 L56 52 L110 60 L56 68 Z" fill="#FFFFFF" fillOpacity="0.3" />
      <circle cx="60" cy="60" r="4" fill="#FFFFFF" fillOpacity="0.85" />
    </svg>
  );
}

export default function AuthShell({
  eyebrow,
  headline,
  blurb,
  panelFooter,
  formWidth = 'md',
  children,
}: AuthShellProps) {
  return (
    <div className="sea-deep relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      {/* Depth behind the card, so it sits in water rather than on a flat fill. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="sea-chart-light absolute inset-0 opacity-[0.06]"
          style={{
            maskImage: 'radial-gradient(ellipse 85% 80% at 50% 45%, transparent 12%, black 85%)',
            WebkitMaskImage: 'radial-gradient(ellipse 85% 80% at 50% 45%, transparent 12%, black 85%)',
          }}
        />
        <div
          className="absolute -left-28 top-1/4 h-[460px] w-[460px] rounded-full opacity-[0.16]"
          style={{ background: 'radial-gradient(circle, #E8231A, transparent 70%)' }}
        />
      </div>

      <main
        className={`relative w-full ${formWidth === 'lg' ? 'max-w-5xl' : 'max-w-4xl'}`}
      >
        <div className="overflow-hidden rounded-[6px] shadow-[0_50px_100px_-40px_rgba(0,0,0,0.75)] lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          {/* ── Left column: the brief ─────────────────────────────────── */}
          <aside className="relative flex flex-col justify-between gap-8 bg-[#0B1C2E] p-7 sm:p-9">
            <div
              aria-hidden="true"
              className="sea-chart-light pointer-events-none absolute inset-0 opacity-[0.07]"
            />

            <div className="relative">
              <Link href="/" className="inline-block">
                <Image
                  src="/Logo-PPIA-2025-White.png"
                  alt="PPIA Auckland"
                  width={200}
                  height={80}
                  className="h-9 w-auto"
                  priority
                />
              </Link>

              <p className="data-type accent-label mt-8 text-[12px] font-bold uppercase lg:mt-12">
                {eyebrow}
              </p>
              <h2
                className="mt-3 text-[clamp(1.6rem,2.4vw,2.1rem)] font-black leading-[1.14] tracking-[-0.02em] text-white"
                style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
              >
                {headline}
              </h2>
              <span aria-hidden="true" className="my-5 block h-px w-16 bg-white/25" />
              <p className="max-w-sm text-[15px] leading-relaxed ink-body">{blurb}</p>

              {panelFooter && <div className="mt-8">{panelFooter}</div>}
            </div>

            {/* Instrument row anchored to the card's bottom edge. */}
            <div className="relative flex items-center gap-3 border-t border-white/10 pt-5">
              <Compass className="h-9 w-9 shrink-0" />
              <p className="data-type text-[12px] uppercase ink-muted">Auckland · 36.85° S</p>
            </div>
          </aside>

          {/* ── Right column: the form, on paper ───────────────────────── */}
          <div className="chart-paper p-7 sm:p-9">{children}</div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="data-type inline-flex items-center gap-2 text-[12px] uppercase text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

/** Field styles, shared by every auth form so they cannot drift apart. */
export const AUTH_FIELD =
  'w-full rounded-[4px] border border-[#C3D2E0] bg-white px-4 py-3 text-[15px] ink-strong outline-none transition-colors placeholder:text-[#64748B] focus:border-[#C41E16] focus:ring-2 focus:ring-[#C41E16]/25';

/** Label styles: 12px, not the 10px used for decorative metadata elsewhere. */
export const AUTH_LABEL = 'data-type mb-2 block text-[12px] font-bold uppercase ink-muted';
