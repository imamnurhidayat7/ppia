'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import type { PageBlock } from '@/lib/api-types';
import { CheckCircle } from 'lucide-react';
import { useBlockData } from '@/hooks/useBlockData';
import { sanitizeHtml } from '@/lib/sanitize-html';

function CountdownDisplay({ targetDate, isId }: { targetDate?: string | null; isId: boolean }) {
  const target = targetDate ? new Date(targetDate).getTime() : 0;
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setRemaining(Math.max(0, target - Date.now()));
    const initialTimer = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [target]);

  if (remaining === 0 || !Number.isFinite(target)) {
    return <p className="text-xl opacity-90">{isId ? 'Acara telah berakhir' : 'Event has ended'}</p>;
  }

  const seconds = Math.floor((remaining ?? 0) / 1000);
  const values = [
    Math.floor(seconds / 86400),
    Math.floor((seconds % 86400) / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ];
  const labels = isId ? ['Hari', 'Jam', 'Menit', 'Detik'] : ['Days', 'Hours', 'Minutes', 'Seconds'];

  return (
    <div className="flex flex-wrap justify-center gap-4" data-countdown-target={targetDate || undefined}>
      {labels.map((label, index) => (
        <div key={label} className="min-w-20 rounded-xl bg-white/10 px-6 py-4 backdrop-blur">
          <div className="text-3xl font-bold tabular-nums">
            {remaining === null ? '--' : String(values[index]).padStart(2, '0')}
          </div>
          <div className="mt-1 text-xs uppercase opacity-75">{label}</div>
        </div>
      ))}
    </div>
  );
}

interface PageBlockRendererProps {
  block: PageBlock;
}

