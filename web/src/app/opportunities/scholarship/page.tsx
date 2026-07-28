import type { Metadata } from "next";
import ScholarshipContent from "./_components/scholarship-content";

export const metadata: Metadata = {
  title: "Scholarship",
  description:
    "Scholarships for Indonesians studying in New Zealand — funding schemes, eligibility, deadlines and application tips collected by PPIA Auckland for prospective and current students in Auckland.",
  alternates: { canonical: "/opportunities/scholarship" },
  openGraph: {
    title: "Scholarship | PPIA Auckland",
    description:
      "Scholarship options, eligibility and deadlines for Indonesians studying in New Zealand.",
    url: "https://ppiauckland.org/opportunities/scholarship",
    type: "website",
  },
};

export default function ScholarshipPage() {
  return <ScholarshipContent />;
}
