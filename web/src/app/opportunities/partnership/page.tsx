import type { Metadata } from "next";
import PartnershipContent from "./_components/partnership-content";

export const metadata: Metadata = {
  title: "Partnership",
  description:
    "Partner with PPIA Auckland. Sponsorship tiers, partner benefits and the audience you reach when you support Indonesian student events, media and programmes in Auckland — plus how to get in touch.",
  alternates: { canonical: "/opportunities/partnership" },
  openGraph: {
    title: "Partnership | PPIA Auckland",
    description:
      "Sponsorship tiers, partner benefits and how to collaborate with PPIA Auckland.",
    url: "https://ppiauckland.org/opportunities/partnership",
    type: "website",
  },
};

export default function PartnershipPage() {
  return <PartnershipContent />;
}
