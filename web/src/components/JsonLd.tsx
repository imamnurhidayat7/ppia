import { SITE } from "@/lib/constants";
import { safeJsonLd } from "@/lib/sanitize-html";

/**
 * Organization JSON-LD structured data for SEO.
 * Renders the schema.org markup for PPIA Auckland as an Organization.
 */
export default function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    alternateName: "Perhimpunan Pelajar Indonesia Auckland",
    url: SITE.url,
    email: SITE.email,
    description: SITE.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Auckland",
      addressCountry: "NZ",
    },
    sameAs: [
      "https://instagram.com/ppiauckland",
      "https://linkedin.com/company/ppiauckland",
      "https://youtube.com/@ppiauckland2025",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
    />
  );
}
