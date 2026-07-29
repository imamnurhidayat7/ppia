'use client';

/**
 * SectionHeading — the shared eyebrow + heading + intro block.
 *
 * Every landing section used to build this by hand, which produced three
 * different implementations of the same "highlight some words in the heading"
 * behaviour, two of which were wrong: one dropped everything after the
 * highlighted run, another rendered the heading with no highlight at all.
 * Splitting the string is now done once, here.
 *
 * Content is passed in by the caller, which is what reads the CMS. This
 * component decides presentation only, so the type scale, eyebrow treatment and
 * vertical rhythm stay identical across sections.
 */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useLandingColors } from '@/lib/hooks/use-landing-colors';

type Tone = 'light' | 'dark';
type Align = 'center' | 'left';
type Size = 'md' | 'lg';

export interface SectionHeadingProps {
  /** Small uppercase label above the heading */
  eyebrow?: string;
  /** The heading itself */
  title: string;
  /**
   * A run of words inside `title` to render in the accent gradient. Ignored
   * when it does not appear in the title, so a stale value degrades to a plain
   * heading rather than corrupting it.
   */
  highlight?: string;
  /** Supporting paragraph below the heading */
  intro?: string;
  /** Trailing control, e.g. a "View all" link. Only used when align="left". */
  action?: ReactNode;
  align?: Align;
  tone?: Tone;
  size?: Size;
  className?: string;
}

/** Heading sizes are fluid so they hold their proportions at every width. */
const TITLE_SIZE: Record<Size, string> = {
  md: 'text-[clamp(1.75rem,4vw,2.75rem)]',
  lg: 'text-[clamp(2rem,5vw,3.5rem)]',
};

export default function SectionHeading({
  eyebrow,
  title,
  highlight,
  intro,
  action,
  align = 'center',
  tone = 'light',
  size = 'lg',
  className = '',
}: SectionHeadingProps) {
  const { colors } = useLandingColors();

  const at = highlight ? title.indexOf(highlight) : -1;
  const parts =
    at === -1
      ? { before: title, highlight: '', after: '' }
      : {
          before: title.slice(0, at),
          highlight: highlight as string,
          after: title.slice(at + (highlight as string).length),
        };

  const isCentered = align === 'center';
  const titleColor = tone === 'dark' ? 'text-white' : 'text-[#0F1B33]';
  const introColor = tone === 'dark' ? 'text-white/75' : 'ink-body';

  const heading = (
    <>
      {eyebrow && (
        <span
          className={`inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] ${
            isCentered ? 'justify-center' : ''
          }`}
          style={{ color: colors.textAccent }}
        >
          <span
            aria-hidden="true"
            className="h-px w-7"
            style={{ background: colors.textAccent, opacity: 0.5 }}
          />
          {eyebrow}
        </span>
      )}

      <h2
        className={`mt-4 font-black leading-[1.05] tracking-[-0.03em] text-balance ${TITLE_SIZE[size]} ${titleColor}`}
        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
      >
        {parts.before}
        {parts.highlight && <span className="gradient-text">{parts.highlight}</span>}
        {parts.after}
      </h2>

      {intro && (
        <p
          className={`mt-5 text-[17px] leading-relaxed text-balance ${introColor} ${
            isCentered ? 'mx-auto max-w-2xl' : 'max-w-2xl'
          }`}
        >
          {intro}
        </p>
      )}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {isCentered ? (
        <div className="text-center">{heading}</div>
      ) : (
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">{heading}</div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
    </motion.div>
  );
}
