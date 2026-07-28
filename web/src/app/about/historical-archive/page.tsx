import type { Metadata } from "next";
import HistoricalArchiveContent from "./_components/historical-archive-content";

export const metadata: Metadata = {
  title: "Historical Archive",
  description:
    "A year-by-year timeline of PPIA Auckland: past cabinets, milestones and the moments that shaped the Indonesian student community in Auckland since its founding.",
  alternates: { canonical: "/about/historical-archive" },
  openGraph: {
    title: "Historical Archive | PPIA Auckland",
    description:
      "Timeline of PPIA Auckland — past cabinets, milestones and community history, filterable by year.",
    url: "https://ppiauckland.org/about/historical-archive",
    type: "website",
  },
};

export default function HistoricalArchivePage() {
  return <HistoricalArchiveContent />;
}