export function PageBlockRenderer({ block }: PageBlockRendererProps) {
  const { language } = useLanguage();
  const isId = language === 'id';

  // Get localized content
  const title = (isId ? block.titleId : block.title) || block.title || '';
  const subtitle = (isId ? block.subtitleId : block.subtitle) || block.subtitle || '';
  const content = (isId ? block.contentId : block.content) || block.content || '';
  const linkText = (isId ? block.linkTextId : block.linkText) || block.linkText || '';
  const linkUrl = block.linkUrl || '#';
  const imageUrl = block.imageUrl;
  const color = (block.config as any)?.color || block.color || '#E8231A';

  // Dynamic data source (if block.config.dataSource is set, fetch from DB)
  const dataSource = (block.config as any)?.dataSource ?? null;
  const { data: dynamicData, loading: dynamicLoading } = useBlockData(dataSource);

  // Safe JSON parse helper for content fields
  const safeParse = (json: string | null | undefined, fallback: any) => {
    if (!json) return fallback;
    try { return JSON.parse(json); } catch { return fallback; }
  };

  switch (block.type) {
    case 'TEXT':
      return (
        <div
          className="prose prose-slate max-w-none my-6"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
        />
      );

    case 'IMAGE':
      return (
        <figure className="my-8">
          {imageUrl && (
            <div className="relative w-full rounded-xl overflow-hidden">
              <Image
                src={imageUrl}
                alt={title || 'Image'}
                width={1200}
                height={675}
                className="w-full h-auto"
              />
            </div>
          )}
          {title && (
            <figcaption className="text-center text-sm text-slate-500 mt-3">
              {title}
            </figcaption>
          )}
        </figure>
      );

    case 'VIDEO':
      const videoId = extractYouTubeId(linkUrl);
      return (
        <div className="my-8">
          {videoId ? (
            <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title={title || 'Video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          ) : linkUrl ? (
            <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <iframe
                src={linkUrl}
                title={title || 'Video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          ) : null}
          {title && (
            <p className="text-center text-sm text-slate-500 mt-3">{title}</p>
          )}
        </div>
      );

    case 'CTA_BUTTON':
      return (
        <div className="my-8 text-center">
          <Link
            href={linkUrl}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all shadow-lg hover:-translate-y-0.5"
            style={{ backgroundColor: color }}
          >
            {linkText || title || 'Click Here'}
          </Link>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-3">{subtitle}</p>
          )}
        </div>
      );

    case 'HERO':
      return (
        <div
          className="relative w-full rounded-2xl overflow-hidden my-8 flex items-center justify-center text-center"
          style={
            imageUrl
              ? {
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  minHeight: '400px',
                }
              : {
                  background: `linear-gradient(135deg, ${color}15, ${color}05)`,
                  minHeight: '320px',
                }
          }
        >
          <div className={`px-6 py-16 ${imageUrl ? 'text-white' : 'text-slate-900'}`}>
            {title && (
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
            )}
            {subtitle && (
              <p className={`text-lg md:text-xl mb-6 max-w-2xl mx-auto ${imageUrl ? 'text-white/90' : 'text-slate-600'}`}>
                {subtitle}
              </p>
            )}
            {linkUrl && linkText && (
              <Link
                href={linkUrl}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all shadow-lg hover:-translate-y-0.5"
                style={{ backgroundColor: color }}
              >
                {linkText}
              </Link>
            )}
          </div>
        </div>
      );

    case 'HEADING':
      return (
        <div className="my-8">
          <h2
            className="text-3xl font-bold"
            style={{ color }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-slate-600 mt-2">{subtitle}</p>
          )}
        </div>
      );

    case 'CODE':
      return (
        <div className="my-6">
          {title && (
            <p className="text-sm font-medium text-slate-500 mb-2">{title}</p>
          )}
          <pre className="bg-slate-900 text-slate-100 rounded-xl p-6 overflow-x-auto">
            <code className="text-sm font-mono">{content}</code>
          </pre>
        </div>
      );

    case 'QUOTE':
      return (
        <blockquote
          className="my-8 pl-6 border-l-4 rounded-r-xl py-4"
          style={{ borderColor: color, backgroundColor: `${color}08` }}
        >
          <p className="text-lg italic text-slate-700 dark:text-slate-200 mb-2">
            &ldquo;{content}&rdquo;
          </p>
          {title && (
            <cite className="text-sm text-slate-500 not-italic">
              — {title}
            </cite>
          )}
        </blockquote>
      );

    case 'GALLERY': {
      const configItems = Array.isArray(block.config?.items) ? block.config.items : null;
      const manualImages = configItems ? configItems.map((it: any) => ({ url: it.url || it.image || '', caption: it.caption || it.title || '' })) : parseGalleryImages(content);
      const images = dynamicData && dynamicData.length > 0
        ? dynamicData.map((m: any) => ({ url: m.url || m.fileUrl || '', caption: m.caption || m.title || '' }))
        : manualImages;
      return (
        <div className="my-8">
          {title && (
            <h3 className="text-xl font-semibold text-slate-800 mb-4">{title}</h3>
          )}
          {dynamicLoading && <p className="text-slate-500">Loading…</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                <Image
                  src={img.url}
                  alt={img.caption || `Gallery image ${i + 1}`}
                  width={400}
                  height={400}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'DIVIDER':
      return (
        <hr
          className="my-12 border-0 h-px"
          style={{ background: `linear-gradient(to right, transparent, ${color}, transparent)` }}
        />
      );

    case 'SPACER':
      return <div className="my-16" />;

    case 'FEATURE':
      return (
        <div className="my-6 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-start gap-4">
            {imageUrl && (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
                <CheckCircle size={24} style={{ color }} />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{content}</p>
            </div>
          </div>
        </div>
      );

    case 'STATISTIC':
      return (
        <div className="my-6 text-center p-6 rounded-xl" style={{ backgroundColor: `${color}08` }}>
          <div className="text-4xl md:text-5xl font-bold" style={{ color }}>
            {title}
          </div>
          {subtitle && (
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{subtitle}</p>
          )}
        </div>
      );

    case 'MEMBER_CARD':
      return (
        <div className="my-4 p-6 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title || 'Member'}
              width={120}
              height={120}
              className="w-24 h-24 rounded-full mx-auto object-cover mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
              <span className="text-2xl font-bold" style={{ color }}>
                {(title || '?').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {title && <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>}
          {subtitle && <p className="text-sm font-medium mt-1" style={{ color }}>{subtitle}</p>}
          {content && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{content}</p>}
        </div>
      );

    case 'EVENT_CARD': {
      if (dynamicData && dynamicData.length > 0) {
        return (
          <div className="my-4">
            {dynamicLoading && <p className="text-slate-500">Loading…</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dynamicData.map((e: any, i: number) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow">
                  {e.imageUrl && (
                    <Image
                      src={e.imageUrl}
                      alt={e.title || 'Event'}
                      width={600}
                      height={300}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-5">
                    {e.startDate && (
                      <p className="text-sm font-medium mb-1" style={{ color }}>
                        {new Date(e.startDate).toLocaleDateString(isId ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">{e.title}</h3>
                    {e.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{e.description}</p>}
                    {e.slug && (
                      <Link href={`/events/${e.slug}`} className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color }}>
                        {isId ? 'Selengkapnya' : 'Read more'} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="my-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={title || 'Event'}
              width={600}
              height={300}
              className="w-full h-40 object-cover"
            />
          )}
          <div className="p-5">
            {title && <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">{title}</h3>}
            {subtitle && <p className="text-sm font-medium mt-1" style={{ color }}>{subtitle}</p>}
            {content && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{content}</p>}
            {linkUrl && linkText && (
              <Link href={linkUrl} className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color }}>
                {linkText} →
              </Link>
            )}
          </div>
        </div>
      );
    }

    case 'ARTICLE_CARD': {
      if (dynamicData && dynamicData.length > 0) {
        return (
          <div className="my-4">
            {dynamicLoading && <p className="text-slate-500">Loading…</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dynamicData.map((a: any, i: number) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow">
                  {a.imageUrl && (
                    <Image
                      src={a.imageUrl}
                      alt={a.title || 'Article'}
                      width={600}
                      height={300}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">{a.title}</h3>
                    {a.excerpt && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{a.excerpt}</p>}
                    {a.slug && (
                      <Link href={`/articles/${a.slug}`} className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color }}>
                        {isId ? 'Baca selengkapnya' : 'Read more'} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div className="my-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={title || 'Article'}
              width={600}
              height={300}
              className="w-full h-40 object-cover"
            />
          )}
          <div className="p-5">
            {title && <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-lg">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{subtitle}</p>}
            {linkUrl && (
              <Link href={linkUrl} className="inline-block mt-3 text-sm font-medium hover:underline" style={{ color }}>
                Read more →
              </Link>
            )}
          </div>
        </div>
      );
    }

    case 'NEWSLETTER_FORM':
      return (
        <div className="my-8 p-8 rounded-2xl text-center" style={{ background: `linear-gradient(135deg, ${color}15, ${color}05)` }}>
          {title && <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{title}</h3>}
          {subtitle && <p className="text-slate-600 dark:text-slate-300 mb-4">{subtitle}</p>}
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={{ '--tw-ring-color': color } as React.CSSProperties}
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:-translate-y-0.5 shadow-lg"
              style={{ backgroundColor: color }}
            >
              {linkText || 'Subscribe'}
            </button>
          </form>
        </div>
      );

    case 'SOCIAL_LINK':
      return (
        <div className="my-4">
          <Link
            href={linkUrl}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {imageUrl && (
              <Image src={imageUrl} alt={title || 'Social'} width={20} height={20} className="w-5 h-5" />
            )}
            <span className="font-medium text-slate-700 dark:text-slate-200">{title || linkUrl}</span>
          </Link>
        </div>
      );

    case 'COLUMNS':
      return (
        <div className="my-6">
          {title && <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">{title}</h3>}
          {content && (
            <div
              className="prose prose-slate dark:prose-invert max-w-none grid gap-4 md:grid-cols-2"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
            />
          )}
        </div>
      );

    case 'TIMELINE': {
      const configItems = Array.isArray(block.config?.items) ? block.config.items : null;
      const manualItems = configItems || safeParse(content, []);
      const arr = dynamicData && dynamicData.length > 0
        ? dynamicData.map((e: any) => ({
            year: e.startDate ? new Date(e.startDate).getFullYear() : '',
            title: e.title || '',
            desc: e.description || e.excerpt || '',
          }))
        : (Array.isArray(manualItems) ? manualItems : []);
      return (
        <section className="max-w-4xl mx-auto px-6 py-16">
          {block.title && <h2 className="text-3xl font-bold text-center mb-12 text-slate-800 dark:text-white">{block.title}</h2>}
          {dynamicLoading && <p className="text-center text-slate-500">Loading…</p>}
          <div className="relative">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
            {arr.map((item: any, i: number) => (
              <div key={i} className={`relative flex items-start gap-6 mb-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-600 border-4 border-white dark:border-slate-900 z-10" />
                <div className={`ml-12 md:ml-0 md:w-1/2 ${i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                  <span className="text-blue-600 font-bold text-sm">{item.year}</span>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{item.title}</h3>
                  {item.desc && <p className="text-slate-500 dark:text-slate-400 text-sm">{item.desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }
    case 'TEAM': {
      const configItems = Array.isArray(block.config?.items) ? block.config.items : null;
      const manualMembers = configItems || safeParse(content, []);
      const arr = dynamicData && dynamicData.length > 0
        ? dynamicData.map((d: any) => ({
            name: d.name || '',
            role: d.description || d.shortDescription || '',
            photo: d.logo || d.image || d.icon || '',
          }))
        : (Array.isArray(manualMembers) ? manualMembers : []);
      return (
        <section className="max-w-6xl mx-auto px-6 py-16">
          {block.title && <h2 className="text-3xl font-bold text-center mb-12 text-slate-800 dark:text-white">{block.title}</h2>}
          {dynamicLoading && <p className="text-center text-slate-500">Loading…</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {arr.map((m: any, i: number) => (
              <div key={i} className="text-center">
                {m.photo ? (
                  <div className="relative mx-auto mb-4 h-32 w-32 overflow-hidden rounded-full ring-4 ring-slate-100 dark:ring-slate-800">
                    <Image src={m.photo} alt={m.name} fill sizes="128px" className="object-cover" />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto mb-4 flex items-center justify-center text-slate-400 text-4xl">{m.name?.[0] || '?'}</div>
                )}
                <h3 className="font-semibold text-slate-800 dark:text-white">{m.name}</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">{m.role}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }
    case 'TABLE': {
      const data = safeParse(content, { headers: [], rows: [] });
      return (
        <section className="max-w-4xl mx-auto px-6 py-16">
          {block.title && <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">{block.title}</h2>}
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>{(data.headers || []).map((h: string, i: number) => <th key={i} className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(data.rows || []).map((row: string[], i: number) => (
                  <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                    {row.map((cell, j) => <td key={j} className="px-4 py-3 text-slate-600 dark:text-slate-300">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    }
    case 'CONTACT': {
      const info = safeParse(content, {});
      return (
        <section className="max-w-4xl mx-auto px-6 py-16 text-center">
          {block.title && <h2 className="text-3xl font-bold mb-8 text-slate-800 dark:text-white">{block.title}</h2>}
          <div className="grid md:grid-cols-3 gap-6">
            {block.linkUrl && (
              <div>
                <p className="text-xs uppercase text-slate-400 mb-1">Email</p>
                <a href={`mailto:${block.linkUrl}`} className="text-blue-600 dark:text-blue-400">{block.linkUrl}</a>
              </div>
            )}
            {info.phone && (
              <div>
                <p className="text-xs uppercase text-slate-400 mb-1">Telepon</p>
                <p className="text-slate-600 dark:text-slate-300">{info.phone}</p>
              </div>
            )}
            {info.address && (
              <div>
                <p className="text-xs uppercase text-slate-400 mb-1">Alamat</p>
                <p className="text-slate-600 dark:text-slate-300">{info.address}</p>
              </div>
            )}
          </div>
          {(info.instagram || info.facebook || info.twitter) && (
            <div className="flex justify-center gap-4 mt-8">
              {info.instagram && <a href={info.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600">Instagram</a>}
              {info.facebook && <a href={info.facebook} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600">Facebook</a>}
              {info.twitter && <a href={info.twitter} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600">Twitter</a>}
            </div>
          )}
        </section>
      );
    }
    case 'COUNTDOWN': {
      const dynEvent = dynamicData && dynamicData.length > 0 ? dynamicData[0] : null;
      const targetDate = dynEvent?.startDate || block.linkUrl;
      return (
        <section className="bg-blue-600 text-white py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            {block.subtitle && <p className="text-lg mb-2 opacity-90">{block.subtitle}</p>}
            {block.title && <h2 className="text-3xl font-bold mb-8">{block.title}</h2>}
            <CountdownDisplay targetDate={targetDate} isId={isId} />
          </div>
        </section>
      );
    }
    case 'SPONSOR': {
      const configItems = Array.isArray(block.config?.items) ? block.config.items : null;
      const manualLogos = configItems || safeParse(content, []);
      const arr = dynamicData && dynamicData.length > 0
        ? dynamicData.map((m: any) => ({ name: m.caption || m.title || '', logo: m.url || m.fileUrl || '', link: '#' }))
        : (Array.isArray(manualLogos) ? manualLogos : []);
      return (
        <section className="max-w-5xl mx-auto px-6 py-12">
          {block.title && <h2 className="text-center text-xl font-semibold mb-8 text-slate-500 dark:text-slate-400">{block.title}</h2>}
          {dynamicLoading && <p className="text-center text-slate-500">Loading…</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            {arr.map((s: any, i: number) => (
              <a key={i} href={s.link || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center p-4 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
                {s.logo ? (
                  <span className="relative block h-16 w-full">
                    <Image src={s.logo} alt={s.name} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-contain" />
                  </span>
                ) : <span className="text-slate-400 font-medium">{s.name}</span>}
              </a>
            ))}
          </div>
        </section>
      );
    }
    case 'FAQ': {
      const configItems = Array.isArray(block.config?.items) ? block.config.items : null;
      const manualItems = configItems || safeParse(content, []);
      const arr = dynamicData && dynamicData.length > 0
        ? dynamicData.map((f: any) => ({ question: f.question || '', answer: f.answer || '' }))
        : (Array.isArray(manualItems) ? manualItems : []);
      return (
        <section className="max-w-3xl mx-auto px-6 py-16">
          {block.title && <h2 className="text-3xl font-bold text-center mb-12 text-slate-800 dark:text-white">{block.title}</h2>}
          {dynamicLoading && <p className="text-center text-slate-500">Loading…</p>}
          <div className="space-y-4">
            {arr.map((item: any, i: number) => (
              <details key={i} className="group rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <summary className="flex items-center justify-between cursor-pointer px-6 py-4 bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-100 list-none">
                  <span>{item.question}</span>
                  <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <div className="px-6 py-4 text-slate-600 dark:text-slate-300 prose prose-sm max-w-none">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>
      );
    }
    case 'MAP':
      return (
        <section className="max-w-5xl mx-auto px-6 py-16">
          {block.title && <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">{block.title}</h2>}
          {block.subtitle && <p className="text-slate-500 dark:text-slate-400 mb-4">{block.subtitle}</p>}
          {block.linkUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700" style={{ height: '400px' }}>
              <iframe src={block.linkUrl} width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map" />
            </div>
          )}
        </section>
      );
    default:
      // Fallback: render content as HTML
      if (content) {
        return (
          <div
            className="prose prose-slate max-w-none my-6"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
          />
        );
      }
      return null;
  }
}

// Helper: Extract YouTube video ID
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Helper: Parse gallery images from JSON content
function parseGalleryImages(content: string): { url: string; caption?: string }[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (typeof parsed === 'object' && parsed.images) {
      return parsed.images;
    }
  } catch {
    // If not JSON, treat content as URLs separated by newlines
    return content.split('\n').filter(Boolean).map((url) => ({
      url: url.trim(),
      caption: '',
    }));
  }
  return [];
}
