'use client';

/**
 * After-event documentation: photos, recordings and links.
 *
 * Renders nothing at all when an event has no documentation, so it can be
 * dropped onto every event page without leaving an empty "Gallery" heading on
 * events that have not happened yet.
 *
 * Photos open in a lightbox with keyboard navigation; videos and links are
 * rendered as outbound cards rather than embeds, because the stored URLs can
 * point anywhere (YouTube, Drive, a news site) and blindly framing an arbitrary
 * origin is both a layout and a security problem.
 */

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ExternalLink, Film, Images, Link2, X } from 'lucide-react';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

type DocumentationType = 'PHOTO' | 'VIDEO' | 'LINK';

interface DocumentationItem {
  id: string;
  type: DocumentationType;
  url: string;
  title?: string | null;
  description?: string | null;
  createdAt: string;
}

interface DocumentationResponse {
  documentation?: DocumentationItem[];
  counts?: { photos: number; videos: number; links: number };
}

interface EventGalleryProps {
  /** Slug of a published event. */
  slug: string;
  /** Styling for the surrounding section, so the host page controls spacing. */
  className?: string;
}

export default function EventGallery({ slug, className = '' }: EventGalleryProps) {
  const [items, setItems] = useState<DocumentationItem[]>([]);
  const [loading, setLoading] = useState(true);
  /** Index into `photos` of the image being viewed, or null when closed. */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setLoading(true);

    api
      .getPublicEventDocumentation(slug)
      .then((res: DocumentationResponse) => {
        if (!cancelled) setItems(res.documentation ?? []);
      })
      .catch(() => {
        // A missing gallery is not an error worth showing a visitor; the section
        // simply does not render.
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const photos = items.filter((item) => item.type === 'PHOTO');
  const videos = items.filter((item) => item.type === 'VIDEO');
  const links = items.filter((item) => item.type === 'LINK');

  const showPrevious = useCallback(() => {
    setLightboxIndex((current) =>
      current === null ? null : (current - 1 + photos.length) % photos.length
    );
  }, [photos.length]);

  const showNext = useCallback(() => {
    setLightboxIndex((current) => (current === null ? null : (current + 1) % photos.length));
  }, [photos.length]);

  // Keyboard control while the lightbox is open, and scroll lock so the page
  // behind does not move under it.
  useEffect(() => {
    if (lightboxIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxIndex(null);
      if (event.key === 'ArrowLeft') showPrevious();
      if (event.key === 'ArrowRight') showNext();
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxIndex, showPrevious, showNext]);

  if (loading || items.length === 0) return null;

  const activePhoto = lightboxIndex === null ? null : photos[lightboxIndex];

  return (
    <section className={className}>
      <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-lg md:p-10">
        <h2 className="mb-2 flex items-center gap-3 text-2xl font-bold text-navy">
          <span className="h-8 w-1 rounded-full bg-ppia-red" />
          Event gallery
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          {[
            photos.length > 0 && `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`,
            videos.length > 0 && `${videos.length} ${videos.length === 1 ? 'recording' : 'recordings'}`,
            links.length > 0 && `${links.length} ${links.length === 1 ? 'link' : 'links'}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo, index) => (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="group relative block aspect-square w-full overflow-hidden rounded-2xl bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ppia-red focus-visible:ring-offset-2"
                  aria-label={photo.title || `Open photo ${index + 1} of ${photos.length}`}
                >
                  <Image
                    src={getImageUrl(photo.url) || photo.url}
                    alt={photo.title || ''}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}

        {(videos.length > 0 || links.length > 0) && (
          <ul className={`grid gap-3 sm:grid-cols-2 ${photos.length > 0 ? 'mt-6' : ''}`}>
            {[...videos, ...links].map((item) => (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-all hover:border-ppia-red/30 hover:bg-white"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-ppia-red shadow-sm">
                    {item.type === 'VIDEO' ? (
                      <Film className="h-4 w-4" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 font-semibold text-navy">
                      <span className="truncate">
                        {item.title || (item.type === 'VIDEO' ? 'Recording' : 'Related link')}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    </span>
                    {item.description && (
                      <span className="mt-1 block line-clamp-2 text-sm text-gray-500">
                        {item.description}
                      </span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activePhoto.title || 'Event photo'}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          // Clicking the backdrop closes; clicks inside the figure do not.
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPrevious();
                }}
                aria-label="Previous photo"
                className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showNext();
                }}
                aria-label="Next photo"
                className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <figure
            className="w-[min(90vw,64rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-[80vh] w-full">
              <Image
                src={getImageUrl(activePhoto.url) || activePhoto.url}
                alt={activePhoto.title || ''}
                fill
                sizes="90vw"
                quality={90}
                className="object-contain"
              />
            </div>
            <figcaption className="mt-3 text-center text-sm text-white/70">
              {activePhoto.title && (
                <span className="block font-semibold text-white">{activePhoto.title}</span>
              )}
              {activePhoto.description && <span className="block">{activePhoto.description}</span>}
              {photos.length > 1 && (
                <span className="mt-1 flex items-center justify-center gap-1.5 text-xs text-white/50">
                  <Images className="h-3 w-3" />
                  {lightboxIndex! + 1} of {photos.length}
                </span>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
