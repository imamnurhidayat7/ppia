import type { Metadata } from "next";
import WikiPpiaContent from "./_components/wiki-ppia-content";

export const metadata: Metadata = {
  title: "Wiki PPIA",
  description:
    "A searchable guide to moving to and living in Auckland as an Indonesian student: visas, accommodation, banking, transport, healthcare, phone plans, groceries and the questions new arrivals ask most.",
  alternates: { canonical: "/opportunities/wiki-ppia" },
  openGraph: {
    title: "Wiki PPIA | PPIA Auckland",
    description:
      "Searchable practical guide for Indonesian students in Auckland — visas, housing, banking, transport, healthcare and more.",
    url: "https://ppiauckland.org/opportunities/wiki-ppia",
    type: "website",
  },
};

export default function WikiPPIAPage() {
  return <WikiPpiaContent />;
}
