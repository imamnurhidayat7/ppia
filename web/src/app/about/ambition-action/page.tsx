import type { Metadata } from "next";
import AmbitionActionContent from "./_components/ambition-action-content";

export const metadata: Metadata = {
  title: "Ambition in Action",
  description:
    "The vision, mission and work programme behind PPIA Auckland — the priorities this cabinet set for the Indonesian student community in Auckland and how each one is being put into practice.",
  alternates: { canonical: "/about/ambition-action" },
  openGraph: {
    title: "Ambition in Action | PPIA Auckland",
    description:
      "Vision, mission and work programme of PPIA Auckland, and how each priority is being delivered.",
    url: "https://ppiauckland.org/about/ambition-action",
    type: "website",
  },
};

export default function AmbitionActionPage() {
  return <AmbitionActionContent />;
}
