"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import api from "@/lib/api";
import RichText from "@/components/RichText";

interface LegalContent {
  header: { label: string; title: string; titleAccent: string; description: string; breadcrumbs: { label: string }[] };
  sections: { id: number; title: string; body: string }[];
}

export default function PrivacyPolicyPage() {
  const [content, setContent] = useState<LegalContent | null>(null);

  useEffect(() => {
    api.getPageBySlug("legal/privacy-policy")
      .then((res) => {
        const value = res?.page?.content as Partial<LegalContent> | undefined;
        if (value?.header && Array.isArray(value.sections)) setContent(value as LegalContent);
      })
      .catch(() => undefined);
  }, []);

  if (!content) return null;

  return (
    <>
      <PageHeader {...content.header} />
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="prose prose-gray max-w-none">
          {content.sections.map((section) => (
            <div key={section.id}>
              <h2>{section.id}. {section.title}</h2>
              <RichText html={section.body} />
            </div>
          ))}
          <p className="text-sm text-gray-500 mt-8">Last updated: {new Date().getFullYear()}</p>
        </div>
      </section>
    </>
  );
}
