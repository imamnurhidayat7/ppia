"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Link2,
  ListVideo,
  Play,
  Search,
  SearchX,
  SkipForward,
  X,
} from "lucide-react";
import WaveTransition from "@/components/sections/WaveTransition";
import { useLanguage } from "@/lib/language-context";
import type { YouTubeFeed, YouTubeFeedVideo } from "@/lib/server-api";

/**
 * Seam colour for the waterline transition into the footer — the end of the
 * `.sea-shore` gradient in globals.css.
 */
const SHORE = "#FFFFFF";
const FOOTER_SEA = "#071321";

/** Privacy-enhanced embeds: no tracking cookies until playback starts. */
const NOCOOKIE_ORIGIN = "https://www.youtube-nocookie.com";
const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

/** Persisted "play the next video when this one ends" preference. */
const AUTOPLAY_KEY = "ppia-videos-autoplay";

/**
 * Archive entries per grid page: three full rows of three. The channel RSS
 * tops out around fifteen videos, so nine keeps the grid to two pages today
 * and still scales if the feed ever grows.
 */
const GRID_PAGE_SIZE = 9;

type SortKey = "newest" | "oldest" | "views";

/* ── Minimal typings for the YT IFrame API (loaded lazily, on first play) ── */

interface YTPlayerInstance {
  loadVideoById(videoId: string): void;
  destroy(): void;
}

interface YTPlayerEvent {
  data: number;
}

/** YT.PlayerState.ENDED — the only state this page reacts to. */
const PLAYER_STATE_ENDED = 0;

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      width?: string;
      height?: string;
      host?: string;
      videoId?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onError?: (event: YTPlayerEvent) => void;
        onStateChange?: (event: YTPlayerEvent) => void;
      };
    }
  ) => YTPlayerInstance;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Resolves once the IFrame API script is ready; injected at most once. */
let apiPromise: Promise<YTNamespace> | null = null;

function ensurePlayerApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube API unavailable"));
    };
    const script = document.createElement("script");
    script.src = IFRAME_API_SRC;
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("YouTube API failed to load"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

/** First paint must match the server, so the hash is applied in an effect. */
function videoIdFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.hash.match(/#v=([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-NZ", { day: "2-digit", month: "short", year: "numeric" });
}

function formatViews(views: number | null): string | null {
  if (views === null) return null;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K`;
  return `${views}`;
}

/** Ghost tile behind a thumbnail that failed to load — never a broken image. */
function ThumbGhost({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-[#1E3155] to-[#0D1B33] p-2 text-white/60"
    >
      <Play size={22} />
      <span className="data-type text-center text-[10px] font-bold uppercase">{label}</span>
    </span>
  );
}

/**
 * Video gallery: a full-width theater above a searchable, sortable archive.
 *
 * No side rail and no masthead hero — the theater opens the page directly
 * under the navbar, and the whole feed lives in a three-column grid below
 * it. Clicking any card loads that video into the theater (the previous
 * player is destroyed, so audio never overlaps and bandwidth is freed) and
 * scrolls back up to it. Nothing redirects: outbound YouTube links survive
 * only as secondary actions (watch / subscribe / share).
 *
 * The grid is searchable, sortable (newest / oldest / most viewed) and
 * paginated client-side (nine entries per page) so it stays compact whether
 * the feed holds fifteen videos or five hundred. Autoplay and deep-links
 * can land on any page — the grid follows the active video on its own.
 *
 * Performance — the facade pattern throughout: thumbnails until the moment
 * of intent. The IFrame API script itself loads lazily on first play, and a
 * preconnect to the embed origin is injected on first hover/focus. At most
 * one YouTube player ever exists on the page.
 *
 * Robustness — owners can block embedding (player errors 101/150) and there
 * is no workaround, so a blocked video swaps the theater for a fallback
 * panel with a "Watch on YouTube" action instead of a dead frame.
 *
 * CSS caution — never pair `block` with `line-clamp-*` (in Tailwind v4
 * `.block` sorts after the clamp and its `display: block` silently kills
 * it), and prefer literal `aspect-[16/9]` over `aspect-video` here.
 */
export default function VideosContent({ initialFeed }: { initialFeed: YouTubeFeed | null }) {
  const { language } = useLanguage();
  const isId = language === "id";
  const reduceMotion = useReducedMotion();

  const videos = initialFeed?.videos ?? [];
  const byId = (id: string | null): YouTubeFeedVideo | undefined =>
    videos.find((video) => video.id === id);

  const [activeId, setActiveId] = useState<string | null>(videos[0]?.id ?? null);
  const [playing, setPlaying] = useState(false);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [thumbFailedIds, setThumbFailedIds] = useState<Set<string>>(new Set());
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [page, setPage] = useState(1);
  const [query, setQueryState] = useState("");
  const [sort, setSortState] = useState<SortKey>("newest");

  const playerRef = useRef<YTPlayerInstance | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const theaterRef = useRef<HTMLElement | null>(null);
  const facadeRef = useRef<HTMLButtonElement | null>(null);
  const preconnectedRef = useRef(false);
  const activeIdRef = useRef<string | null>(activeId);
  activeIdRef.current = activeId;
  const autoplayNextRef = useRef(autoplayNext);
  autoplayNextRef.current = autoplayNext;
  const videosRef = useRef(videos);
  videosRef.current = videos;
  const failedIdsRef = useRef(failedIds);
  failedIdsRef.current = failedIds;
  /** Latest state-change handler — the player holds a stable wrapper instead. */
  const stateChangeRef = useRef<((event: YTPlayerEvent) => void) | null>(null);

  const active = byId(activeId) ?? videos[0];
  const failed = active ? failedIds.has(active.id) : false;

  // Archive view: search across titles and descriptions, then sort. The feed
  // arrives newest-first, but sort explicitly rather than trusting the order.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? videos.filter((video) =>
          `${video.title}\n${video.description}`.toLowerCase().includes(q)
        )
      : [...videos];
    const sorted = [...filtered];
    if (sort === "oldest") {
      sorted.sort(
        (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      );
    } else if (sort === "views") {
      sorted.sort((a, b) => (b.views ?? -1) - (a.views ?? -1));
    } else {
      sorted.sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }
    return sorted;
  }, [videos, query, sort]);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const totalPages = Math.max(1, Math.ceil(visible.length / GRID_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageItems = visible.slice((safePage - 1) * GRID_PAGE_SIZE, safePage * GRID_PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : (safePage - 1) * GRID_PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * GRID_PAGE_SIZE, visible.length);

  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
  };

  const updateQuery = (value: string) => {
    setQueryState(value);
    setPage(1);
  };

  const updateSort = (value: SortKey) => {
    setSortState(value);
    setPage(1);
  };

  // The entry queued after the active one within the current archive view,
  // skipping videos whose embed is known-blocked. `wrap` is for the manual
  // Next button (loops the queue); autoplay stops at the end instead.
  const findNextIn = useCallback(
    (list: YouTubeFeedVideo[], wrap: boolean): YouTubeFeedVideo | undefined => {
      const index = list.findIndex((video) => video.id === activeIdRef.current);
      const after = list.slice(index + 1).find((video) => !failedIdsRef.current.has(video.id));
      if (after) return after;
      if (!wrap) return undefined;
      const looped = list.find((video) => !failedIdsRef.current.has(video.id));
      return looped && looped.id !== activeIdRef.current ? looped : undefined;
    },
    []
  );

  const activeIndex = visible.findIndex((video) => video.id === active?.id);
  const upNext =
    active && activeIndex >= 0
      ? (visible.slice(activeIndex + 1).find((video) => !failedIds.has(video.id)) ??
        visible.find(
          (video) => video.id !== active.id && !failedIds.has(video.id)
        ))
      : undefined;

  /* eslint-disable react-hooks/set-state-in-effect --
     Deep-link support and the persisted autoplay preference are client-only:
     the server renders the newest upload with autoplay on, then the client
     reconciles once mounted. State is only written after mount, so there is
     no hydration mismatch. */
  useEffect(() => {
    const id = videoIdFromHash();
    if (id) {
      const index = videosRef.current.findIndex((video) => video.id === id);
      if (index >= 0) {
        setActiveId(id);
        setPage(Math.floor(index / GRID_PAGE_SIZE) + 1);
      }
    }
    try {
      const stored = localStorage.getItem(AUTOPLAY_KEY);
      if (stored === "off") setAutoplayNext(false);
    } catch {
      // Non-fatal: the toggle still works for this session.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // The grid follows the active video: autoplay and deep-links can land on a
  // page the visitor isn't looking at. Manual taps are already in view, so
  // this is a no-op for them.
  useEffect(() => {
    if (!activeId) return;
    const index = visible.findIndex((video) => video.id === activeId);
    if (index < 0) return;
    const needed = Math.floor(index / GRID_PAGE_SIZE) + 1;
    setPage((current) => (current === needed ? current : needed));
  }, [activeId, visible]);

  // Tear the player down when leaving the page.
  useEffect(
    () => () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    },
    []
  );

  const syncHash = (id: string) => {
    try {
      window.history.replaceState(null, "", `#v=${id}`);
    } catch {
      // Non-fatal: deep-linking is a convenience, not the playback itself.
    }
  };

  /** Warm up the embed origin once the visitor shows intent. */
  const preconnect = () => {
    if (preconnectedRef.current) return;
    preconnectedRef.current = true;
    for (const href of [NOCOOKIE_ORIGIN, "https://www.youtube.com"]) {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = href;
      document.head.appendChild(link);
    }
  };

  const destroyPlayer = () => {
    playerRef.current?.destroy();
    playerRef.current = null;
  };

  const markThumbFailed = (id: string) => {
    setThumbFailedIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  const toggleAutoplayNext = () => {
    setAutoplayNext((value) => {
      const next = !value;
      try {
        localStorage.setItem(AUTOPLAY_KEY, next ? "on" : "off");
      } catch {
        // Non-fatal: the toggle still applies for this session.
      }
      return next;
    });
  };

  const handlePlayerError = useCallback((event: YTPlayerEvent) => {
    // 100 removed/private, 101/150 embedding disabled, 2/5 unplayable — every
    // case ends the same way: a fallback panel, never a dead frame.
    void event;
    const id = activeIdRef.current;
    if (!id) return;
    setFailedIds((prev) => new Set(prev).add(id));
    destroyPlayer();
    setPlaying(false);
  }, []);

  /**
   * Load `id` into the theater and start it. A click is a playback gesture,
     so autoplay is correct — otherwise the visitor presses play twice.
   */
  const playVideo = useCallback(
    async (id: string, options?: { scroll?: boolean }) => {
      const target = videosRef.current.find((video) => video.id === id);
      if (!target) return;
      destroyPlayer();
      setActiveId(id);
      setDescriptionOpen(false);
      syncHash(id);

      // A video that already failed to embed goes straight to its fallback.
      if (failedIdsRef.current.has(id)) {
        setPlaying(false);
        return;
      }

      setPlaying(true);
      // The player mount only exists after this render commits.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const mount = mountRef.current;
      if (!mount) {
        setPlaying(false);
        return;
      }
      try {
        const YT = await ensurePlayerApi();
        if (activeIdRef.current !== id) return; // superseded while loading
        playerRef.current = new YT.Player(mount, {
          width: "100%",
          height: "100%",
          host: NOCOOKIE_ORIGIN,
          videoId: id,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            autoplay: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onError: handlePlayerError,
            onStateChange: (event) => stateChangeRef.current?.(event),
          },
        });
      } catch {
        setPlaying(false);
      }

      if (options?.scroll !== false) {
        theaterRef.current?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
      }
    },
    [handlePlayerError, reduceMotion]
  );

  // Keep the state-change handler fresh without recreating the player: the
  // registered wrapper reads through this ref. Autoplay walks the current
  // archive view (search/sort aware) and stops at its end.
  useEffect(() => {
    stateChangeRef.current = (event: YTPlayerEvent) => {
      if (event.data !== PLAYER_STATE_ENDED) return;
      if (!autoplayNextRef.current) return;
      const list = visibleRef.current;
      const index = list.findIndex((video) => video.id === activeIdRef.current);
      const next = list.slice(index + 1).find((video) => !failedIdsRef.current.has(video.id));
      if (next) void playVideo(next.id, { scroll: false });
    };
  }, [playVideo]);

  const playNext = () => {
    const next = findNextIn(visibleRef.current, true);
    if (next) void playVideo(next.id);
  };

  const closePlayer = () => {
    destroyPlayer();
    setPlaying(false);
    // Return keyboard focus to the facade so tab order continues from here.
    requestAnimationFrame(() => facadeRef.current?.focus());
  };

  const shareActive = async () => {
    if (!active) return;
    const url = `${window.location.origin}${window.location.pathname}#v=${active.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API needs a secure context — fall back to the old path.
      const area = document.createElement("textarea");
      area.value = url;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "newest", label: isId ? "Terbaru" : "Newest" },
    { value: "oldest", label: isId ? "Terlama" : "Oldest" },
    { value: "views", label: isId ? "Terpopuler" : "Most viewed" },
  ];

  if (!active) {
    return (
      <section className="sea-shore relative overflow-hidden pb-16 pt-24 sm:pt-28">
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="chart-paper mx-auto max-w-xl rounded-[5px] border border-[#DCE7F1] p-10 text-center">
            <h1
              className="text-2xl font-black tracking-tight text-[#0F1B33]"
              style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
            >
              {isId ? "Feed belum tersedia" : "Feed unavailable"}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#5B6B7C]">
              {isId
                ? "Tidak bisa memuat video saat ini. Tonton langsung di channel YouTube kami."
                : "Could not load videos right now. Watch directly on our YouTube channel."}
            </p>
            <a
              href="https://www.youtube.com/@ppiauckland2025"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#E8231A] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C41E16]"
            >
              {isId ? "Buka YouTube" : "Open YouTube"}
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Screen-reader announcement: focus stays put, the title is announced. */}
      <p aria-live="polite" className="sr-only">
        {playing ? `${isId ? "Sedang diputar" : "Now playing"}: ${active.title}` : ""}
      </p>

      <section
        className="sea-shore relative overflow-hidden pb-16 pt-20 sm:pt-24"
        onMouseEnter={preconnect}
        onFocusCapture={preconnect}
      >
        <div
          aria-hidden="true"
          className="sea-chart pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, transparent 25%, black 90%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, transparent 25%, black 90%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-6">
          {/* Page title for assistive tech and the document outline — the
              visual design opens straight on the theater, with no hero. */}
          <h1 className="sr-only">{isId ? "Galeri video" : "Video gallery"}</h1>

          {/* ── Theater: the single player. Everything plays here. ── */}
          <section ref={theaterRef} aria-label={active.title} className="scroll-mt-24">
            <div className="relative rounded-[10px] bg-gradient-to-b from-[#0F2438] to-[#071321] p-3 shadow-[0_40px_90px_-30px_rgba(7,19,33,0.85)] ring-1 ring-[#0F2438] sm:p-4">
              <div
                className="relative overflow-hidden rounded-[5px] bg-black ring-1 ring-black/40"
                style={{ aspectRatio: "16/9" }}
              >
                {playing && !failed ? (
                  <div className="absolute inset-0">
                    <div ref={mountRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
                    <button
                      onClick={closePlayer}
                      aria-label={isId ? "Tutup video" : "Close video"}
                      className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : playing && failed ? (
                  /* Embedding blocked by the owner — fallback, never a dead frame. */
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1E3155] to-[#0D1B33] p-8 text-center">
                    <p className="text-lg font-bold text-white">
                      {isId ? "Video ini tidak bisa diputar di sini" : "This video can't play here"}
                    </p>
                    <p className="max-w-md text-sm leading-relaxed text-white/70">
                      {isId
                        ? "Pemilik membatasi pemutaran di luar YouTube. Tonton langsung di YouTube."
                        : "The owner restricts playback outside YouTube. Watch it directly on YouTube."}
                    </p>
                    <a
                      href={active.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#E8231A] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C41E16]"
                    >
                      <Play size={16} aria-hidden="true" />
                      {isId ? "Tonton di YouTube" : "Watch on YouTube"}
                    </a>
                  </div>
                ) : (
                  <button
                    ref={facadeRef}
                    type="button"
                    onClick={() => playVideo(active.id, { scroll: false })}
                    aria-label={`${isId ? "Putar video" : "Play video"}: ${active.title}`}
                    className="group absolute inset-0 flex w-full items-center justify-center text-left"
                  >
                    {thumbFailedIds.has(active.id) ? (
                      <ThumbGhost label={isId ? "Video" : "Video"} />
                    ) : (
                      <Image
                        src={active.thumbnail}
                        alt=""
                        fill
                        sizes="(max-width: 1280px) 100vw, 1280px"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        priority
                        onError={() => markThumbFailed(active.id)}
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35 transition-opacity duration-500 group-hover:opacity-90"
                    />
                    <span className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#E8231A] shadow-[0_18px_50px_-12px_rgba(232,35,26,0.85)] ring-1 ring-white/25 transition-transform duration-300 group-hover:scale-110">
                      <Play size={30} className="ml-0.5 text-white" fill="white" />
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Theater caption: title, chart data, up next, description, actions. */}
            <div className="chart-paper mt-4 rounded-[5px] border border-[#DCE7F1] p-5 sm:p-6">
              <p className="data-type flex items-center gap-2 text-[12px] font-bold uppercase text-[#E8231A]">
                <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
                  {playing && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8231A] opacity-75" />
                  )}
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E8231A]" />
                </span>
                {playing ? (isId ? "Sedang diputar" : "Now playing") : isId ? "Unggulan" : "Featured"}
              </p>
              <h2
                className="mt-2 text-balance text-xl font-black leading-snug tracking-tight text-[#0F1B33] sm:text-2xl"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                {active.title}
              </h2>
              <p className="data-type mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] uppercase text-[#8A9AAC]">
                {active.publishedAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={12} aria-hidden="true" />
                    {formatDate(active.publishedAt)}
                  </span>
                )}
                {formatViews(active.views) && (
                  <span className="flex items-center gap-1.5">
                    <Eye size={12} aria-hidden="true" />
                    {formatViews(active.views)} {isId ? "ditonton" : "views"}
                  </span>
                )}
              </p>

              {/* Up next: the queue position inside the current archive view. */}
              {upNext && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-[4px] border border-[#DCE7F1] bg-[#F5FAFD] px-3.5 py-2.5">
                  <p className="data-type min-w-0 truncate text-[12px] uppercase text-[#5B6B7C]">
                    <span className="font-bold text-[#E8231A]">
                      {isId ? "Berikutnya · " : "Up next · "}
                    </span>
                    <span className="font-medium normal-case text-[#0F1B33]">{upNext.title}</span>
                  </p>
                  <button
                    type="button"
                    onClick={playNext}
                    aria-label={`${isId ? "Putar berikutnya" : "Play next"}: ${upNext.title}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8231A] text-white transition-all hover:bg-[#C41E16] active:scale-95"
                  >
                    <SkipForward size={15} aria-hidden="true" />
                  </button>
                </div>
              )}

              {active.description && (
                <div className="mt-3">
                  <p
                    className={`whitespace-pre-line text-sm leading-relaxed text-[#5B6B7C] ${
                      descriptionOpen ? "" : "line-clamp-2"
                    }`}
                  >
                    {active.description}
                  </p>
                  {active.description.length > 160 && (
                    <button
                      type="button"
                      onClick={() => setDescriptionOpen((value) => !value)}
                      aria-expanded={descriptionOpen}
                      className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-semibold text-[#0F1B33] transition-colors hover:text-[#E8231A]"
                    >
                      {descriptionOpen ? (isId ? "Tutup" : "Show less") : isId ? "Selengkapnya" : "Read more"}
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className={`transition-transform ${descriptionOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#DCE7F1] pt-4">
                <button
                  type="button"
                  onClick={shareActive}
                  className="inline-flex items-center gap-2 rounded-full border border-[#C3D2E0] px-4 py-2 text-[13px] font-semibold text-[#0F1B33] transition-colors hover:border-[#E8231A] hover:text-[#E8231A]"
                >
                  {copied ? <Check size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
                  {copied ? (isId ? "Tautan disalin" : "Link copied") : isId ? "Bagikan" : "Share"}
                </button>
                <a
                  href={active.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-[#C3D2E0] px-4 py-2 text-[13px] font-semibold text-[#0F1B33] transition-colors hover:border-[#E8231A] hover:text-[#E8231A]"
                >
                  <Play size={14} aria-hidden="true" />
                  {isId ? "Buka di YouTube" : "Open in YouTube"}
                </a>
                <a
                  href={initialFeed?.channelUrl ?? "https://www.youtube.com/@ppiauckland2025"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#E8231A] px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-[#C41E16] active:scale-95"
                >
                  Subscribe
                </a>
              </div>
            </div>
          </section>

          {/* ── Archive grid: searchable, sortable, paginated. ── */}
          <section aria-label={isId ? "Arsip video" : "Video archive"} className="mt-14">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="data-type flex items-center gap-2.5 text-[12px] font-bold uppercase text-[#5B6B7C]">
                <span aria-hidden="true" className="h-px w-8 bg-[#E8231A]" />
                {isId ? "Jelajahi arsip" : "Browse the archive"}
              </p>
              <div className="flex shrink-0 items-center gap-4">
                <p className="data-type flex items-center gap-2 text-[12px] font-bold uppercase text-[#5B6B7C]">
                  <ListVideo size={14} aria-hidden="true" className="text-[#E8231A]" />
                  {isId ? `Semua video · ${videos.length}` : `All videos · ${videos.length}`}
                </p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoplayNext}
                  aria-label={isId ? "Putar otomatis video berikutnya" : "Autoplay next video"}
                  onClick={toggleAutoplayNext}
                  className="flex shrink-0 items-center gap-2"
                >
                  <span className="data-type text-[11px] font-bold uppercase text-[#5B6B7C]">Autoplay</span>
                  <span
                    aria-hidden="true"
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                      autoplayNext ? "bg-[#E8231A]" : "bg-[#C3D2E0] dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                        autoplayNext ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>
              </div>
            </div>

            {/* Archive toolbar: search the feed, order the shelf. */}
            <div className="chart-paper mb-6 flex flex-col gap-3 rounded-[5px] border border-[#DCE7F1] p-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9AAC]"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder={isId ? "Cari judul atau deskripsi…" : "Search titles and descriptions…"}
                  aria-label={isId ? "Cari video" : "Search videos"}
                  className="w-full rounded-[4px] border border-[#C3D2E0] bg-white/70 py-2.5 pl-10 pr-9 text-sm text-[#0F1B33] placeholder-[#8A9AAC] transition-colors focus:border-[#E8231A] focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => updateQuery("")}
                    aria-label={isId ? "Hapus pencarian" : "Clear search"}
                    className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#8A9AAC] transition-colors hover:bg-[#EDF5FB] hover:text-[#0F1B33]"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div
                role="group"
                aria-label={isId ? "Urutkan video" : "Sort videos"}
                className="flex shrink-0 items-center gap-1 rounded-[4px] border border-[#DCE7F1] bg-[#F5FAFD] p-1"
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSort(option.value)}
                    aria-pressed={sort === option.value}
                    className={`data-type rounded-[3px] px-3 py-1.5 text-[12px] font-bold uppercase transition-colors ${
                      sort === option.value
                        ? "bg-[#0F2438] text-white"
                        : "text-[#5B6B7C] hover:text-[#0F1B33]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {pageItems.length === 0 ? (
              <div className="chart-paper mx-auto max-w-xl rounded-[5px] border border-[#DCE7F1] p-10 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EDF5FB] text-[#5B6B7C]">
                  <SearchX size={26} aria-hidden="true" />
                </span>
                <h2
                  className="mt-5 text-xl font-black tracking-tight text-[#0F1B33]"
                  style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                >
                  {isId ? "Tidak ada video yang cocok" : "No matching videos"}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#5B6B7C]">
                  {isId
                    ? `Tidak ada hasil untuk "${query}". Coba kata kunci lain.`
                    : `No results for "${query}". Try different keywords.`}
                </p>
                <button
                  type="button"
                  onClick={() => updateQuery("")}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#E8231A] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C41E16]"
                >
                  {isId ? "Hapus pencarian" : "Clear search"}
                </button>
              </div>
            ) : (
              <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pageItems.map((video, index) => {
                  const isActive = video.id === active.id;
                  // Logbook numbering stays global so entries keep their
                  // identity across grid pages.
                  const entryNo = String((safePage - 1) * GRID_PAGE_SIZE + index + 1).padStart(2, "0");
                  return (
                    <li key={video.id} className="h-full">
                      <button
                        type="button"
                        onClick={() => playVideo(video.id)}
                        aria-current={isActive ? "true" : undefined}
                        aria-label={`${isId ? "Putar video" : "Play video"}: ${video.title}`}
                        className={`group flex h-full w-full flex-col overflow-hidden rounded-[5px] border text-left transition-all ${
                          isActive
                            ? "chart-paper border-[#E8231A]/50 shadow-[0_16px_40px_-20px_rgba(232,35,26,0.5)]"
                            : "chart-paper border-[#DCE7F1] hover:-translate-y-1 hover:border-[#9FB3C6] hover:shadow-lg"
                        }`}
                      >
                        <span className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-[#0F2438]">
                          {thumbFailedIds.has(video.id) ? (
                            <ThumbGhost label={`No. ${entryNo}`} />
                          ) : (
                            <Image
                              src={video.thumbnail}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              loading={Number(entryNo) <= 6 ? "eager" : "lazy"}
                              onError={() => markThumbFailed(video.id)}
                            />
                          )}
                          {/* Logbook entry number, where a duration badge sits. */}
                          <span
                            aria-hidden="true"
                            className="data-type absolute bottom-1.5 left-1.5 rounded-[3px] bg-black/70 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white"
                          >
                            {entryNo}
                          </span>
                          <span
                            aria-hidden="true"
                            className={`absolute inset-0 flex items-center justify-center transition-colors ${
                              isActive ? "bg-black/40" : "bg-black/0 group-hover:bg-black/30"
                            }`}
                          >
                            <span
                              className={`flex h-11 w-11 items-center justify-center rounded-full bg-[#E8231A] shadow-lg transition-all ${
                                isActive ? "scale-100 opacity-100" : "scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                              }`}
                            >
                              <Play size={17} className="ml-0.5 text-white" fill="white" />
                            </span>
                          </span>
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col p-4">
                          {isActive && (
                            <span className="data-type mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase text-[#E8231A]">
                              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                                {playing && (
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8231A] opacity-75" />
                                )}
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E8231A]" />
                              </span>
                              {playing
                                ? isId
                                  ? "Diputar"
                                  : "Playing"
                                : isId
                                  ? "Dipilih"
                                  : "Selected"}
                            </span>
                          )}
                          <span
                            className="line-clamp-2 text-[15px] font-bold leading-snug text-[#0F1B33] transition-colors group-hover:text-[#E8231A]"
                            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                          >
                            {video.title}
                          </span>
                          <span className="data-type mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-2 text-[11px] uppercase text-[#8A9AAC]">
                            {video.publishedAt && <span>{formatDate(video.publishedAt)}</span>}
                            {video.publishedAt && formatViews(video.views) && (
                              <span aria-hidden="true">·</span>
                            )}
                            {formatViews(video.views) && (
                              <span>
                                {formatViews(video.views)} {isId ? "ditonton" : "views"}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Grid pager: nine entries per page, chart-paper instrument. */}
            {totalPages > 1 && pageItems.length > 0 && (
              <div className="chart-paper mx-auto mt-8 flex max-w-xl items-center justify-between gap-2 rounded-[5px] border border-[#DCE7F1] px-3 py-2">
                <button
                  type="button"
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage === 1}
                  aria-label={isId ? "Halaman sebelumnya" : "Previous page"}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] text-[#5B6B7C] transition-colors hover:bg-[#EDF5FB] hover:text-[#0F1B33] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#5B6B7C]"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
                {totalPages <= 5 ? (
                  <div
                    className="flex items-center gap-1"
                    role="group"
                    aria-label={isId ? "Pilih halaman" : "Choose page"}
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => goToPage(p)}
                        aria-current={p === safePage ? "page" : undefined}
                        aria-label={`${isId ? "Halaman" : "Page"} ${p}`}
                        className={`data-type h-8 min-w-8 rounded-[3px] px-2 text-[12px] font-bold tabular-nums transition-colors ${
                          p === safePage
                            ? "bg-[#E8231A] text-white"
                            : "text-[#5B6B7C] hover:bg-[#EDF5FB] hover:text-[#0F1B33]"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="data-type text-[11px] font-bold uppercase tabular-nums text-[#5B6B7C]">
                    {safePage} / {totalPages}
                  </p>
                )}
                <p className="data-type hidden text-[11px] uppercase tabular-nums text-[#8A9AAC] sm:block">
                  {isId
                    ? `${rangeStart}–${rangeEnd} dari ${visible.length}`
                    : `${rangeStart}–${rangeEnd} of ${visible.length}`}
                </p>
                <button
                  type="button"
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  aria-label={isId ? "Halaman berikutnya" : "Next page"}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] text-[#5B6B7C] transition-colors hover:bg-[#EDF5FB] hover:text-[#0F1B33] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#5B6B7C]"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </section>

          {/* Subscribe berth: never miss the next upload. */}
          <section
            aria-label="Subscribe"
            className="sea-deep relative mt-14 overflow-hidden rounded-[10px] px-6 py-12 text-center sm:px-12"
          >
            <div
              aria-hidden="true"
              className="sea-chart-light pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{
                maskImage: "radial-gradient(ellipse 70% 80% at 50% 40%, black 20%, transparent 80%)",
                WebkitMaskImage: "radial-gradient(ellipse 70% 80% at 50% 40%, black 20%, transparent 80%)",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-0 h-56 w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.16]"
              style={{ background: "radial-gradient(circle, #E8231A 0%, transparent 65%)" }}
            />
            <div className="relative">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8231A] text-white shadow-[0_18px_50px_-12px_rgba(232,35,26,0.85)]">
                <Bell size={22} aria-hidden="true" />
              </span>
              <h2
                className="mx-auto mt-5 max-w-xl text-balance text-2xl font-black tracking-tight text-white sm:text-3xl"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                {isId ? "Jangan ketinggalan episode baru" : "Never miss a new episode"}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/70">
                {isId
                  ? "Subscribe channel YouTube kami — Navigasi, film wisuda, dan webinar terbaru langsung masuk beranda Anda."
                  : "Subscribe to our YouTube channel — Navigasi, graduation films and the latest webinars, straight to your feed."}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <a
                  href={initialFeed?.channelUrl ?? "https://www.youtube.com/@ppiauckland2025"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#E8231A] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#C41E16] active:scale-95"
                >
                  <Play size={15} aria-hidden="true" />
                  Subscribe
                </a>
                <a
                  href={initialFeed?.channelUrl ?? "https://www.youtube.com/@ppiauckland2025"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:border-white/40 hover:text-white"
                >
                  {isId ? "Kunjungi channel" : "Visit channel"}
                </a>
              </div>
            </div>
          </section>
        </div>
      </section>

      <WaveTransition from={SHORE} to={FOOTER_SEA} mirror />
    </>
  );
}
