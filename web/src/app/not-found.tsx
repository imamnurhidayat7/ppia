import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center px-4">
      <div className="text-center">
        {/* 404 Animation */}
        <div className="mb-8">
          <h1
            className="font-black text-[#E8231A] text-[12rem] leading-none"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
          >
            404
          </h1>
          <p className="text-white/60 text-xl mt-4">Page Not Found</p>
        </div>

        {/* Message */}
        <div className="max-w-md mx-auto mb-10">
          <p className="text-[#94A3B8] text-lg">
            Oops! The page you&apos;re looking for doesn&apos;t exist.
            It might have been moved or deleted.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 bg-[#E8231A] hover:bg-[#C41E16] text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-red-900/30 hover:-translate-y-1"
          >
            <Home size={18} />
            Back to Home
          </Link>
          <Link
            href="/contact"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-all border border-white/20"
          >
            <Search size={18} />
            Contact Us
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="mt-16 pt-10 border-t border-white/10">
          <p className="text-[#64748B] text-sm mb-4">Popular pages:</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { label: 'About Us', href: '/about/ambition-action' },
              { label: 'Events', href: '/activities/events' },
              { label: 'Wiki PPIA', href: '/opportunities/wiki-ppia' },
              { label: 'Scholarship', href: '/opportunities/scholarship' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[#94A3B8] hover:text-white text-sm px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
