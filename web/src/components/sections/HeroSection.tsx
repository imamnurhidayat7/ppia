'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { useLandingSection, getBlocksByType } from '@/lib/hooks/use-landing-section';
import { useLandingColors } from '@/lib/hooks/use-landing-colors';
import type { LandingSection } from '@/lib/api-types';

const LEGACY_TITLE = 'Berlayar untuk Indonesia';
const LEGACY_SUBTITLE =
  'The home of Indonesian students in Auckland. A place to grow, connect, and build the future together.';

const DEFAULTS = {
  title: 'Berlabuh.\nBertumbuh.\nBerlayar.',
  titleHighlight: 'Berlayar.',
  subtitle:
    'From our first anchor in Auckland to the next horizon, this is where Indonesian students find community, grow together, and move forward.',
  location: 'Auckland, New Zealand',
  eyebrow: 'Perhimpunan Pelajar Indonesia Auckland',
  illustrationCaption: 'Tāmaki Makaurau · 36.8509° S',
};

const DEFAULT_CTAS = [
  { label: 'Join our community', href: '/register', variant: 'primary' as const, color: '' },
  { label: 'Meet the team', href: '/about/cabinet', variant: 'secondary' as const, color: '' },
];

function normaliseTitle(value?: string | null): string {
  if (!value) return DEFAULTS.title;
  const singleLine = value.replace(/\s+/g, ' ').trim().toLowerCase();
  return singleLine === LEGACY_TITLE.toLowerCase() ? DEFAULTS.title : value;
}

interface MaritimeIllustrationProps {
  accent: string;
  reduceMotion: boolean;
  /** Small caption in the bottom-left of the scene; CMS-editable. */
  caption?: string;
}

