import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/constants";
import {
  fetchScholarshipById,
  fetchScholarshipBySlug,
  toMetaDescription,
} from "@/lib/server-api";
import ScholarshipDetail from "./_components/scholarship-detail";

interface ScholarshipPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * The param is a slug for API rows. Numeric CMS ids (legacy rows that were
 * never imported into the table) fall back to a lookup by id so old links
 * keep working.
 */
async function fetchScholarship(param: string) {
  const bySlug = await fetchScholarshipBySlug(param);
  if (bySlug) return bySlug;
  return fetchScholarshipById(param);
}

export async function generateMetadata({ params }: ScholarshipPageProps): Promise<Metadata> {
  const { slug } = await params;
  const scholarship = await fetchScholarship(slug);

  if (!scholarship) notFound();

  const canonical = `/opportunities/scholarship/${scholarship.slug || scholarship.id}`;
  const description = toMetaDescription(
    scholarship.desc,
    `${scholarship.name} — a scholarship listed by PPIA Auckland.`
  );

  return {
    title: scholarship.name,
    description,
    alternates: { canonical },
    openGraph: {
      title: scholarship.name,
      description,
      url: `${SITE.url}${canonical}`,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: scholarship.name,
      description,
    },
  };
}

export default async function ScholarshipDetailPage({ params }: ScholarshipPageProps) {
  const { slug } = await params;
  const scholarship = await fetchScholarship(slug);

  if (!scholarship) notFound();

  return <ScholarshipDetail scholarship={scholarship} />;
}
