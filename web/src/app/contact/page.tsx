import type { Metadata } from "next";
import ContactContent from "./_components/contact-content";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with PPIA Auckland. Send the committee a message, find our email and social channels, and see where to direct questions about membership, events, partnerships or student support.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact | PPIA Auckland",
    description:
      "Reach the PPIA Auckland committee — contact form, email and social channels.",
    url: "https://ppiauckland.org/contact",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactContent />;
}
