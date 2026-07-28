'use client';

import { useEffect, useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, MapPin, Users, Calendar, FileText, ChevronDown } from 'lucide-react';
import { useLandingSection, getBlocksByType } from '@/lib/hooks/use-landing-section';
import { useLandingColors } from '@/lib/hooks/use-landing-colors';
import type { LucideIcon } from 'lucide-react';

const DEFAULTS = {
  title: 'Berlayar\nuntuk Indonesia',
  titleHighlight: 'Indonesia',
  subtitle:
    'The home of Indonesian students in Auckland. A place to grow, connect, and build the future together.',
  location: 'Auckland, New Zealand',
};

const DEFAULT_STATS = [
  { label: 'Active members', target: 150, icon: Users },
  { label: 'Events held', target: 25, icon: Calendar },
  { label: 'Articles published', target: 40, icon: FileText },
];

const DEFAULT_CTAS = [
  { label: 'Join our community', href: '/register', variant: 'primary' as const, color: '' },
  { label: 'Meet the team', href: '/about/cabinet', variant: 'secondary' as const, color: '' },
];

const iconMap: Record<string, LucideIcon> = {
  Users,
  Calendar,
  FileText,
  MapPin,
};

/**
 * Pull the leading number out of a free-text field.
 * Admins type things like "500", "500+" or "1,200" — all should animate to a
 * number rather than silently falling back to zero.
 */
