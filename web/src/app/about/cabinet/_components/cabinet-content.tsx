"use client";

/**
 * Cabinet — the people behind PPIA Auckland.
 *
 * Layout decisions worth knowing before changing this file:
 *
 * • People are the content, so photos are visible by default. The previous
 *   version hid every member inside a collapsed accordion, which meant a page
 *   whose entire purpose is "who runs this" showed nothing but division names
 *   until you clicked each one.
 *
 * • Office bearers sit above the divisions in large portrait cards, because
 *   "who is the president" is the single most common question this page answers.
 *
 * • Divisions are one flat list. The old internal/external split forced every
 *   division into one of two buckets and doubled the headings for no gain.
 *
 * • Every photo is optional. A member with no photo gets initials on the
 *   division's colour, so a half-populated cabinet still looks deliberate. The
 *   same applies when an image URL 404s — see `Avatar`.
 *
 * Content shape is defined by `division_grid` in `web/src/lib/content-schemas.ts`
 * and seeded from `api/prisma/page-content.ts`.
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import { Mail, Users } from "lucide-react";
import api from "@/lib/api";
import { getImageUrl } from "@/lib/utils";

interface Person {
  name: string;
  role?: string;
  photo?: string;
}

interface Leader extends Person {
  /** 'chair' renders large and alone; anything else joins the executive row. */
  tier?: string;
  major?: string;
  quote?: string;
  email?: string;
}

interface DivisionGroup {
  key: string;
  label?: string;
  description?: string;
}

interface Division {
  id: string;
  name: string;
  color: string;
  desc: string;
  /** Code of the DivisionGroup this division reports to. */
  group?: string;
  head?: Person;
  deputy?: Person;
  members: Person[];
}

interface SectionHeadingContent {
  label?: string;
  title?: string;
  titleAccent?: string;
  description?: string;
}

interface CabinetContent {
  header: {
    label: string;
    title: string;
    titleAccent: string;
    description: string;
    breadcrumbs: { label: string }[];
  };
  stats?: { valueStatic?: string; valueLabel: string }[];
  leadershipSection?: SectionHeadingContent;
  leaders?: Leader[];
  divisionsSection?: SectionHeadingContent;
  divisionGroups?: DivisionGroup[];
  divisions?: Division[];
  cta: { title: string; description: string; buttonText: string; buttonHref: string };
  /** Legacy shape, still read so the page never blanks on un-migrated rows. */
  internalDepartments?: Division[];
  externalDepartments?: Division[];
}

const FALLBACK_COLOR = "#E8231A";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Photo with an initials fallback.
 *
 * The fallback covers three cases that all look identical to a visitor: no
 * photo uploaded, an empty string saved by the CMS, and a URL that fails to
 * load. Tracking the load failure in state matters because a broken <img> would
 * otherwise show the browser's placeholder icon inside a styled card.
 */
