/**
 * WaveTransition — the seam between two landing sections.
 *
 * The hero ends in water, so every following boundary is a waterline rather than
 * a hard colour change. Three offset wave layers in the *incoming* section's
 * colour rise out of the outgoing one, which reads as depth instead of as a
 * decorative squiggle.
 *
 * Purely decorative and server-rendered: it is a plain element with CSS
 * animation, so it needs no client bundle and stops moving under
 * `prefers-reduced-motion` (see `.wave-drift-*` in globals.css).
 */

interface WaveTransitionProps {
  /** Colour of the section above, painted behind the waves. */
  from: string;
  /** Colour of the section below, used for the wave fills. */
  to: string;
  /**
   * Mirror the crests horizontally so consecutive seams do not repeat the same
   * silhouette. Deliberately not a vertical flip: that would put the incoming
   * colour at the top of the seam and invert the two sections.
   */
  mirror?: boolean;
  className?: string;
}

export default function WaveTransition({
  from,
  to,
  mirror = false,
  className = '',
}: WaveTransitionProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative -mt-px block h-14 w-full overflow-hidden sm:h-20 lg:h-24 ${className}`}
      style={{ background: from }}
    >
      {/* Widened past the viewport so the drift never exposes an edge. */}
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className="absolute inset-y-0 -left-[5%] h-full w-[110%]"
        style={mirror ? { transform: 'scaleX(-1)' } : undefined}
      >
        <path
          d="M0 62C180 24 340 92 520 66C700 40 860 100 1040 70C1200 44 1340 84 1440 62V120H0V62Z"
          fill={to}
          fillOpacity="0.28"
          className="wave-drift-slow"
        />
        <path
          d="M0 82C170 48 350 106 530 82C710 58 870 110 1050 86C1210 64 1350 96 1440 80V120H0V82Z"
          fill={to}
          fillOpacity="0.55"
          className="wave-drift-fast"
        />
        <path
          d="M0 100C190 74 360 118 540 100C720 82 880 120 1060 102C1220 86 1350 110 1440 98V120H0V100Z"
          fill={to}
        />
      </svg>
    </div>
  );
}
