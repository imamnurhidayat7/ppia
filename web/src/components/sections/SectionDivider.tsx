'use client';

/**
 * SectionDivider — a thin decorative separator between landing page sections.
 *
 * Three variants:
 *   • `gradient` (default) — a subtle red-to-transparent gradient line.
 *   • `wave`    — a soft SVG curve that adds visual rhythm.
 *   • `dots`    — three small dots, centred.
 *
 * All variants are purely decorative (`aria-hidden`), add no scrollable height
 * beyond a small vertical spacer, and respect prefers-reduced-motion.
 */

interface SectionDividerProps {
  variant?: 'gradient' | 'wave' | 'dots';
  /** Override the background so the divider blends with the section above it */
  className?: string;
}

export default function SectionDivider({ variant = 'gradient', className = '' }: SectionDividerProps) {
  if (variant === 'wave') {
    return (
      <div className={`relative -mt-1 ${className}`} aria-hidden="true">
        <svg
          viewBox="0 0 1440 48"
          fill="none"
          preserveAspectRatio="none"
          className="w-full h-10 md:h-12 block"
        >
          <path
            d="M0 24C240 48 480 0 720 24C960 48 1200 0 1440 24V48H0V24Z"
            className="fill-current text-[#0D1B33]/5 dark:text-white/5"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`} aria-hidden="true">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E8231A]/40" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#E8231A]/60 mx-2" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#E8231A]/40" />
      </div>
    );
  }

  // Default: gradient line
  return (
    <div className={`flex items-center justify-center py-6 ${className}`} aria-hidden="true">
      <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-[#E8231A]/30 to-transparent" />
    </div>
  );
}
