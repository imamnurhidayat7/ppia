'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

/**
 * Whether any PEMIRA election exists.
 *
 * The public header carries a PEMIRA link, but PEMIRA is seasonal — outside an
 * election cycle there is nothing behind that page. Admins can now delete
 * elections, and once the last one is gone the menu item should go with it.
 *
 * Returns `null` while the answer is still unknown, so the caller can leave the
 * link in place during load rather than flashing it out and back in: the item
 * is only removed once we have confirmed there are zero elections.
 */
export function useHasElections(): boolean | null {
  const [hasElections, setHasElections] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getElections()
      .then((res: { elections?: unknown[] }) => {
        if (mounted) setHasElections((res.elections?.length ?? 0) > 0);
      })
      .catch(() => {
        // On error, don't hide a menu that might be valid — treat as unknown.
        if (mounted) setHasElections(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return hasElections;
}
