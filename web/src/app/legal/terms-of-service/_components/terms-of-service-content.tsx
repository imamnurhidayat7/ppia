"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { GenericPageSkeleton } from "@/components/skeletons/public-skeletons";
import WaveTransition from "@/components/sections/WaveTransition";
import api from "@/lib/api";
import RichText from "@/components/RichText";

interface LegalContent {
  header: { label: string; title: string; titleAccent: string; description: string; breadcrumbs: { label: string }[] };
  sections: { id: number; title: string; body: string }[];
}

/** Seam colours, matching the ends of the .sea-deep / .sea-shore gradients. */
const DEEP = "#0B1C2E";
const SHORE = "#FFFFFF";

/** Filed documents carry a New Zealand date, set in the data face. */
const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };

export default function TermsOfServicePage() {
  const [content, setContent] = useState<LegalContent | null>(null);

  useEffect(() => {
    api.getPageBySlug("legal/terms-of-service")
      .then((res) => {
        const value = res?.page?.content as Partial<LegalContent> | undefined;
        if (value?.header && Array.isArray(value.sections)) setContent(value as LegalContent);
      })
      .catch(() => undefined);
  }, []);

  if (!content) return <GenericPageSkeleton />;

  // Rendered only after the content resolves on the client, so formatting the
  // current date here cannot desync from the server-rendered markup.
  const lastUpdated = new Date().toLocaleDateString("en-NZ", DATE_FORMAT);

  return (
    <>
      <PageHeader {...content.header} />
      <WaveTransition from={DEEP} to={SHORE} mirror />

      {/*
        The terms are one filed sheet rather than a run of loose prose: a single
        piece of chart paper with a stamped file header, a numbered contents
        block, and rope hairlines where the sheet needs an edge.
      */}
      <section className="sea-shore relative overflow-hidden py-16">
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
          <article className="chart-paper rounded-[5px] border border-[#DCE7F1] p-7 shadow-[0_26px_66px_-34px_rgba(7,19,33,0.4)] sm:p-10">
            <header>
              <div className="flex items-start justify-between gap-4">
                <span className="data-type text-[12px] font-bold uppercase accent-label">
                  {content.header.label}
                </span>
                <span
                  aria-hidden="true"
                  className="stamp-edge flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px]"
                  style={{ color: "rgba(15,27,51,0.35)" }}
                >
                  <Scale size={13} strokeWidth={2.5} className="text-[#0F1B33]/70" />
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <dt className="data-type text-[12px] uppercase ink-muted">Sections</dt>
                  <dd className="data-type mt-1 text-sm font-semibold text-[#0F1B33]">
                    {String(content.sections.length).padStart(2, "0")}
                  </dd>
                </div>
                <div>
                  <dt className="data-type text-[12px] uppercase ink-muted">Last updated</dt>
                  <dd className="data-type mt-1 text-sm font-semibold text-[#0F1B33]">{lastUpdated}</dd>
                </div>
              </dl>

              <span aria-hidden="true" className="rope-rule mt-6 block opacity-70" />
            </header>

            {content.sections.length > 0 && (
              <nav aria-label="Contents" className="mt-6">
                <p className="data-type text-[12px] uppercase ink-muted">Contents</p>
                <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                  {content.sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#section-${section.id}`}
                        className="flex items-baseline gap-2.5 rounded-[3px] text-sm ink-body transition-colors hover:text-[#0F1B33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8231A]/45"
                      >
                        <span className="data-type shrink-0 text-[12px] uppercase ink-muted">
                          {String(section.id).padStart(2, "0")}
                        </span>
                        <span className="leading-snug">{section.title}</span>
                      </a>
                    </li>
                  ))}
                </ol>
                <span aria-hidden="true" className="rope-rule mt-6 block opacity-70" />
              </nav>
            )}

            <div className="mt-8 space-y-9">
              {content.sections.map((section) => (
                <section key={section.id} id={`section-${section.id}`} className="scroll-mt-28">
                  <h2
                    className="flex items-baseline gap-3 text-lg font-bold leading-snug text-[#0F1B33]"
                    style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                  >
                    <span className="data-type shrink-0 text-[12px] font-bold uppercase accent-label">
                      {String(section.id).padStart(2, "0")}
                    </span>
                    {section.title}
                  </h2>
                  <RichText
                    html={section.body}
                    className="prose prose-gray mt-3 max-w-none ink-body prose-headings:text-[#0F1B33] prose-a:accent-label"
                  />
                </section>
              ))}
            </div>

            <footer className="mt-10">
              <span aria-hidden="true" className="rope-rule block opacity-70" />
              <p className="mt-4 text-xs ink-muted">
                Last updated: <span className="data-type">{lastUpdated}</span>
              </p>
            </footer>
          </article>
        </div>
      </section>
    </>
  );
}
