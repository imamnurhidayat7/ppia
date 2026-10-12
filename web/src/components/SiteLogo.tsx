'use client';

import Image from 'next/image';
import { useSiteLogo } from '@/lib/hooks/use-site-config';

interface SiteLogoProps {
  /** Which settings record supplies the mark: the header or the footer one. */
  location?: 'header' | 'footer';
  width: number;
  height: number;
  /** Rendered display height; width follows the artwork's aspect ratio. */
  displayHeight: number;
  className?: string;
  priority?: boolean;
}

/**
 * Brand mark everywhere it appears: navbar, footer, dashboard bar, auth
 * pages, member card, maintenance page.
 *
 * Source of truth is Dashboard > System > Header, footer, and colours, via
 * {@link useSiteLogo}. `unoptimized` so an uploaded file on any host renders
 * without touching the image-optimizer allowlist; dimensions are fixed so a
 * swap never shifts layout.
 */
export default function SiteLogo({
  location = 'header',
  width,
  height,
  displayHeight,
  className,
  priority = false,
}: SiteLogoProps) {
  const logo = useSiteLogo(location);

  return (
    <Image
      src={logo.src}
      alt={logo.alt}
      width={width}
      height={height}
      style={{ height: displayHeight, width: 'auto' }}
      className={className}
      priority={priority}
      unoptimized
    />
  );
}