/** Decorative maritime scene built in SVG so it stays crisp without another asset. */
function MaritimeIllustration({ accent, reduceMotion, caption }: MaritimeIllustrationProps) {
  const loop = reduceMotion ? undefined : Infinity;

  return (
    <div className="relative mx-auto aspect-[1.08/1] w-full max-w-[610px]" aria-hidden="true">
      <div className="absolute inset-[7%] rounded-full border border-white/[0.07]" />
      <div className="absolute inset-[17%] rounded-full border border-dashed border-white/[0.08]" />
      <motion.div
        className="absolute right-[12%] top-[11%] h-[32%] w-[32%] rounded-full"
        style={{
          background: `radial-gradient(circle at 40% 38%, #FFD7A8 0%, ${accent} 42%, transparent 72%)`,
          filter: 'blur(1px)',
        }}
        animate={reduceMotion ? undefined : { opacity: [0.72, 0.95, 0.72], scale: [0.98, 1.03, 0.98] }}
        transition={{ duration: 6, repeat: loop, ease: 'easeInOut' }}
      />

      <svg viewBox="0 0 720 660" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id="hero-sail-main" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#B9D9E9" />
          </linearGradient>
          <linearGradient id="hero-sail-shadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#EAF7FF" />
            <stop offset="1" stopColor="#789AB0" />
          </linearGradient>
          <linearGradient id="hero-hull" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#233C60" />
            <stop offset="1" stopColor="#071321" />
          </linearGradient>
          <linearGradient id="hero-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1D5F7A" stopOpacity="0.92" />
            <stop offset="1" stopColor="#071A2E" stopOpacity="0.98" />
          </linearGradient>
          <filter id="hero-ship-shadow" x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="18" stdDeviation="14" floodColor="#020A13" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* Navigation route and markers */}
        <motion.path
          d="M104 452 C172 346 235 292 328 245 C421 198 508 140 620 113"
          fill="none"
          stroke="white"
          strokeOpacity="0.18"
          strokeWidth="2"
          strokeDasharray="7 12"
          initial={{ pathLength: reduceMotion ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, delay: 0.5, ease: 'easeOut' }}
        />
        {[
          { x: 106, y: 451 },
          { x: 328, y: 245 },
          { x: 620, y: 113 },
        ].map((point, index) => (
          <motion.g
            key={`${point.x}-${point.y}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + index * 0.25, type: 'spring', stiffness: 180 }}
          >
            <circle cx={point.x} cy={point.y} r="7" fill="#0D1B33" stroke="white" strokeOpacity="0.5" />
            <circle cx={point.x} cy={point.y} r="2.5" fill={index === 2 ? accent : '#FFFFFF'} />
          </motion.g>
        ))}

        {/* Distant birds */}
        <motion.g
          fill="none"
          stroke="white"
          strokeOpacity="0.35"
          strokeWidth="3"
          strokeLinecap="round"
          animate={reduceMotion ? undefined : { x: [0, 12, 0], y: [0, -5, 0] }}
          transition={{ duration: 8, repeat: loop, ease: 'easeInOut' }}
        >
          <path d="M116 188 Q127 177 138 188 Q149 177 160 188" />
          <path d="M175 146 Q183 138 191 146 Q199 138 207 146" />
        </motion.g>

        {/* Ship */}
        <motion.g
          filter="url(#hero-ship-shadow)"
          style={{ transformOrigin: '390px 455px' }}
          animate={reduceMotion ? undefined : { y: [0, -9, 0], rotate: [-0.7, 0.9, -0.7] }}
          transition={{ duration: 5.8, repeat: loop, ease: 'easeInOut' }}
        >
          {/* Mast and rigging */}
          <path d="M374 134 L374 468" stroke="#D9B68B" strokeWidth="8" strokeLinecap="round" />
          <path d="M376 151 L535 416 M372 160 L238 416" stroke="white" strokeOpacity="0.28" strokeWidth="2" />
          <path d="M376 246 L505 420 M371 252 L263 420" stroke="white" strokeOpacity="0.18" strokeWidth="2" />

          {/* Main and forward sails */}
          <motion.path
            d="M363 161 C313 188 265 259 243 397 C285 380 325 376 363 384 Z"
            fill="url(#hero-sail-main)"
            animate={reduceMotion ? undefined : { d: [
              'M363 161 C313 188 265 259 243 397 C285 380 325 376 363 384 Z',
              'M363 161 C306 192 270 266 243 397 C286 374 326 380 363 384 Z',
              'M363 161 C313 188 265 259 243 397 C285 380 325 376 363 384 Z',
            ] }}
            transition={{ duration: 4.6, repeat: loop, ease: 'easeInOut' }}
          />
          <path d="M387 176 C447 212 492 286 515 402 C472 383 430 377 387 389 Z" fill="url(#hero-sail-shadow)" />
          <path d="M397 257 C447 282 478 328 494 389 C460 377 429 376 397 386 Z" fill="#FFFFFF" fillOpacity="0.48" />

          {/* PPIA red-white pennant */}
          <path d="M377 132 L452 151 L377 169 Z" fill="#FFFFFF" />
          <path d="M377 132 L452 151 L377 151 Z" fill={accent} />
          <motion.path
            d="M385 120 C418 101 445 106 469 94"
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            animate={reduceMotion ? undefined : { pathLength: [0.72, 1, 0.72] }}
            transition={{ duration: 3.2, repeat: loop, ease: 'easeInOut' }}
          />

          {/* Deck and hull */}
          <path d="M208 408 C307 424 430 425 562 402 L531 446 L230 448 Z" fill="#D9B68B" />
          <path d="M183 423 C297 451 445 451 582 416 C555 483 516 513 458 529 L302 529 C245 510 207 477 183 423 Z" fill="url(#hero-hull)" />
          <path d="M205 442 C311 463 444 462 558 434" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" />
          <path d="M261 473 C338 486 435 484 510 463" fill="none" stroke="white" strokeOpacity="0.14" strokeWidth="3" />
          <g fill="#F7C66D">
            <circle cx="308" cy="457" r="5" />
            <circle cx="352" cy="463" r="5" />
            <circle cx="396" cy="463" r="5" />
            <circle cx="440" cy="459" r="5" />
          </g>
        </motion.g>

        {/* Water layers move at different speeds for depth. */}
        <motion.g
          animate={reduceMotion ? undefined : { x: [0, -30, 0] }}
          transition={{ duration: 7, repeat: loop, ease: 'easeInOut' }}
        >
          <path
            d="M-60 504 C35 474 100 534 190 506 C282 476 335 540 431 505 C519 472 586 529 780 491 L780 680 L-60 680 Z"
            fill="#2E7F98"
            fillOpacity="0.56"
          />
        </motion.g>
        <motion.g
          animate={reduceMotion ? undefined : { x: [-18, 24, -18] }}
          transition={{ duration: 5.5, repeat: loop, ease: 'easeInOut' }}
        >
          <path
            d="M-70 545 C31 502 112 570 204 538 C296 506 362 575 461 535 C548 500 629 564 790 521 L790 680 L-70 680 Z"
            fill="url(#hero-water)"
          />
          <path
            d="M-40 551 C52 521 114 565 204 540 C300 513 365 566 461 536 C552 507 632 553 760 526"
            fill="none"
            stroke="white"
            strokeOpacity="0.34"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </motion.g>
        <path d="M0 610 C132 580 226 631 350 602 C470 575 579 625 720 589 L720 660 L0 660 Z" fill="#071321" fillOpacity="0.76" />
      </svg>

      {caption && (
        <div className="absolute bottom-[5%] left-[7%] rounded-full border border-white/10 bg-[#071321]/65 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/75 backdrop-blur-md">
          {caption}
        </div>
      )}
    </div>
  );
}

interface HeroSectionProps {
  initialSection?: LandingSection | null;
}

export default function HeroSection({ initialSection = null }: HeroSectionProps) {
  const { section } = useLandingSection('hero', initialSection);
  const { colors } = useLandingColors();
  const reduceMotion = useReducedMotion() ?? false;

  const t = useMemo(() => {
    const cfg = section?.config ?? {};
    const title = normaliseTitle(section?.title);
    const configuredHighlight = cfg.titleHighlight as string | undefined;
    const titleHighlight =
      !configuredHighlight ||
      configuredHighlight === 'Indonesia' ||
      !title.includes(configuredHighlight)
        ? DEFAULTS.titleHighlight
        : configuredHighlight;
    const subtitle =
      !section?.subtitle || section.subtitle.trim() === LEGACY_SUBTITLE
        ? DEFAULTS.subtitle
        : section.subtitle;

    return {
      title,
      titleHighlight,
      subtitle,
      location: cfg.location === undefined ? DEFAULTS.location : (cfg.location as string),
      // Both were hard-coded strings with no way to change them.
      eyebrow: (cfg.eyebrow as string | undefined) ?? DEFAULTS.eyebrow,
      illustrationCaption:
        (cfg.illustrationCaption as string | undefined) ?? DEFAULTS.illustrationCaption,
    };
  }, [section]);

  const ctaButtons = useMemo(() => {
    const cmsCtas = getBlocksByType(section?.blocks, 'CTA_BUTTON');
    if (cmsCtas.length === 0) return DEFAULT_CTAS;
    return cmsCtas.map((block, index) => ({
      label: block.title || '',
      href: block.linkUrl || '#',
      variant:
        (block.config?.variant as 'primary' | 'secondary') ||
        (index === 0 ? 'primary' : 'secondary'),
      color: block.color || '',
    }));
  }, [section]);

  /**
   * Statistics strip.
   *
   * The editor has always offered a "Statistics" group and the seed writes three
   * STATISTIC blocks, but this component never read them — so the numbers were
   * editable in the CMS and invisible on the page. Per the block field contract
   * in lib/section-schemas.ts: `content` is the number, `title` the label.
   */
  const stats = useMemo(() => {
    return getBlocksByType(section?.blocks, 'STATISTIC')
      .map((block) => ({
        id: block.id,
        value: (block.content || '').trim(),
        label: block.title || '',
        color: block.color || '',
      }))
      .filter((stat) => stat.value && stat.label);
  }, [section]);

  const titleParts = useMemo(() => {
    if (!t.titleHighlight || !t.title.includes(t.titleHighlight)) return null;
    const index = t.title.indexOf(t.titleHighlight);
    return {
      before: t.title.slice(0, index),
      highlight: t.titleHighlight,
      after: t.title.slice(index + t.titleHighlight.length),
    };
  }, [t]);

  const rise = (delay: number, distance = 24) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay } }
      : {
          initial: { opacity: 0, y: distance },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-[#071321]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,#071321_0%,#0D2740_48%,#0B1C2E_100%)]" />
        <div
          className="absolute -left-[18%] top-[8%] h-[70vw] max-h-[850px] w-[70vw] max-w-[850px] rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(circle, ${colors.accent || '#E8231A'}, transparent 66%)` }}
        />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050D18] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-24 pt-32 sm:px-8 lg:px-10 lg:pb-24 lg:pt-28">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(460px,1.05fr)] lg:gap-4 xl:gap-10">
          <div className="relative z-10 text-center lg:text-left">
            {t.location && (
              <motion.div
                {...rise(0)}
                className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 backdrop-blur-sm"
              >
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  {!reduceMotion && (
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                      style={{ background: colors.textAccent }}
                    />
                  )}
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: colors.textAccent }} />
                </span>
                <MapPin size={13} className="text-white/50" />
                <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/65">
                  {t.location}
                </span>
              </motion.div>
            )}

            {t.eyebrow && (
              <motion.p
                {...rise(0.05)}
                className="mb-4 text-[12px] font-bold uppercase tracking-[0.28em] text-white/38"
              >
                {t.eyebrow}
              </motion.p>
            )}

            <motion.h1
              {...rise(0.1, 32)}
              className="whitespace-pre-line text-balance font-black leading-[0.91] tracking-[-0.045em] text-white"
              style={{
                fontSize: 'clamp(3.05rem, 7.2vw, 6.8rem)',
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
              {...rise(0.19)}
              className="mx-auto mt-7 max-w-xl text-balance text-[16px] leading-relaxed text-white/58 sm:text-lg lg:mx-0"
            >
              {t.subtitle}
            </motion.p>

            <motion.div
              {...rise(0.27)}
              className="mt-9 flex flex-col items-center gap-3.5 sm:flex-row sm:justify-center lg:justify-start"
            >
              {ctaButtons.map((button, index) => {
                const primary = button.variant === 'primary';
                return (
                  <Link
                    key={`${button.href}-${index}`}
                    href={button.href}
                    className={
                      primary
                        ? 'group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-8 py-4 text-[15px] font-semibold text-white shadow-[0_12px_45px_-14px_rgba(232,35,26,0.75)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto'
                        : 'group inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-4 text-[15px] font-medium text-white/75 backdrop-blur-sm transition-all duration-300 hover:border-white/60 hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto'
                    }
                    style={
                      primary
                        ? { background: button.color || colors.buttonPrimary || colors.accent || '#E8231A' }
                        : button.color
                          ? { borderColor: button.color, color: button.color }
                          : undefined
                    }
                  >
                    {primary && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                      />
                    )}
                    <span className="relative">{button.label}</span>
                    {primary && <ArrowRight size={17} className="relative transition-transform group-hover:translate-x-1" />}
                  </Link>
                );
              })}
            </motion.div>

            {stats.length > 0 && (
              <motion.dl
                {...rise(0.34)}
                className="mt-11 flex flex-wrap justify-center gap-x-10 gap-y-6 border-t border-white/10 pt-8 lg:justify-start"
              >
                {stats.map((stat) => (
                  <div key={stat.id} className="min-w-[6.5rem]">
                    <dt className="sr-only">{stat.label}</dt>
                    <dd
                      className="text-[clamp(1.9rem,3.4vw,2.6rem)] font-black leading-none tracking-[-0.03em]"
                      style={{
                        color: stat.color || colors.textAccent || '#E8231A',
                        fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                      }}
                    >
                      {stat.value}
                    </dd>
                    <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </motion.dl>
            )}
          </div>

          <motion.div
            {...rise(0.16, 36)}
            className="relative -mx-3 mt-1 sm:mx-auto sm:w-full lg:mt-0"
          >
            <MaritimeIllustration
              accent={colors.accent || '#E8231A'}
              reduceMotion={reduceMotion}
              caption={t.illustrationCaption}
            />
          </motion.div>
        </div>

      </div>
    </section>
  );
}
