'use client';

/**
 * AnnouncementBanner — a slim, dismissable strip above the Navbar.
 *
 * Used for time-sensitive messages like "Registration is open" or "PEMIRA
 * voting ends tomorrow". Reads its content from site config (key: ANNOUNCEMENT)
 * so admins can enable/disable and change the text without deploying.
 *
 * When no announcement is set (or it's disabled), nothing renders — zero
 * layout shift.
 */

import { useEffect, useState } from 'react';
import { X, Megaphone } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

interface Announcement {
  enabled: boolean;
  text: string;
  href?: string;
  variant?: 'info' | 'urgent';
}

export default function AnnouncementBanner() {
  const [data, setData] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Fetch from the public site config endpoint
    api.getSiteConfigByKey?.('ANNOUNCEMENT')
      .then((res: { config?: Announcement }) => {
        if (res?.config?.enabled && res.config.text) {
          setData(res.config);
        }
      })
      .catch(() => {
        // Silently ignore — banner is non-essential
      });
  }, []);

  if (!data || dismissed) return null;

  const isUrgent = data.variant === 'urgent';
  const bg = isUrgent
    ? 'bg-[#E8231A]'
    : 'bg-[#1A2B4A]';

  const content = (
    <span className="flex items-center gap-2 text-white text-xs md:text-sm font-medium">
      <Megaphone size={14} className="shrink-0 opacity-70" />
      <span className="line-clamp-1">{data.text}</span>
    </span>
  );

  return (
    <div className={`relative ${bg} z-[60]`}>
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-center gap-4">
        {data.href ? (
          <Link href={data.href} className="hover:underline underline-offset-2">
            {content}
          </Link>
        ) : (
          content
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcement"
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded text-white/60 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
