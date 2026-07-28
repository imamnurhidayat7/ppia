import type { Metadata } from "next";
import PrivacyPolicyContent from "./_components/privacy-policy-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How PPIA Auckland collects, uses, stores and shares personal data from members, event registrations and website visitors, including cookies and your rights over your own information.",
  alternates: { canonical: "/legal/privacy-policy" },
  openGraph: {
    title: "Privacy Policy | PPIA Auckland",
    description:
      "How PPIA Auckland handles personal data from members, event registrations and website visitors.",
    url: "https://ppiauckland.org/legal/privacy-policy",
    type: "website",
  },
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContent />;
}
