import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  label: string;
  title: string;
  titleAccent?: string;
  description?: string;
  breadcrumbs?: Crumb[];
}

export default function PageHeader({ label, title, titleAccent, description, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="relative pt-32 pb-20 mesh-gradient overflow-hidden">
      {/* Decorative orb */}
      <div
        className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, #E8231A, transparent 70%)", transform: "translate3d(0,0,0)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Breadcrumb */}
        {breadcrumbs && (
          <div className="flex items-center gap-2 text-[#64748B] text-sm mb-6">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                <ChevronRight size={14} />
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-white transition-colors">{crumb.label}</Link>
                ) : (
                  <span className="text-white">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}

        <span className="text-[#E8231A] font-semibold text-sm tracking-widest uppercase">{label}</span>
        <h1
          className="font-black text-white text-4xl md:text-6xl mt-3 leading-tight max-w-3xl"
          style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
        >
          {titleAccent ? (
            <>
              {title}{" "}
              <span className="gradient-text">{titleAccent}</span>
            </>
          ) : title}
        </h1>
        {description && (
          <p className="text-[#94A3B8] text-lg mt-5 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}