function Avatar({
  person,
  color,
  className = "",
  textClassName = "",
}: {
  person: Person;
  color: string;
  className?: string;
  textClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = person.photo ? getImageUrl(person.photo) || person.photo : "";
  const showPhoto = !!src && !failed;

  if (showPhoto) {
    return (
      // `fill` needs a positioned ancestor; every caller renders this inside a
      // sized, relative wrapper. onError falls back to the initials tile below,
      // which matters because committee photos are entered by hand in the CMS.
      <Image
        src={src}
        alt={person.name}
        fill
        sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 50vw"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{ background: `linear-gradient(145deg, ${color}, ${color}B3)` }}
      aria-hidden="true"
    >
      <span
        className={`font-black text-white/95 ${textClassName}`}
        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
      >
        {initialsOf(person.name)}
      </span>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="text-center"
    >
      <p
        className="text-[clamp(1.75rem,4vw,3rem)] font-black leading-none tracking-[-0.03em] text-[#0F1B33]"
        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
      >
        {value}
      </p>
      <p className="mt-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#94A3B8]">
        {label}
      </p>
    </motion.div>
  );
}

/** Shared eyebrow + heading, matching the landing page treatment. */
function Heading({
  section,
  align = "left",
  tone = "light",
}: {
  section: SectionHeadingContent;
  align?: "left" | "center";
  tone?: "light" | "dark";
}) {
  const centered = align === "center";
  return (
    <div className={`${centered ? "mx-auto text-center" : ""} mb-12 max-w-3xl`}>
      {section.label && (
        <span
          className={`inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#E8231A] ${
            centered ? "justify-center" : ""
          }`}
        >
          <span aria-hidden="true" className="h-px w-7 bg-[#E8231A] opacity-50" />
          {section.label}
        </span>
      )}
      <h2
        className={`mt-4 text-[clamp(1.875rem,4.5vw,3rem)] font-black leading-[1.05] tracking-[-0.03em] ${
          tone === "dark" ? "text-white" : "text-[#0F1B33]"
        }`}
        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
      >
        {section.title}
        {section.titleAccent && (
          <>
            {section.title ? " " : ""}
            <span className="gradient-text">{section.titleAccent}</span>
          </>
        )}
      </h2>
      {section.description && (
        <p
          className={`mt-5 text-[17px] leading-relaxed ${
            tone === "dark" ? "text-white/60" : "text-[#64748B]"
          }`}
        >
          {section.description}
        </p>
      )}
    </div>
  );
}

/**
 * Office bearer card — portrait photo with the name laid over a scrim.
 *
 * A 4:5 crop is used rather than a square: it reads as a formal portrait and
 * gives the caption room to sit over the image without covering the face.
 */
function LeaderCard({ leader, index }: { leader: Leader; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group overflow-hidden rounded-3xl border border-[#E7EDF4] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_34px_80px_-32px_rgba(15,27,51,0.35)]"
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: "4/5" }}>
        <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]">
          <Avatar person={leader} color={FALLBACK_COLOR} textClassName="text-6xl" />
        </div>

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#0B1220] via-[#0B1220]/25 to-transparent"
        />

        <div className="absolute inset-x-0 bottom-0 p-6">
          {leader.role && (
            <span className="mb-2.5 inline-block rounded-full bg-[#E8231A] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
              {leader.role}
            </span>
          )}
          <h3
            className="text-2xl font-black leading-tight tracking-[-0.02em] text-white"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
          >
            {leader.name}
          </h3>
          {leader.major && (
            <p className="mt-1.5 text-sm leading-snug text-white/65">{leader.major}</p>
          )}
        </div>
      </div>

      {(leader.quote || leader.email) && (
        <div className="space-y-4 p-6">
          {leader.quote && (
            <p className="text-sm leading-relaxed text-[#64748B]">&ldquo;{leader.quote}&rdquo;</p>
          )}
          {leader.email && (
            <a
              href={`mailto:${leader.email}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#E8231A] transition-colors hover:text-[#C41E16]"
            >
              <Mail size={14} />
              {leader.email}
            </a>
          )}
        </div>
      )}
    </motion.article>
  );
}

/**
 * Executive officer card — the tier between the chair and the divisions.
 *
 * Deliberately smaller than the chair card and larger than a division member,
 * so the three levels of the organisation chart are legible from card size
 * alone without drawing connector lines.
 */
function OfficerCard({ officer, index }: { officer: Leader; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: Math.min(index, 6) * 0.06 }}
      className="group overflow-hidden rounded-2xl border border-[#E7EDF4] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_24px_60px_-26px_rgba(15,27,51,0.3)]"
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: "1/1" }}>
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.05]">
          <Avatar person={officer} color={FALLBACK_COLOR} textClassName="text-3xl" />
        </div>
      </div>
      <div className="p-4 text-center">
        <p className="text-sm font-bold leading-snug text-[#0F1B33]">{officer.name}</p>
        {officer.role && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#E8231A]">
            {officer.role}
          </p>
        )}
      </div>
    </motion.article>
  );
}

/** Square tile for a division member. `lead` sizes it up for head / vice head. */
function MemberCard({
  member,
  color,
  index,
  lead = false,
}: {
  member: Person;
  color: string;
  index: number;
  lead?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.05 }}
      className="group text-center"
    >
      <div
        className={`relative mx-auto mb-3.5 aspect-square w-full overflow-hidden bg-slate-100 ${
          lead ? "rounded-2xl" : "rounded-xl"
        }`}
        style={lead ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
      >
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.06]">
          <Avatar person={member} color={color} textClassName={lead ? "text-2xl" : "text-xl"} />
        </div>
        {/* A hairline inset ring keeps light photos from bleeding into the page. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.06] ${
            lead ? "rounded-2xl" : "rounded-xl"
          }`}
        />
      </div>
      <p
        className={`font-bold leading-snug text-[#0F1B33] ${lead ? "text-sm" : "text-[13px]"}`}
      >
        {member.name}
      </p>
      {member.role && (
        <p
          className={`mt-0.5 leading-snug ${
            lead
              ? "text-[11px] font-semibold uppercase tracking-[0.08em]"
              : "text-[11px] text-[#94A3B8]"
          }`}
          style={lead ? { color } : undefined}
        >
          {member.role}
        </p>
      )}
    </motion.div>
  );
}

/** A person entry counts only once it has a name. */
function hasPerson(person?: Person): person is Person {
  return !!person && typeof person.name === "string" && person.name.trim().length > 0;
}

function DivisionBlock({ division, index }: { division: Division; index: number }) {
  const color = division.color || FALLBACK_COLOR;
  const leads = [division.head, division.deputy].filter(hasPerson);
  const members = (division.members ?? []).filter(hasPerson);
  const total = leads.length + members.length;

  return (
    <motion.section
      id={division.id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, delay: index * 0.04 }}
      className="scroll-mt-24 overflow-hidden rounded-3xl border border-[#E7EDF4] bg-white"
    >
      {/* Full-width colour rule identifies the division without a heavy header */}
      <div aria-hidden="true" className="h-1" style={{ background: color }} />

      <div className="p-6 sm:p-8">
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${color}16`, boxShadow: `inset 0 0 0 1px ${color}2E` }}
            >
              <Users size={19} strokeWidth={2.1} style={{ color }} />
            </div>
            <div className="min-w-0">
              <h3
                className="text-xl font-black leading-tight tracking-[-0.02em] text-[#0F1B33]"
                style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
              >
                {division.name}
              </h3>
              {division.desc && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#64748B]">
                  {division.desc}
                </p>
              )}
            </div>
          </div>
          {total > 0 && (
            <span
              className="shrink-0 self-start rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
              style={{ background: `${color}14`, color }}
            >
              {total} {total === 1 ? "person" : "people"}
            </span>
          )}
        </header>

        {total === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-[#E7EDF4] py-8 text-center text-sm text-[#94A3B8]">
            Nobody listed for this division yet.
          </p>
        ) : (
          <div className="space-y-7">
            {/* Head and vice head are ringed in the division colour and sit in
                their own row, so seniority is clear without extra labels. */}
            {leads.length > 0 && (
              <div className="grid max-w-xs grid-cols-2 gap-5">
                {leads.map((person, i) => (
                  <MemberCard
                    key={`lead-${person.name}-${i}`}
                    member={person}
                    color={color}
                    index={i}
                    lead
                  />
                ))}
              </div>
            )}

            {members.length > 0 && (
              <>
                {leads.length > 0 && (
                  <div className="border-t border-[#F1F5F9]" aria-hidden="true" />
                )}
                <div className="grid grid-cols-3 gap-x-5 gap-y-7 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                  {members.map((member, i) => (
                    <MemberCard
                      key={`${member.name}-${i}`}
                      member={member}
                      color={color}
                      index={i}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </motion.section>
  );
}

export default function CabinetPage() {
  const [content, setContent] = useState<CabinetContent | null>(null);

  useEffect(() => {
    api
      .getPageBySlug("about/cabinet")
      .then((res) => {
        const value = res?.page?.content as CabinetContent | undefined;
        // Only `header` is required. The old guard also demanded both legacy
        // department arrays, so the page rendered nothing at all once the
        // content moved to `divisions`.
        if (value?.header) setContent(value);
      })
      .catch(() => undefined);
  }, []);

  const divisions = useMemo<Division[]>(() => {
    if (!content) return [];
    if (Array.isArray(content.divisions) && content.divisions.length > 0) {
      return content.divisions;
    }
    // Un-migrated rows still carry the internal/external split. Reading it keeps
    // the page populated until the migration script has run.
    return [
      ...(content.internalDepartments ?? []),
      ...(content.externalDepartments ?? []),
    ];
  }, [content]);

  /**
   * Divisions bucketed under their group, in the order the groups are listed.
   * Divisions with no group — or one that points at a group that no longer
   * exists — fall into a final untitled bucket rather than disappearing.
   */
  const grouped = useMemo(() => {
    const groups = content?.divisionGroups ?? [];
    const known = new Set(groups.map((g) => g.key));
    const buckets = groups.map((group) => ({
      group,
      items: divisions.filter((d) => d.group === group.key),
    }));
    const orphans = divisions.filter((d) => !d.group || !known.has(d.group));
    if (orphans.length > 0) {
      buckets.push({ group: { key: '__ungrouped' }, items: orphans });
    }
    return buckets.filter((bucket) => bucket.items.length > 0);
  }, [content, divisions]);

  if (!content) return null;

  const allLeaders = (content.leaders ?? []).filter(hasPerson) as Leader[];
  const chairs = allLeaders.filter((l) => l.tier === 'chair');
  const officers = allLeaders.filter((l) => l.tier !== 'chair');
  // A cabinet with no tier set anywhere would otherwise render nothing large;
  // fall back to treating the first entry as the chair.
  const chairList = chairs.length > 0 ? chairs : allLeaders.slice(0, 1);
  const officerList = chairs.length > 0 ? officers : allLeaders.slice(1);

  const stats = content.stats ?? [];
  const totalPeople =
    allLeaders.length +
    divisions.reduce(
      (sum, d) =>
        sum +
        [d.head, d.deputy].filter(hasPerson).length +
        (d.members ?? []).filter(hasPerson).length,
      0
    );

  return (
    <>
      <PageHeader {...content.header} />

      {/* Summary numbers */}
      <section className="border-b border-[#F1F5F9] bg-white py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <Stat value={String(totalPeople)} label="Cabinet members" />
            {stats.slice(0, 3).map((s, i) => (
              <Stat key={i} value={s.valueStatic ?? "—"} label={s.valueLabel} />
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      {allLeaders.length > 0 && (
        <section className="relative overflow-hidden bg-white py-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 left-1/2 h-[420px] w-[820px] -translate-x-1/2 opacity-[0.05]"
            style={{ background: "radial-gradient(ellipse at center, #E8231A 0%, transparent 70%)" }}
          />
          <div className="relative mx-auto max-w-6xl px-6">
            <Heading
              section={
                content.leadershipSection ?? {
                  label: "Leadership",
                  title: "Who",
                  titleAccent: "Leads",
                }
              }
              align="center"
            />
            {/*
              Two tiers, sized differently. The chair sits alone at portrait
              size; the rest of the executive follows as a row of square cards.
              Card size carries the hierarchy, which survives reflow on mobile
              in a way that drawn connector lines would not.
            */}
            <div
              className={`mx-auto grid gap-6 ${
                chairList.length === 1
                  ? "max-w-sm grid-cols-1"
                  : "max-w-3xl grid-cols-1 sm:grid-cols-2"
              }`}
            >
              {chairList.map((leader, i) => (
                <LeaderCard key={`${leader.name}-${i}`} leader={leader} index={i} />
              ))}
            </div>

            {officerList.length > 0 && (
              <div className="mt-12">
                {/* A short centred rule reads as the branch coming down from the
                    chair, without committing to a full tree diagram. */}
                <div className="mx-auto mb-10 flex flex-col items-center" aria-hidden="true">
                  <span className="h-8 w-px bg-[#DDE5EF]" />
                  <span className="h-px w-24 bg-[#DDE5EF]" />
                </div>
                {/*
                  Width is capped by the number of officers. A fixed
                  five-column grid squeezed a two-person executive into two
                  narrow cards with three columns of empty space beside them.
                */}
                <div
                  className={`mx-auto grid gap-5 ${
                    officerList.length <= 2
                      ? "max-w-lg grid-cols-2"
                      : officerList.length === 3
                        ? "max-w-2xl grid-cols-2 sm:grid-cols-3"
                        : officerList.length === 4
                          ? "max-w-3xl grid-cols-2 sm:grid-cols-4"
                          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                  }`}
                >
                  {officerList.map((officer, i) => (
                    <OfficerCard key={`${officer.name}-${i}`} officer={officer} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Divisions */}
      <section className="border-y border-[#E7EDF4] bg-[#F8FAFC] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Heading
            section={
              content.divisionsSection ?? {
                label: "Divisions",
                title: "The",
                titleAccent: "Divisions",
              }
            }
          />
          {divisions.length === 0 ? (
            <p className="rounded-3xl border-2 border-dashed border-[#DDE5EF] py-16 text-center text-sm text-[#94A3B8]">
              No divisions have been added yet.
            </p>
          ) : (
            <div className="space-y-14">
              {grouped.map(({ group, items }) => (
                <div key={group.key}>
                  {group.label && (
                    <div className="mb-6 flex flex-col gap-1.5 border-l-2 border-[#E8231A] pl-4">
                      <h3
                        className="text-sm font-bold uppercase tracking-[0.14em] text-[#0F1B33]"
                        style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
                      >
                        {group.label}
                      </h3>
                      {group.description && (
                        <p className="max-w-2xl text-sm leading-relaxed text-[#64748B]">
                          {group.description}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-6">
                    {items.map((division, i) => (
                      <DivisionBlock key={division.id || i} division={division} index={i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Closing call to action */}
      <section className="relative overflow-hidden bg-[#0D1B33] py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #E8231A, transparent 50%), radial-gradient(circle at 80% 50%, #1A2B4A, transparent 50%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <h2
            className="text-[clamp(1.75rem,4vw,2.5rem)] font-black leading-tight tracking-[-0.02em] text-white"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
          >
            {content.cta.title}
          </h2>
          <p className="mt-4 leading-relaxed text-white/65">{content.cta.description}</p>
          <a
            href={content.cta.buttonHref}
            className="group mt-9 inline-flex items-center gap-2 rounded-full bg-[#E8231A] px-7 py-3.5 font-semibold text-white shadow-[0_14px_40px_-14px_rgba(232,35,26,0.8)] transition-transform duration-300 hover:-translate-y-0.5"
          >
            <Mail size={16} />
            {content.cta.buttonText}
          </a>
        </div>
      </section>
    </>
  );
}
