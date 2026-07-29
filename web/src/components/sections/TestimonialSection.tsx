'use client';

/**
 * TestimonialSection — quotes from real members.
 *
 * A carousel (or grid on desktop) of 2–4 testimonials with photo, name,
 * role/major, and a short quote. Humanises the organisation.
 *
 * Data source: CMS landing section key "testimonials" → blocks of type QUOTE.
 */

import { useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { useLandingSection, getBlocksByType } from '@/lib/hooks/use-landing-section';
import { useLandingColors } from '@/lib/hooks/use-landing-colors';
import { getImageUrl } from '@/lib/utils';
import SectionHeading from './SectionHeading';

/** Fixed tilts, so the pile is deliberate and hydration-stable. */
const TILTS = [-1.6, 1.1, -0.7];

interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

/**
 * There is deliberately no built-in placeholder list here.
 *
 * This section used to ship three sample testimonials with invented names and
 * quotes. Because the component fell back to them whenever the CMS had no rows,
 * the live site presented fabricated people as real social proof, and deleting
 * the CMS records did not remove them. A quote attributed to a named person has
 * to come from that person; the section now renders only what an admin entered,
 * and nothing at all when empty.
 */
export default function TestimonialSection() {
  const { section } = useLandingSection('testimonials');
  const { colors } = useLandingColors();

  const testimonials = useMemo<Testimonial[]>(() => {
    return getBlocksByType(section?.blocks, 'QUOTE')
      .map((b) => ({
        id: b.id,
        quote: b.content || '',
        name: b.title || '',
        // The editor writes the role to `subtitle`; `linkText` is only read so
        // rows created by the original seed keep rendering.
        role: b.subtitle || b.linkText || '',
        avatarUrl: b.imageUrl || undefined,
      }))
      // A quote with no attribution, or an attribution with no quote, is not
      // usable as social proof.
      .filter((t) => t.quote && t.name);
  }, [section]);

  const header = useMemo(
    () => ({
      eyebrow: section?.title || 'What members say',
      title: section?.subtitle || 'Real stories from our community',
      highlight: (section?.config?.titleHighlight as string) || 'our community',
    }),
    [section]
  );

  if (testimonials.length === 0) return null;

  return (
    <section className="sea-shore relative overflow-hidden py-28">
      <div
        aria-hidden="true"
        className="sea-chart pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 25%, black 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 25%, black 90%)',
        }}
      />
      <div className="relative mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow={header.eyebrow}
          title={header.title}
          highlight={header.highlight}
          className="mb-14"
        />

        {/*
          Postcards from the crew.

          Each quote is a card sent home: stamped, postmarked, tilted as if
          dropped on a desk. Three identical upright cards in a row is the
          testimonial block every template ships, and it makes real quotes look
          like filler. The tilt alternates by index so the group stays a pile
          rather than a pattern, and hover straightens the card being read.
        */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-5">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={t.id}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              style={{ rotate: `${TILTS[i % TILTS.length]}deg` }}
              className="chart-paper group relative flex flex-col rounded-[5px] p-6 shadow-[0_18px_44px_-26px_rgba(7,19,33,0.45)] transition-all duration-500 hover:rotate-0 hover:shadow-[0_30px_66px_-28px_rgba(7,19,33,0.5)] sm:p-7"
            >
              {/* Stamp and postmark, top-right of the card like real franking. */}
              <div aria-hidden="true" className="absolute right-5 top-5 flex items-start gap-2">
                <span
                  className="stamp-edge flex h-11 w-9 items-center justify-center rounded-[2px]"
                  style={{ color: `${colors.textAccent}4D` }}
                >
                  <Quote size={14} strokeWidth={2.6} style={{ color: colors.textAccent }} />
                </span>
                <span className="mt-1 flex h-9 w-9 rotate-[-14deg] items-center justify-center rounded-full border border-dashed border-[#0F1B33]/25">
                  <span className="data-type text-[12px] font-bold uppercase leading-tight text-[#0F1B33]/45">
                    AKL
                  </span>
                </span>
              </div>

              <p className="relative mt-16 flex-1 text-[15px] leading-relaxed text-[#33465E]">
                &ldquo;{t.quote}&rdquo;
              </p>

              <footer className="relative mt-6 flex items-center gap-3 pt-5">
                {/* Address rules, as on the back of a postcard. */}
                <span aria-hidden="true" className="rope-rule absolute inset-x-0 top-0 opacity-70" />
                {t.avatarUrl ? (
                  // A 44px avatar: exact dimensions are known, so no `fill` and
                  // no positioned wrapper are needed.
                  <Image
                    src={getImageUrl(t.avatarUrl) || t.avatarUrl}
                    alt={t.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full object-cover shadow-sm ring-2 ring-[#FCFBF7]"
                  />
                ) : (
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${colors.textAccent}, ${colors.textAccent}B0)`,
                    }}
                    aria-hidden="true"
                  >
                    {t.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#0F1B33]">{t.name}</p>
                  <p className="truncate text-xs text-slate-500">{t.role}</p>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