function parseStatTarget(raw?: string | null): number {
  if (!raw) return 0;
  const digits = String(raw).replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

/** Anything the admin typed after the digits, e.g. the "+" in "500+". */
function parseStatSuffix(raw?: string | null): string {
  if (!raw) return '+';
  const match = String(raw).match(/[^\d\s,.]+$/);
  return match ? match[0] : '';
}

export default function HeroSection() {
  const { section } = useLandingSection('hero');
  const { colors } = useLandingColors();
  const reduceMotion = useReducedMotion();

  const t = useMemo(() => {
    const cfg = section?.config ?? {};
    return {
      title: section?.title || DEFAULTS.title,
      titleHighlight: (cfg.titleHighlight as string) || DEFAULTS.titleHighlight,
      subtitle: section?.subtitle || DEFAULTS.subtitle,
      // An empty string is a deliberate "hide the badge" choice, so only fall
      // back to the default when the field was never set at all.
      location: cfg.location === undefined ? DEFAULTS.location : (cfg.location as string),
    };
  }, [section]);

  /**
   * Statistics.
   *
   * The number lives in the block's `content` column — that is what the CMS
   * form writes. Reading it from `config.target` (as this once did) made every
   * counter animate to zero.
   */
  const stats = useMemo(() => {
    const cmsStats = getBlocksByType(section?.blocks, 'STATISTIC');
    if (cmsStats.length === 0) {
      return DEFAULT_STATS.map((s) => ({ ...s, suffix: '+', color: '' }));
    }
    return cmsStats.map((block) => ({
      label: block.title || '',
      target: parseStatTarget(block.content),
      suffix: parseStatSuffix(block.content),
      icon: (block.iconName && iconMap[block.iconName]) || Users,
      color: block.color || '',
    }));
  }, [section]);

  /**
   * Call-to-action buttons.
   *
   * `variant` is a presentation setting stored in the block config; `color` is
   * the block's own colour column and overrides the site theme when set.
   */
  const ctaButtons = useMemo(() => {
    const cmsCtas = getBlocksByType(section?.blocks, 'CTA_BUTTON');
    if (cmsCtas.length === 0) return DEFAULT_CTAS;
    return cmsCtas.map((block, i) => ({
      label: block.title || '',
      href: block.linkUrl || '#',
      // Rows created before `variant` existed have no style set. Defaulting by
      // position keeps the intended hierarchy — one lead action, the rest quiet
      // — instead of rendering a row of competing solid buttons.
      variant:
        (block.config?.variant as 'primary' | 'secondary') ||
        (i === 0 ? 'primary' : 'secondary'),
      color: block.color || '',
    }));
  }, [section]);

  /**
   * One ref per rendered counter, addressed by index.
   *
   * Keying these by a `config.key` string meant every CMS-authored statistic
   * resolved to the same element, so only one of them ever counted up.
   */
  const statRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const targets = stats.map((s) => s.target);

    if (reduceMotion) {
      targets.forEach((target, i) => {
        const el = statRefs.current[i];
        if (el) el.textContent = target.toLocaleString('en-NZ');
      });
      return;
    }

    const DURATION = 1800;
    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      targets.forEach((target, i) => {
        const el = statRefs.current[i];
        if (el) el.textContent = Math.round(target * eased).toLocaleString('en-NZ');
      });
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [stats, reduceMotion]);

  // Split the headline so the highlighted words can carry the accent gradient.
  const titleParts = useMemo(() => {
    const { title, titleHighlight } = t;
    if (!titleHighlight || !title.includes(titleHighlight)) return null;
    const at = title.indexOf(titleHighlight);
    return {
      before: title.slice(0, at),
      highlight: titleHighlight,
      after: title.slice(at + titleHighlight.length),
    };
  }, [t]);

  const rise = (delay: number) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay } }
      : {
          initial: { opacity: 0, y: 28 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center overflow-hidden mesh-gradient">
      {/* ── Depth layers ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Primary glow behind the headline */}
        <div
          className="absolute left-1/2 top-[38%] w-[min(1100px,120vw)] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.28]"
          style={{ background: 'radial-gradient(circle, #E8231A 0%, transparent 62%)' }}
        />
        {/* Cool counter-glow, offset to keep the composition asymmetric */}
        <div
          className="absolute right-[8%] bottom-[6%] w-[min(620px,80vw)] aspect-square rounded-full opacity-[0.16]"
          style={{ background: 'radial-gradient(circle, #6D28D9 0%, transparent 65%)' }}
        />
        <div
          className="absolute left-[4%] top-[10%] w-[min(420px,60vw)] aspect-square rounded-full opacity-[0.10]"
          style={{ background: 'radial-gradient(circle, #0EA5E9 0%, transparent 65%)' }}
        />

        {/* Perspective grid — fades out toward the headline so text stays clean */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 45%, transparent 15%, black 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 45%, transparent 15%, black 75%)',
          }}
        />

        {/* Film grain — stops the large flat gradients from banding */}
        <div
          className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Bottom vignette hands off into the next section */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0B1220] to-transparent" />
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-28 pb-24 text-center">
        {t.location && (
          <motion.div
            {...rise(0)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 mb-9 backdrop-blur-sm"
          >
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping"
                style={{ background: colors.textAccent }}
              />
              <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: colors.textAccent }}
              />
            </span>
            <MapPin size={13} className="text-white/50" />
            <span className="text-[13px] font-medium tracking-wide text-white/70">{t.location}</span>
          </motion.div>
        )}

        <motion.h1
          {...rise(0.08)}
          className="font-black text-white leading-[0.88] tracking-[-0.03em] whitespace-pre-line text-balance"
          style={{
            fontSize: 'clamp(2.75rem, 11vw, 8.5rem)',
            fontFamily: 'var(--font-poppins), Poppins, sans-serif',
          }}
        >
          {titleParts ? (
            <>
              {titleParts.before}
              <span className="gradient-text-animated">{titleParts.highlight}</span>
              {titleParts.after}
            </>
          ) : (
            t.title
          )}
        </motion.h1>

        <motion.p
          {...rise(0.18)}
          className="mx-auto mt-7 max-w-xl text-balance text-[17px] md:text-lg leading-relaxed text-white/55"
        >
          {t.subtitle}
        </motion.p>

        <motion.div
          {...rise(0.26)}
          className="mt-11 flex flex-col sm:flex-row items-center justify-center gap-3.5"
        >
          {ctaButtons.map((btn, i) => {
            const isPrimary = btn.variant === 'primary';
            return (
              <Link
                key={i}
                href={btn.href}
                className={
                  isPrimary
                    ? 'group relative inline-flex w-full sm:w-auto items-center justify-center gap-2 overflow-hidden rounded-full px-8 py-4 text-[15px] font-semibold text-white shadow-[0_10px_40px_-12px_rgba(232,35,26,0.7)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
                    : 'group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-4 text-[15px] font-medium text-white/75 backdrop-blur-sm transition-all duration-300 hover:border-white/60 hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
                }
                style={
                  isPrimary
                    ? { background: btn.color || colors.buttonPrimary || colors.primary || '#E8231A' }
                    : btn.color
                      ? { borderColor: btn.color, color: btn.color }
                      : undefined
                }
              >
                {/* Sheen sweep on hover */}
                {isPrimary && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  />
                )}
                <span className="relative">{btn.label}</span>
                {isPrimary && (
                  <ArrowRight
                    size={17}
                    className="relative transition-transform duration-300 group-hover:translate-x-1"
                  />
                )}
              </Link>
            );
          })}
        </motion.div>

        {/* Statistics — a single glass panel reads as one object, not three */}
        {stats.length > 0 && (
          <motion.dl
            {...rise(0.36)}
            className="mx-auto mt-16 grid max-w-2xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04] py-7 backdrop-blur-md"
          >
            {stats.map((stat, i) => (
              <div key={i} className="px-3 text-center sm:px-6">
                <div
                  className="mb-2.5 flex justify-center"
                  style={{ color: stat.color || colors.textAccent }}
                  aria-hidden="true"
                >
                  <stat.icon size={19} strokeWidth={2.2} />
                </div>
                <dd
                  className="text-[1.85rem] font-black leading-none tracking-tight text-white sm:text-4xl"
                  style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                >
                  <span ref={(el) => { statRefs.current[i] = el; }}>0</span>
                  {stat.suffix && <span style={{ color: stat.color || colors.textAccent }}>{stat.suffix}</span>}
                </dd>
                <dt className="mt-2 text-[11px] font-medium uppercase tracking-wider text-white/40 sm:text-xs">
                  {stat.label}
                </dt>
              </div>
            ))}
          </motion.dl>
        )}
      </div>

      {/* Scroll cue — tells the visitor there is more below the fold */}
      {!reduceMotion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2"
          aria-hidden="true"
        >
          <motion.div
            animate={{ y: [0, 7, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-1.5 text-white/30"
          >
            <span className="text-[10px] font-medium uppercase tracking-[0.2em]">Scroll</span>
            <ChevronDown size={15} />
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
