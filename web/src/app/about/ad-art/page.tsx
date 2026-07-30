import type { Metadata } from "next";
import AdArtContent, { type Content } from "./_components/ad-art-content";
import { fetchPageBySlug } from "@/lib/server-api";

export const metadata: Metadata = {
  title: "AD-ART",
  description:
    "The constitution and by-laws (Anggaran Dasar & Anggaran Rumah Tangga) of PPIA Auckland: founding principles, membership rules, organisational hierarchy, congress quorum and amendment procedures, chapter by chapter.",
  alternates: { canonical: "/about/ad-art" },
  openGraph: {
    title: "AD-ART | PPIA Auckland",
    description:
      "Constitution and by-laws of PPIA Auckland — principles, membership, organisational structure and congress procedures.",
    url: "https://ppiauckland.org/about/ad-art",
    type: "website",
  },
};

export const revalidate = 300;

export default async function AdArtPage() {
  const data = await fetchPageBySlug("about/ad-art");
  const content = (data?.content as Content | undefined) ?? null;
  return <AdArtContent initialContent={content} />;
}
