'use client';

import { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { useLandingColors } from '@/lib/hooks/use-landing-colors';
import { useLandingSection, getBlockByType } from '@/lib/hooks/use-landing-section';
import { pickText } from '@/lib/utils';
import SectionHeading from './SectionHeading';

export default function VideoSection() {
  const [playing, setPlaying] = useState(false);
  const { language } = useLanguage();
  const { colors } = useLandingColors();
  const { section } = useLandingSection('video');
  const reduceMotion = useReducedMotion();
  const isId = language === 'id';

  const videoBlock = getBlockByType(section?.blocks, 'VIDEO');

  const content = useMemo(() => {
    const rawUrl = videoBlock?.linkUrl || section?.config?.videoUrl || 'https://www.youtube.com/embed/eoaq3iRSNv0';

    // Convert various YouTube URL formats to embed URL
    let embedUrl = rawUrl;
    if (rawUrl.includes('youtube.com/watch?v=')) {
      const videoId = rawUrl.split('watch?v=')[1]?.split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    } else if (rawUrl.includes('youtu.be/')) {
      const videoId = rawUrl.split('youtu.be/')[1]?.split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    } else if (rawUrl.includes('youtube.com/embed/')) {
      embedUrl = rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'rel=0&modestbranding=1';
    } else if (rawUrl.includes('youtube.com/shorts/')) {
      embedUrl = rawUrl.replace('/shorts/', '/embed/') + '?rel=0&modestbranding=1';
    } else if (!rawUrl.includes('embed')) {
      // If it's a watch URL without proper format, try to extract video ID
      const match = rawUrl.match(/[?&]v=([^&]+)/);
      if (match) {
        embedUrl = `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`;
      }
    }

    const cfg = (key: string) =>
      pickText(
        isId,
        section?.config?.[`${key}Id`] as string | undefined,
        section?.config?.[key] as string | undefined
      );

    return {
      badge: cfg('badge') || (isId ? 'Tonton' : 'Watch'),
      title:
        pickText(isId, section?.titleId, section?.title) ||
        (isId ? 'Rasakan PPIA Auckland' : 'Experience PPIA Auckland'),
      embedUrl,
      thumbnailUrl: videoBlock?.imageUrl || section?.config?.thumbnailUrl,
      featuredLabel: cfg('featuredLabel') || (isId ? 'Video Unggulan' : 'Featured Video'),
      videoTitle:
        pickText(isId, videoBlock?.titleId, videoBlock?.title) ||
        (isId ? 'Rekap PPIA Auckland 2024' : 'PPIA Auckland 2024 Recap'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, language, videoBlock]);

  /**
   * Most branches above already append `?rel=0&modestbranding=1`, so the play
   * handler's old `${embedUrl}?autoplay=1` produced a URL with two question
   * marks — YouTube dropped the autoplay and the video needed a second click.
   */
  const autoplayUrl = useMemo(() => {
    const separator = content.embedUrl.includes('?') ? '&' : '?';
    return `${content.embedUrl}${separator}autoplay=1`;
  }, [content.embedUrl]);

  return (
    <section className="sea-deep relative overflow-hidden py-28">
      {/* Depth: the hero's chart grid, masked so it fades behind the player,
          plus one warm glow so the frame appears lit rather than pasted on. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="sea-chart-light absolute inset-0 opacity-[0.05]"
          style={{
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 20%, black 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 20%, black 80%)',
          }}
        />
        <div
          className="absolute left-1/2 top-1/3 h-[560px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.14]"
          style={{ background: 'radial-gradient(circle, #E8231A 0%, transparent 65%)' }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <SectionHeading
          eyebrow={content.badge}
          title={content.title}
          tone="dark"
          className="mb-14"
        />

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/*
            The player sits in a bulkhead frame with riveted corners rather than
            floating as a rounded rectangle with a gradient hairline. A glass
            card is the default treatment for embedded media; a fitted panel is
            something this page can own, and it also gives the caption strip
            below a place to live.
          */}
          <div className="relative rounded-[10px] bg-gradient-to-b from-white/[0.13] to-white/[0.03] p-3 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)] ring-1 ring-white/12 sm:p-4">
            {/* Rivets, one per corner of the panel. */}
            {[
              'left-2 top-2',
              'right-2 top-2',
              'left-2 bottom-2',
              'right-2 bottom-2',
            ].map((position) => (
              <span
                key={position}
                aria-hidden="true"
                className={`absolute ${position} h-1.5 w-1.5 rounded-full bg-white/25 ring-1 ring-black/30`}
              />
            ))}

          <div
            className="relative overflow-hidden rounded-[5px] ring-1 ring-black/40"
            style={{ aspectRatio: '16/9' }}
          >
            {playing ? (
              <div className="absolute inset-0">
                <iframe
                  className="h-full w-full"
                  src={autoplayUrl}
                  title={content.videoTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <button
                  onClick={() => setPlaying(false)}
                  aria-label="Close video"
                  className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label={`Play: ${content.videoTitle}`}
                className="group absolute inset-0 flex w-full items-center justify-center bg-gradient-to-br from-[#1E3155] to-[#0D1B33] text-left"
                style={
                  content.thumbnailUrl
                    ? {
                        backgroundImage: `url(${content.thumbnailUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              >
                {/* Always dim, not only when a thumbnail exists — the play
                    control and caption need a predictable contrast floor. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35 transition-opacity duration-500 group-hover:opacity-90"
                />

                {!reduceMotion && (
                  <span
                    aria-hidden="true"
                    className="absolute h-24 w-24 animate-ping rounded-full"
                    style={{ background: `${colors.buttonPrimary}26` }}
                  />
                )}

                <span
                  className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full shadow-[0_18px_50px_-12px_rgba(232,35,26,0.85)] ring-1 ring-white/25 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: colors.buttonPrimary }}
                >
                  <Play size={30} className="ml-0.5 text-white" fill="white" />
                </span>

                <span className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <span
                    className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.2em] text-white/75"
                  >
                    {content.featuredLabel}
                  </span>
                  <span
                    className="block text-lg font-bold leading-snug text-white sm:text-xl"
                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                  >
                    {content.videoTitle}
                  </span>
                </span>
              </button>
            )}
          </div>

            {/* Panel plate: the frame's own label, set as data. */}
            <div className="mt-3 flex items-center gap-3 px-1">
              <span aria-hidden="true" className="h-px w-6 bg-white/20" />
              <p className="data-type text-[12px] font-bold uppercase text-white/40">
                {content.featuredLabel}
              </p>
              <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
              <p className="data-type text-[12px] uppercase text-white/30">16:9</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
