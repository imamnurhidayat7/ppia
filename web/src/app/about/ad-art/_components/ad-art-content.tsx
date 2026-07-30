"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHeader from "@/components/PageHeader";
import { PublicPageSkeleton } from "@/components/skeletons/public-skeletons";
import WaveTransition from "@/components/sections/WaveTransition";
import { ChevronDown, Scale, Users, FileText, Calendar, Flag, Shield, Gavel } from "lucide-react";
import api from "@/lib/api";

/** Seam colours, matching the ends of the .sea-deep / .sea-shore gradients. */
const DEEP = "#0B1C2E";
const SHORE = "#FFFFFF";

interface Article { id: string; chapter: string; title: string; articles: { num: string; title: string; content?: string }[] }
interface Content {
  header: { label: string; title: string; titleAccent: string; description: string; breadcrumbs: { label: string }[] };
  /** Pembukaan — the preamble to the Anggaran Dasar. Optional so older CMS rows still render. */
  preamble?: string;
  adArticles: Article[];
  artArticles?: Article[];
}
// `data` marks the readings that are figures or dates, so they are set in the
// data face while the prose entries stay in the text face.
const keyPoints = [
  { icon: Flag, label: "Asas", value: "Pancasila & UUD 1945", color: "#E8231A" }, { icon: Calendar, label: "Didirikan", value: "28 Oktober 2018", color: "#3B82F6", data: true }, { icon: Users, label: "Keanggotaan", value: "Pelajar Indonesia di Auckland", color: "#10B981" }, { icon: Scale, label: "Hierarki", value: "AD-ART → Kongres → Ketua Umum", color: "#8B5CF6" }, { icon: Gavel, label: "Kuorum", value: "80% Perwakilan", color: "#F59E0B", data: true }, { icon: Shield, label: "Pengganti", value: "2/3 Suara", color: "#06B6D4", data: true },
];

/**
 * One chapter of the statutes, as a sheet of chart paper.
 *
 * The chapter marker is a porthole rather than a rounded square, and the
 * article numbers are set in the data face, so a chapter reads as a logbook
 * entry instead of a generic FAQ row.
 */
