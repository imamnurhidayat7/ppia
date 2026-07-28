import type { Metadata } from "next";
import CareerInfoContent from "./_components/career-info-content";

export const metadata: Metadata = {
  title: "Career Info",
  description:
    "Career guidance for Indonesian students in Auckland: job and internship openings, post-study work visa basics, CV and interview preparation, and where to look for graduate roles in New Zealand.",
  alternates: { canonical: "/opportunities/career-info" },
  openGraph: {
    title: "Career Info | PPIA Auckland",
    description:
      "Jobs, internships, work visa basics and job-hunting guidance for Indonesian students in Auckland.",
    url: "https://ppiauckland.org/opportunities/career-info",
    type: "website",
  },
};

export default function CareerInfoPage() {
  return <CareerInfoContent />;
}
