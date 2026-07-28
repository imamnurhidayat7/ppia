import type { Metadata } from "next";
import ResearchList from "./_components/research-list";

export const metadata: Metadata = {
  title: "Research Corner",
  description:
    "Research papers, theses, conference presentations and publications by Indonesian students and researchers in Auckland. Browse abstracts, authors, venues and DOIs in the PPIA Auckland Research Corner.",
  alternates: { canonical: "/activities/research-corner" },
  openGraph: {
    title: "Research Corner | PPIA Auckland",
    description:
      "Publications, theses and conference papers by Indonesian students and researchers in Auckland.",
    url: "https://ppiauckland.org/activities/research-corner",
    type: "website",
  },
};

export default function ResearchCornerPage() {
  return <ResearchList />;
}
