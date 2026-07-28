import type { Metadata } from "next";
import TermsOfServiceContent from "./_components/terms-of-service-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for using the PPIA Auckland website and services: account and membership rules, acceptable use, event registration conditions, content ownership and limitations of liability.",
  alternates: { canonical: "/legal/terms-of-service" },
  openGraph: {
    title: "Terms of Service | PPIA Auckland",
    description:
      "Terms for using the PPIA Auckland website and services — accounts, acceptable use and event registrations.",
    url: "https://ppiauckland.org/legal/terms-of-service",
    type: "website",
  },
};

export default function TermsOfServicePage() {
  return <TermsOfServiceContent />;
}
