'use client';

/**
 * PartnersStrip — auto-scrolling marquee of partner/university logos.
 *
 * Social proof element shown after the About section. Logos scroll
 * continuously with CSS animation (no JS timer), pause on hover, and
 * are duplicated once to fill the gap during the loop.
 *
 * Data source: CMS landing section key "partners" → blocks of type SPONSOR.
 * Each block stores `title` (org name), `imageUrl` (logo), and optionally
 * `linkUrl` (website).
 */

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Anchor } from 'lucide-react';
import { useLandingSection, getBlocksByType } from '@/lib/hooks/use-landing-section';
import { getImageUrl } from '@/lib/utils';

interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  href?: string;
}

/**
 * There is deliberately no built-in placeholder list here.
 *
 * Every other section can fall back to sample copy harmlessly, but this one
 * asserts a relationship with a named third party. Shipping a default list
 * meant the live page claimed partnerships that had never been agreed, and
 * removing the CMS records did not remove the claim. The section now renders
 * only what an admin has actually entered, and nothing at all when empty.
 */
export default function PartnersStrip() {
  const { section } = useLandingSection('partners');
  /**
   * Logos that 404 or fail to decode. An admin can add a partner without a
   * logo, and files can go missing, so the strip needs a presentable fallback
   * instead of showing a broken-image icon.
   */
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const partners = useMemo<Partner[]>(() => {
    return getBlocksByType(section?.blocks, 'SPONSOR')
      .map((b) => ({
        id: b.id,
        name: b.title || '',
        logoUrl: b.imageUrl || '',
        href: b.linkUrl || undefined,
      }))
      // An entry with neither a name nor a logo has nothing to render.
      .filter((p) => p.name || p.logoUrl);
  }, [section]);

  if (partners.length === 0) return null;

  const LogoItem = ({ partner }: { partner: Partner }) => {
    const showWordmark = !partner.logoUrl || failed[partner.id];

    const img = showWordmark ? (
      // Text wordmark fallback — set in the display face, tracked out, so a
      // logo-less partner still reads as a deliberate part of the strip.
      <span
        className="whitespace-nowrap text-sm md:text-base font-bold uppercase tracking-[0.08em] text-slate-400 opacity-70 transition-all duration-300 hover:text-slate-600 hover:opacity-100"
        style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
      >
        {partner.name}
      </span>
    ) : (
      // Partner logos have no fixed aspect ratio, so `width`/`height` here are a
      // hint for choosing a source size; the CSS below is what actually sizes it
      // (fixed height, automatic width). `fill` would need a known box.
      <Image
        src={getImageUrl(partner.logoUrl) || partner.logoUrl}
        alt={partner.name}
        width={200}
        height={40}
        onError={() => setFailed((prev) => ({ ...prev, [partner.id]: true }))}
        className="h-8 md:h-10 w-auto object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
      />
    );

    if (partner.href) {
      return (
        <a
          href={partner.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center px-8 shrink-0"
          title={partner.name}
        >
          {img}
        </a>
      );
    }

    return (
      <span className="flex items-center justify-center px-8 shrink-0" title={partner.name}>
        {img}
      </span>
    );
  };

  return (
    <section className="sea-shore relative overflow-hidden py-12" aria-label="Our partners">
      {/* Rope hairlines rather than solid borders, so the strip reads as part of
          the maritime theme the hero establishes. */}
      <span aria-hidden="true" className="rope-rule absolute inset-x-0 top-0" />
      <span aria-hidden="true" className="rope-rule absolute inset-x-0 bottom-0" />

      {/* Labelled like a route board rather than a centred caption, so the
          strip belongs to the maritime frame instead of floating above it. */}
      <div className="mx-auto mb-6 flex max-w-7xl items-center gap-4 px-6">
        <Anchor size={14} strokeWidth={2.4} className="shrink-0 text-[#94A3B8]" aria-hidden="true" />
        <p className="data-type shrink-0 text-[12px] font-bold uppercase text-[#7A8B9E]">
          {section?.title || 'Ports of call'}
        </p>
        <span aria-hidden="true" className="rope-rule flex-1 opacity-60" />
        <p className="data-type hidden shrink-0 text-[12px] uppercase text-[#94A3B8] sm:block">
          {String(partners.length).padStart(2, '0')} partners
        </p>
      </div>

      {/* Marquee — purely CSS, no JS timer */}
      <div className="relative group">
        {/* Fade edges */}
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-16 bg-gradient-to-r from-[#F5FAFD] to-transparent" />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-16 bg-gradient-to-l from-[#F5FAFD] to-transparent" />

        <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
          {/* First set */}
          <div className="flex shrink-0">
            {partners.map((p) => (
              <LogoItem key={p.id} partner={p} />
            ))}
          </div>
          {/* Duplicate for seamless loop */}
          <div className="flex shrink-0" aria-hidden="true">
            {partners.map((p) => (
              <LogoItem key={`dup-${p.id}`} partner={p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
