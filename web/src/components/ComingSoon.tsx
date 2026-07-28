import Link from "next/link";
import { Clock } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface ComingSoonProps {
  label: string;
  title: string;
  titleAccent?: string;
  description: string;
  breadcrumbs: { label: string; href?: string }[];
  backHref?: string;
  backLabel?: string;
}

export default function ComingSoon({
  label,
  title,
  titleAccent,
  description,
  breadcrumbs,
  backHref = "/",
  backLabel = "Back to Home",
}: ComingSoonProps) {
  return (
    <>
      <PageHeader
        label={label}
        title={title}
        titleAccent={titleAccent}
        description={description}
        breadcrumbs={breadcrumbs}
      />

      <section className="py-32 bg-white flex items-center justify-center">
        <div className="max-w-lg mx-auto px-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#FFF0EF] flex items-center justify-center mx-auto mb-8">
            <Clock size={36} className="text-[#E8231A]" />
          </div>

          <h2
            className="font-black text-[#1A2B4A] text-3xl md:text-4xl mb-4"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
          >
            Coming <span className="gradient-text">Soon</span>
          </h2>

          <p className="text-[#64748B] text-lg leading-relaxed mb-10">
            We&apos;re working hard to bring this page to life. Check back soon for updates!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={backHref}
              className="bg-[#E8231A] hover:bg-[#C41E16] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors duration-200 shadow-lg shadow-red-900/20"
            >
              {backLabel}
            </Link>
            <Link
              href="/"
              className="border-2 border-[#E2E8F0] hover:border-[#E8231A]/30 text-[#1A2B4A] font-semibold px-8 py-3.5 rounded-xl transition-colors duration-200"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
