/**
 * Loading skeletons for public, data-driven pages.
 *
 * These mirror the real content layout (a dark PageHeader band, then cards with
 * an image block and text lines) so the transition from skeleton to content is
 * calm rather than a jarring reflow. They are plain presentational components
 * with no hooks, so they work both in a route `loading.tsx` (server) and inside
 * the client list components while they fetch.
 */

/** A single shimmering placeholder block. Sizing comes from `className`. */
export function Shimmer({
  className = "",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`${dark ? "skeleton-shimmer-dark" : "skeleton-shimmer"} ${className}`}
    />
  );
}

/** Matches the dark navy <PageHeader/> band (label, title, description). */
export function PublicHeaderSkeleton() {
  return (
    <div className="sea-deep pt-32 pb-16">
      <div className="mx-auto max-w-7xl px-6">
        <Shimmer dark className="mb-5 h-3 w-28 rounded-full" />
        <Shimmer dark className="mb-4 h-10 w-72 max-w-full rounded-xl" />
        <Shimmer dark className="h-4 w-[28rem] max-w-full rounded-md" />
      </div>
    </div>
  );
}

/* ── Cards ──────────────────────────────────────────────────────────────── */

function ImageCardSkeleton() {
  return (
    <div className="chart-paper flex flex-col overflow-hidden rounded-[5px] border border-[#DCE7F1]">
      <Shimmer className="h-40 w-full !rounded-none" />
      <div className="space-y-3 p-5">
        <Shimmer className="h-5 w-3/4" />
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-5/6" />
        <div className="flex items-center justify-between pt-4">
          <Shimmer className="h-3 w-28" />
          <Shimmer className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

/** Grid of image cards, used for the news/articles and events listings. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ImageCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ── Page-level list skeletons (inner content; the real PageHeader stays) ── */

/** News & Articles: filter tabs, a featured banner and the post grid. */
export function ArticlesListSkeleton() {
  return (
    <section className="sea-shore py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="chart-paper mb-10 flex w-fit gap-2 rounded-[5px] border border-[#DCE7F1] p-1">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-9 w-24 rounded-lg" />
          ))}
        </div>
        <Shimmer className="mb-10 h-56 w-full rounded-[5px]" />
        <CardGridSkeleton count={6} />
      </div>
    </section>
  );
}

/** Events listing: the upcoming grid. */
export function EventsListSkeleton() {
  return (
    <section className="sea-shore py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-wrap gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Shimmer key={i} className="h-9 w-28 rounded-full" />
          ))}
        </div>
        <CardGridSkeleton count={6} />
      </div>
    </section>
  );
}

/** Research: the dark stats band (four figures). */
export function ResearchStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="text-center">
          <Shimmer dark className="mx-auto mb-2 h-10 w-20 rounded-lg" />
          <Shimmer dark className="mx-auto h-3 w-24 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Research: the list of featured paper cards. */
export function ResearchPapersSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="chart-paper overflow-hidden rounded-[5px] border border-[#DCE7F1]">
          <Shimmer className="h-1.5 w-full !rounded-none" />
          <div className="space-y-4 p-8 md:p-10">
            <Shimmer className="h-4 w-32 rounded-full" />
            <Shimmer className="h-7 w-3/4" />
            <div className="flex items-center gap-3">
              <Shimmer className="h-9 w-9 !rounded-full" />
              <div className="space-y-2">
                <Shimmer className="h-3 w-32" />
                <Shimmer className="h-3 w-20" />
              </div>
            </div>
            <Shimmer className="h-16 w-full" />
            <div className="flex gap-3">
              <Shimmer className="h-10 w-36 rounded-xl" />
              <Shimmer className="h-10 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Full-route skeletons (for loading.tsx: header + body) ─────────────── */

/** Article / news detail: header, hero image, and a column of text lines. */
export function ArticleDetailSkeleton() {
  return (
    <>
      <PublicHeaderSkeleton />
      <section className="sea-shore py-16">
        <div className="mx-auto max-w-3xl px-6">
          <Shimmer className="mb-8 h-72 w-full rounded-[5px]" />
          <div className="space-y-4">
            <Shimmer className="h-5 w-2/3" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Shimmer key={i} className={`h-4 ${i % 4 === 3 ? "w-1/2" : "w-full"}`} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/** Event detail: header, hero, and a two-column body/sidebar. */
export function EventDetailSkeleton() {
  return (
    <>
      <PublicHeaderSkeleton />
      <section className="sea-shore py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Shimmer className="mb-4 h-72 w-full rounded-[5px]" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Shimmer key={i} className={`h-4 ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
            ))}
          </div>
          <div className="chart-paper space-y-4 rounded-[5px] border border-[#DCE7F1] p-6">
            <Shimmer className="h-6 w-32" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-3/4" />
            <Shimmer className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Generic content page: header, a summary/stat row and a grid of cards. Used by
 * the CMS-driven pages (cabinet, contact, about, opportunities) while their
 * client content loads, so the viewport shows a considered layout rather than a
 * bare Navbar + Footer.
 */
export function PublicPageSkeleton() {
  return (
    <>
      <PublicHeaderSkeleton />
      <section className="sea-shore py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 grid grid-cols-2 gap-8 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <Shimmer className="mx-auto mb-2 h-9 w-20 rounded-lg" />
                <Shimmer className="mx-auto h-3 w-24 rounded-md" />
              </div>
            ))}
          </div>
          <CardGridSkeleton count={6} />
        </div>
      </section>
    </>
  );
}

/** Generic CMS page: header plus a block of text lines. */
export function GenericPageSkeleton() {
  return (
    <>
      <PublicHeaderSkeleton />
      <section className="sea-shore py-16">
        <div className="mx-auto max-w-4xl space-y-4 px-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <Shimmer key={i} className={`h-4 ${i % 5 === 4 ? "w-1/2" : "w-full"}`} />
          ))}
        </div>
      </section>
    </>
  );
}