function ArticleAccordion({ article, index }: { article: Article; index: number }) {
  const [open, setOpen] = useState(false);
  const panelId = `chapter-${index}-panel`;

  return (
    <div className="border-b border-[#DCE7F1] last:border-b-0 dark:border-white/10">
      {/* A rectangular chapter plate, not a circular badge.
          "BAB VIII" cannot fit inside a 48px circle: it wrapped onto two lines
          and pushed out of the ring. A plate sized by its content holds any
          numeral, and `whitespace-nowrap` keeps it on one line. */}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[#F5FAFD] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#E8231A] sm:gap-5 sm:px-6 dark:hover:bg-white/[0.04]"
      >
        <span
          aria-hidden="true"
          className={
            open
              // White on #C41E16 is 5.9:1; on the brand #E8231A it would be 4.48:1.
              // Same pairing in both themes, so no dark variant is needed here.
              ? "data-type shrink-0 whitespace-nowrap rounded-[3px] border border-[#C41E16] bg-[#C41E16] px-2.5 py-1.5 text-[12px] font-bold uppercase text-white transition-colors"
              : // Closed chip: this pale pink-on-white pairing was hard-coded for
                // the light card only. On the dark card (#0F1B2B) it painted a
                // near-white tile with barely-visible text, which is the bug in
                // the screenshot — a light plate that looked "stuck on" mid-list.
                "data-type shrink-0 whitespace-nowrap rounded-[3px] border border-[#F3C9C6] bg-[#FEF2F1] px-2.5 py-1.5 text-[12px] font-bold uppercase text-[#B01812] transition-colors dark:border-[#E8231A]/35 dark:bg-[#E8231A]/12 dark:text-[#FF8A80]"
          }
        >
          {article.chapter}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold ink-strong">{article.title}</span>
          <span className="data-type mt-1 block text-[12px] uppercase ink-muted">
            {String(article.articles.length).padStart(2, "0")}{" "}
            {article.articles.length === 1 ? "article" : "articles"}
          </span>
        </span>

        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`shrink-0 ink-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {/* Articles are indented under the chapter and hung off a rope, so
                the hierarchy is visible without a second card. */}
            <ol className="relative space-y-5 pb-6 pl-[4.4rem] pr-5 pt-1 sm:pl-[5.2rem] sm:pr-6">
              <span
                aria-hidden="true"
                className="rope-line-v absolute bottom-6 left-[3.1rem] top-2 w-[2px] rounded-full sm:left-[3.9rem]"
              />
              {article.articles.map((item) => (
                <li key={item.num}>
                  <p className="data-type text-[12px] uppercase ink-muted">{item.num}</p>
                  <h4 className="mt-1 font-semibold leading-snug ink-strong">{item.title}</h4>
                  {item.content && (
                    <p className="mt-1.5 text-sm leading-relaxed ink-body">{item.content}</p>
                  )}
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdArtPage() {
  const [content, setContent] = useState<Content | null>(null);
  useEffect(() => {
    api.getPageBySlug("about/ad-art").then((res) => {
      const value = res?.page?.content as Content | undefined;
      if (value?.header && Array.isArray(value.adArticles)) setContent(value);
    }).catch(() => undefined);
  }, []);
  if (!content) return <PublicPageSkeleton />;
  return (
    <>
      <PageHeader {...content.header} />

      {/* Key points, below the waterline: instrument readings on the bridge. */}
      <section className="sea-deep relative overflow-hidden py-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart-light absolute inset-0 opacity-[0.05]"
            style={{
              maskImage: "radial-gradient(ellipse 78% 70% at 50% 45%, transparent 20%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 78% 70% at 50% 45%, transparent 20%, black 85%)",
            }}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {keyPoints.map((kp) => (
              <div
                key={kp.label}
                className="rounded-[5px] border border-white/10 bg-white/5 p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-white/20"
              >
                <span
                  className="mx-auto flex h-11 w-11 items-center justify-center rounded-full"
                  style={{
                    background: `${kp.color}1F`,
                    boxShadow: `inset 0 0 0 1px ${kp.color}33, 0 0 0 4px ${kp.color}0F`,
                  }}
                >
                  <kp.icon size={20} style={{ color: kp.color }} />
                </span>
                <p className="data-type mt-3 text-[12px] uppercase ink-muted">{kp.label}</p>
                <p className={`mt-1 font-semibold text-white ${kp.data ? "data-type text-xs" : "text-sm"}`}>{kp.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WaveTransition from={DEEP} to={SHORE} mirror />

      {/* The statutes themselves, back above the waterline. */}
      <section className="sea-shore relative overflow-hidden py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart absolute inset-0 opacity-[0.04]"
            style={{
              maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, transparent 20%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, transparent 20%, black 85%)",
            }}
          />
        </div>
        <div className="relative mx-auto max-w-4xl px-6">
          {/*
            Pembukaan (preamble). Read aloud before either document, so it sits
            here as its own plate rather than inside the AD chapters — it isn't
            "Pasal 1", it's the reasoning the whole statute answers to. Set as a
            quote (a rope-rule spine on the left, not article numbering) so it
            reads as prose rather than as another logbook row. Only rendered
            when the CMS carries it, so a page without a preamble degrades
            gracefully.
          */}
          {content.preamble && (
            <div className="chart-paper relative mb-10 overflow-hidden rounded-[5px] border border-[#DCE7F1] p-7 shadow-[0_24px_60px_-34px_rgba(7,19,33,0.4)] sm:p-9">
              <span aria-hidden="true" className="rope-line-v absolute bottom-7 left-7 top-7 w-[2px] rounded-full sm:left-9" />
              <p className="data-type text-[12px] font-bold uppercase accent-label">Pembukaan</p>
              <p className="mt-4 whitespace-pre-line pl-6 text-[15px] italic leading-relaxed ink-body sm:pl-8">
                {content.preamble}
              </p>
            </div>
          )}

          {/* File header for the bundle of chapters: stamped, with the chapter
              count as metadata rather than as a heading. The document name
              (AD vs ART) is spelled out here in full, in the title face — the
              two used to share the identical eyebrow label ("About PPIA"), so
              nothing on the page said which bound document you were reading. */}
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <span className="data-type text-[12px] font-bold uppercase accent-label">{content.header.label}</span>
              <h2 className="mt-1.5 text-xl font-black leading-snug ink-strong sm:text-2xl" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
                Anggaran Dasar <span className="ink-muted">(AD)</span>
              </h2>
              <p className="data-type mt-2 flex items-center gap-2 text-[12px] uppercase ink-muted">
                <span>{String(content.adArticles.length).padStart(2, "0")} chapters</span>
                <span aria-hidden="true" className="rope-rule h-px w-6 opacity-70" />
                <span>
                  {String(content.adArticles.reduce((sum, a) => sum + a.articles.length, 0)).padStart(2, "0")} articles
                </span>
              </p>
            </div>
            <span
              aria-hidden="true"
              className="stamp-edge flex h-10 w-10 shrink-0 rotate-[-8deg] items-center justify-center rounded-[2px]"
              style={{ color: "rgba(15,27,51,0.32)" }}
            >
              <FileText size={14} strokeWidth={2.5} className="text-[#0F1B33]/70" />
            </span>
          </div>
          {/* One bound document with ruled rows, rather than a stack of
              floating cards. The chapters are parts of a single statute, so
              they should read as one filed sheet — and it removes the ragged
              gaps the separate cards left between chapters. */}
          <div className="chart-paper overflow-hidden rounded-[5px] border border-[#DCE7F1] shadow-[0_24px_60px_-34px_rgba(7,19,33,0.4)] dark:border-white/10">
            <div className="flex items-center justify-between gap-4 border-b border-[#DCE7F1] bg-[#F5FAFD] px-5 py-3 sm:px-6 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="data-type text-[12px] font-bold uppercase ink-muted">Chapter</p>
              <p className="data-type text-[12px] uppercase ink-muted">Articles</p>
            </div>

            {content.adArticles.map((article, i) => (
              <ArticleAccordion key={article.id} article={article} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ART (Anggaran Rumah Tangga) — the bylaws, presented in the same
          filed-sheet design as AD so the two read as one statute bundle.
          Only rendered when the CMS carries artArticles, so a page with AD
          alone degrades gracefully. */}
      {content.artArticles && content.artArticles.length > 0 && (
        <>
          <WaveTransition from={SHORE} to={DEEP} />

          <section className="sea-deep relative overflow-hidden py-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="sea-chart absolute inset-0 opacity-[0.04]"
            style={{
              maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, transparent 20%, black 85%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, transparent 20%, black 85%)",
            }}
          />
        </div>
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <span className="data-type text-[12px] font-bold uppercase accent-label">{content.header.label}</span>
              <h2 className="mt-1.5 text-xl font-black leading-snug text-white sm:text-2xl" style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
                Anggaran Rumah Tangga <span className="text-white/50">(ART)</span>
              </h2>
              <p className="data-type mt-2 flex items-center gap-2 text-[12px] uppercase text-white/60">
                <span>{String(content.artArticles.length).padStart(2, "0")} chapters</span>
                <span aria-hidden="true" className="h-px w-6 bg-white/25" />
                <span>
                  {String(content.artArticles.reduce((sum, a) => sum + a.articles.length, 0)).padStart(2, "0")} articles
                </span>
              </p>
            </div>
            <span
              aria-hidden="true"
              className="stamp-edge flex h-10 w-10 shrink-0 rotate-[-8deg] items-center justify-center rounded-[2px]"
              style={{ color: "rgba(15,27,51,0.32)" }}
            >
              <Gavel size={14} strokeWidth={2.5} className="text-[#0F1B33]/70" />
            </span>
          </div>
          <div className="chart-paper overflow-hidden rounded-[5px] border border-[#DCE7F1] shadow-[0_24px_60px_-34px_rgba(7,19,33,0.4)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#DCE7F1] bg-[#F5FAFD] px-5 py-3 sm:px-6">
              <p className="data-type text-[12px] font-bold uppercase ink-muted">Chapter</p>
              <p className="data-type text-[12px] uppercase ink-muted">Articles</p>
            </div>

            {content.artArticles.map((article, i) => (
              <ArticleAccordion key={article.id} article={article} index={i} />
            ))}
          </div>
        </div>
      </section>
        </>
      )}
    </>
  );
}
