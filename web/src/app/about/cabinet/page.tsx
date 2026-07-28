import type { Metadata } from "next";
import CabinetContent from "./_components/cabinet-content";

export const metadata: Metadata = {
  title: "Cabinet",
  description:
    "Meet the PPIA Auckland cabinet: the president, vice president and every division that runs the Indonesian student association in Auckland, with each member's role and responsibilities.",
  alternates: { canonical: "/about/cabinet" },
  openGraph: {
    title: "Cabinet | PPIA Auckland",
    description:
      "The people behind PPIA Auckland — cabinet members, divisions and their roles.",
    url: "https://ppiauckland.org/about/cabinet",
    type: "website",
  },
};

export default function CabinetPage() {
  return <CabinetContent />;
}
