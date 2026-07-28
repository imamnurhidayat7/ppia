import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Site maintenance',
  description: 'PPIA Auckland is temporarily unavailable while maintenance is in progress.',
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <main className="min-h-screen mesh-gradient flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <Image
          src="/Logo-PPIA-2025-White.png"
          alt="PPIA Auckland"
          width={180}
          height={72}
          className="mx-auto h-14 w-auto"
          priority
        />
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-[#E8231A]">
          Scheduled maintenance
        </p>
        <h1 className="mt-3 font-display text-3xl font-black text-white sm:text-4xl">
          We&apos;ll be back shortly
        </h1>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-slate-300">
          We&apos;re making improvements to the PPIA Auckland website. Please try again in a little while.
        </p>
        <a
          href="mailto:contact@ppiauckland.org"
          className="mt-8 inline-flex rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          Contact PPIA Auckland
        </a>
      </div>
    </main>
  );
}
