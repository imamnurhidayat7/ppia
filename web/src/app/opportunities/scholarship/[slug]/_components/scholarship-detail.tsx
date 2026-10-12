"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, CheckCircle, ExternalLink, Star } from "lucide-react";
import WaveTransition from "@/components/sections/WaveTransition";
import type { PublicScholarship } from "@/lib/server-api";

const DEEP = "#0B1C2E";
const SHORE = "#FFFFFF";

const CARD =
  "chart-paper rounded-[5px] border border-[#DCE7F1]";

const TYPE_LABELS: Record<string, string> = {
  INDONESIAN_GOV: "Indonesian Gov",
  NZ_GOV: "NZ Gov",
  UNIVERSITY: "University",
};

function typeLabel(type?: string): string {
  if (!type) return "Scholarship";
  return TYPE_LABELS[type] ?? type;
}

const DEADLINE_PARTS: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };

function deadlineBoard(deadline: string): { day: string; month: string; year: string } | null {
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-NZ", DEADLINE_PARTS).formatToParts(parsed);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const day = pick("day");
  const month = pick("month");
  const year = pick("year");
  if (!day || !month || !year) return null;
  return { day, month, year };
}

function useCountdown(targetDate: string) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    if (Number.isNaN(target)) return;

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return countdown;
}

function DeadlineCountdown({ deadline }: { deadline: string }) {
  const countdown = useCountdown(deadline);
  const isExpired =
    countdown.days === 0 && countdown.hours === 0 && countdown.minutes === 0 && countdown.seconds === 0;
  const isUrgent = countdown.days < 30;

  if (isExpired) return <span className="text-sm text-slate-400">Check the official website</span>;

  return (
    <div className="flex items-baseline justify-center gap-2 text-sm" aria-live="off">
      {countdown.days > 0 && (
        <span className={`font-black ${isUrgent ? "text-[#E8231A]" : "text-[#0F1B33]"}`}>
          {countdown.days}d
        </span>
      )}
      <span className={isUrgent ? "text-[#E8231A]" : "text-slate-600"}>{countdown.hours}h</span>
      <span className={isUrgent ? "text-[#E8231A]" : "text-slate-600"}>{countdown.minutes}m</span>
      <span className="text-slate-400">{countdown.seconds}s</span>
    </div>
  );
}

export default function ScholarshipDetail({ scholarship }: { scholarship: PublicScholarship }) {
  const color = scholarship.color || "#3B82F6";
  const displayDeadline = scholarship.deadline || scholarship.deadlineDate || "";
  const board = displayDeadline ? deadlineBoard(displayDeadline) : null;
  const exactDate = scholarship.deadlineDate || (board ? displayDeadline : null);

  return (
    <>
      <header className="sea-deep relative overflow-hidden pb-16 pt-32">
        <div
          aria-hidden="true"
          className="sea-chart-light pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            maskImage: "radial-gradient(ellipse 80% 75% at 30% 45%, transparent 15%, black 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 75% at 30% 45%, transparent 15%, black 85%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <Link
            href="/opportunities/scholarship"
            className="data-type mb-7 inline-flex items-center gap-2 text-[12px] uppercase text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            All scholarships
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {scholarship.featured && (
              <span
                className="data-type flex items-center gap-1 rounded-[3px] px-2 py-0.5 text-[12px] font-bold uppercase"
                style={{ background: `${color}25`, color: "#fff" }}
              >
                <Star size={11} aria-hidden="true" />
                Recommended
              </span>
            )}
            <span
              className="data-type rounded-[3px] px-2 py-0.5 text-[12px] font-bold uppercase"
              style={{ background: `${color}25`, color: "#fff" }}
            >
              {typeLabel(scholarship.type)}
            </span>
            {(scholarship.level ?? []).map((l) => (
              <span
                key={l}
                className="data-type rounded-[3px] border border-white/20 px-2 py-0.5 text-[12px] font-bold uppercase text-white/80"
              >
                {l}
              </span>
            ))}
          </div>

          <h1
            className="mt-4 max-w-3xl text-balance font-black leading-[1.05] tracking-[-0.03em] text-white"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontFamily: "var(--font-poppins), Poppins, sans-serif",
            }}
          >
            {scholarship.name}
          </h1>
          {scholarship.provider && (
            <p className="data-type mt-3 text-[12px] uppercase text-white/60">{scholarship.provider}</p>
          )}
        </div>
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />
      </header>

      <WaveTransition from={DEEP} to={SHORE} />

      <section className="sea-shore relative overflow-hidden py-16">
        <div
          aria-hidden="true"
          className="sea-chart pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 35%, transparent 25%, black 90%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 35%, transparent 25%, black 90%)",
          }}
        />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <div className={`${CARD} overflow-hidden`}>
              <div aria-hidden="true" className="h-[3px]" style={{ background: color }} />
              <div className="p-6 md:p-8">
                {scholarship.desc && (
                  <>
                    <h2
                      className="font-black text-[#0F1B33]"
                      style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                    >
                      About this scholarship
                    </h2>
                    <p className="ink-body mt-3 text-[15px] leading-relaxed">{scholarship.desc}</p>
                  </>
                )}

                {(scholarship.coverage ?? []).length > 0 && (
                  <>
                    <h2
                      className="mt-8 font-black text-[#0F1B33]"
                      style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                    >
                      What it covers
                    </h2>
                    <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                      {(scholarship.coverage ?? []).map((c) => (
                        <li key={c} className="flex items-center gap-2 text-sm font-medium ink-body">
                          <CheckCircle size={14} style={{ color }} aria-hidden="true" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <span aria-hidden="true" className="rope-rule my-6 block opacity-70" />

                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="data-type text-[12px] uppercase ink-muted">Amount</dt>
                    <dd className="data-type mt-1 text-[13px] font-bold uppercase text-[#0F1B33]">
                      {scholarship.amount || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="data-type text-[12px] uppercase ink-muted">Study levels</dt>
                    <dd className="data-type mt-1 text-[13px] font-bold uppercase text-[#0F1B33]">
                      {(scholarship.level ?? []).join(" • ") || "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col gap-4"
          >
            <div className={`${CARD} px-5 py-5 text-center`}>
              <p className="data-type text-[12px] uppercase ink-muted">Deadline</p>
              {board ? (
                <>
                  <p className="data-type mt-1 text-5xl font-black leading-none" style={{ color }}>
                    {board.day}
                  </p>
                  <p className="data-type mt-1.5 text-[12px] font-bold uppercase ink-body">
                    {board.month} {board.year}
                  </p>
                </>
              ) : (
                <p className="data-type mt-2 text-[13px] font-bold uppercase leading-snug text-[#0F1B33]">
                  {displayDeadline || "Check the official website"}
                </p>
              )}
              {exactDate && (
                <div className="mt-3 border-t border-[#E7EFF7] pt-3">
                  <DeadlineCountdown deadline={exactDate} />
                </div>
              )}
            </div>

            {scholarship.url ? (
              <a
                href={scholarship.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-[4px] px-5 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:gap-3 hover:brightness-95"
                style={{ background: color }}
              >
                Apply / Learn More
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ) : null}

            <Link
              href="/opportunities/scholarship"
              className="flex items-center justify-center gap-2 rounded-[4px] border border-[#C3D2E0] bg-white/70 px-5 py-3 text-sm font-semibold text-[#0F1B33] transition-colors hover:border-[#E8231A] hover:text-[#E8231A]"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Back to all scholarships
            </Link>
          </motion.aside>
        </div>
      </section>
    </>
  );
}
