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
    <section className="bg-white py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow={header.eyebrow}
          title={header.title}
          highlight={header.highlight}
          className="mb-14"
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={t.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#E7EDF4] bg-[#FBFCFE] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:bg-white hover:shadow-[0_28px_70px_-28px_rgba(15,27,51,0.28)]"
            >
              {/* Oversized quote mark as a watermark, cropped by the card. It
                  gives each card a focal point without adding chrome. */}
              <Quote
                aria-hidden="true"
                size={112}
                strokeWidth={1}
                className="pointer-events-none absolute -right-5 -top-7 opacity-[0.06] transition-opacity duration-500 group-hover:opacity-[0.11]"
                style={{ color: colors.textAccent }}
              />

              <p className="relative flex-1 text-[15px] leading-relaxed text-[#334155]">
                &ldquo;{t.quote}&rdquo;
              </p>

              <footer className="relative mt-6 flex items-center gap-3 border-t border-slate-200/80 pt-5">
                {t.avatarUrl ? (
                  // A 44px avatar: exact dimensions are known, so no `fill` and
                  // no positioned wrapper are needed.
                  <Image
                    src={getImageUrl(t.avatarUrl) || t.avatarUrl}
                    alt={t.name}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-sm"
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
