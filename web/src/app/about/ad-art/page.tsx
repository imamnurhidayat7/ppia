import type { Metadata } from "next";
import AdArtContent from "./_components/ad-art-content";

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

export default function AdArtPage() {
  return <AdArtContent />;
}
