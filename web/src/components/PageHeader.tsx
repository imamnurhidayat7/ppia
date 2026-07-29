import Link from "next/link";
import { Anchor } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  label: string;
  title: string;
  titleAccent?: string;
  description?: string;
  breadcrumbs?: Crumb[];
}

/**
 * Masthead for every public page.
 *
 * This is the single most repeated element on the site, so it carries the
 * maritime language the homepage establishes: the deep-sea surface, the
 * navigation-chart grid, a rope rule, and breadcrumbs set as chart data with
 * `/` separators rather than chevrons.
 *
 * Kept as a server component — it is static markup, so nothing here needs to
 * ship JavaScript.
 */
export default function PageHeader({ label, title, titleAccent, description, breadcrumbs }: PageHeaderProps) {
  return (
    <header className="sea-deep relative overflow-hidden pb-20 pt-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="sea-chart-light absolute inset-0 opacity-[0.05]"
          style={{
            maskImage: "radial-gradient(ellipse 80% 75% at 30% 45%, transparent 15%, black 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 75% at 30% 45%, transparent 15%, black 85%)",
          }}
        />
        <div
          className="absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full opacity-[0.16]"
          style={{ background: "radial-gradient(circle, #E8231A, transparent 70%)" }}
        />

        {/* Bearing rings, echoing the compass on the About route. */}
        <svg viewBox="0 0 200 200" className="absolute -bottom-20 right-8 hidden h-72 w-72 lg:block">
          <circle cx="100" cy="100" r="88" fill="none" stroke="white" strokeOpacity="0.07" />
          <circle cx="100" cy="100" r="62" fill="none" stroke="white" strokeOpacity="0.06" strokeDasharray="4 9" />
          <circle cx="100" cy="100" r="34" fill="none" stroke="white" strokeOpacity="0.05" />
          <path d="M100 12 L106 96 L100 188 L94 96 Z" fill="#E8231A" fillOpacity="0.22" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {breadcrumbs && (
          <nav aria-label="Breadcrumb" className="data-type mb-7 flex flex-wrap items-center gap-2 text-[12px] uppercase">
            <Link href="/" className="text-white/70 transition-colors hover:text-white">
              Home
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                <span aria-hidden="true" className="text-white/25">
                  /
                </span>
                {crumb.href ? (
                  <Link href={crumb.href} className="text-white/70 transition-colors hover:text-white">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white/80">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <span className="flex items-center gap-2.5 accent-label">
          <Anchor size={13} strokeWidth={2.6} aria-hidden="true" />
          <span className="data-type text-[12px] font-bold uppercase">{label}</span>
          <span aria-hidden="true" className="h-px w-10 bg-[#E8231A]/40" />
        </span>

        <h1
          className="mt-4 max-w-3xl text-balance font-black leading-[1.03] tracking-[-0.035em] text-white"
          style={{
            fontSize: "clamp(2.25rem, 5.4vw, 4rem)",
            fontFamily: "var(--font-poppins), Poppins, sans-serif",
          }}
        >
          {titleAccent ? (
            <>
              {title} <span className="gradient-text">{titleAccent}</span>
            </>
          ) : (
            title
          )}
        </h1>

        {description && (
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-white/75">{description}</p>
        )}
      </div>

      {/* Waterline at the foot of the masthead, so the page below reads as
          shore rather than as a separate white slab. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
    </header>
  );
}
