'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Sailboat } from 'lucide-react';

interface MemberCardProps {
  member: {
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
    position?: string;
    avatar?: string;
    studentId?: string;
    university?: string;
    major?: string;
    degree?: string;
    division?: { id: string; name: string; slug: string; color?: string };
    createdAt: string;
    graduationDate?: string;
  };
  variant?: 'default' | 'compact';
  showDownload?: boolean;
}

/**
 * The member card borrows the ticket shape the landing page's membership section
 * already draws — chart paper, a red header band carrying the PPIA logo, a torn
 * perforation between the card and its stub, and a QR code on the stub — so the
 * two read as the same object. It is titled "Member card" throughout: it is
 * membership identification, not travel document cosplay.
 */

const formatDate = (date: string | Date | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' });
};

/**
 * The card shows "Member" for everyone.
 *
 * It used to print the internal role as a travel class — Captain / Officer /
 * Crew — which put an admin's privilege level on a document people show to each
 * other. The card identifies someone as a member of PPIA Auckland; their role in
 * the committee is not what it is for.
 */
const MEMBER_BADGE = {
  label: 'Member',
  className: 'bg-[#0B7A55]/12 text-[#0B7A55] ring-[#0B7A55]/25',
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/**
 * Barcode bar heights, as percentages. Fixed rather than random so the markup
 * is identical on the server and the client (no hydration mismatch).
 */
const BARCODE = [
  86, 54, 96, 40, 72, 100, 48, 64, 92, 36, 80, 58, 100, 44, 76, 62, 90, 50, 84, 68,
];

export default function MemberCard({ member, variant = 'default', showDownload = true }: MemberCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const role = MEMBER_BADGE;
  const memberId = member.studentId || `PPIA-${member.id.slice(0, 6).toUpperCase()}`;
  const validationUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/verify/${memberId}`
      : `/verify/${memberId}`;

  // Expiry: graduationDate if present, else one year after joining.
  const expiryDate = (() => {
    if (member.graduationDate) return new Date(member.graduationDate);
    if (member.createdAt) {
      const d = new Date(member.createdAt);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
    return null;
  })();
  const isExpired = expiryDate ? expiryDate < new Date() : false;

  /**
   * Downloadable PNG, drawn to match the on-screen pass: cream paper, a red
   * header band, the coupon on the left and a stub with the QR on the right.
   */
  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const scale = 2;
      const W = 1014;
      const H = 500;
      canvas.width = W * scale;
      canvas.height = H * scale;
      ctx.scale(scale, scale);

      // Paper
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);

      // Navy header band with a red accent rule, matching the on-screen card.
      ctx.fillStyle = '#0F1B33';
      ctx.fillRect(0, 0, W, 76);
      ctx.fillStyle = '#E8231A';
      ctx.fillRect(0, 0, W, 5);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `800 26px Poppins, sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillText('PPIA AUCKLAND', 40, 38);
      ctx.font = `700 15px ui-monospace, monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'right';
      ctx.fillText('MEMBER CARD', W - 40, 38);
      ctx.textAlign = 'left';

      const stubX = W - 300;

      // Route: IDN -> AKL
      ctx.fillStyle = '#475569';
      ctx.font = `600 13px ui-monospace, monospace`;
      ctx.fillText('FROM', 40, 130);
      ctx.textAlign = 'right';
      ctx.fillText('TO', stubX - 40, 130);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0F1B33';
      ctx.font = `900 44px Poppins, sans-serif`;
      ctx.fillText('IDN', 40, 168);
      ctx.textAlign = 'right';
      ctx.fillText('AKL', stubX - 40, 168);
      ctx.textAlign = 'left';

      // Name + membership line ("Member" for everyone, as on screen)
      ctx.fillStyle = '#0F1B33';
      ctx.font = `900 30px Poppins, sans-serif`;
      ctx.fillText(member.name, 40, 232);
      ctx.fillStyle = '#475569';
      ctx.font = `600 14px ui-monospace, monospace`;
      ctx.fillText(role.label.toUpperCase(), 40, 262);

      /**
       * Details, laid out like the on-screen card: Member ID and University on
       * their own lines so a full institution name is not clipped, then the two
       * dates side by side.
       */
      const drawDetail = (label: string, value: string, x: number, y: number, max: number) => {
        ctx.fillStyle = '#475569';
        ctx.font = `600 12px ui-monospace, monospace`;
        ctx.fillText(label, x, y);
        ctx.fillStyle = label.startsWith('EXPIRED') ? '#C41E16' : '#28394F';
        ctx.font = `700 15px Poppins, sans-serif`;
        ctx.fillText(value.slice(0, max), x, y + 24);
      };

      const detailWidth = stubX - 80;
      drawDetail('MEMBER ID', memberId, 40, 306, 40);
      // Full row, so it has roughly twice the characters of a half-width cell.
      drawDetail('UNIVERSITY', member.university || '-', 40, 368, 52);
      drawDetail('MEMBER SINCE', formatDate(member.createdAt), 40, 430, 24);
      drawDetail(
        isExpired ? 'EXPIRED' : 'VALID UNTIL',
        formatDate(expiryDate ?? undefined),
        40 + detailWidth / 2,
        430,
        24
      );

      // Perforated seam
      ctx.fillStyle = '#CBD5E1';
      for (let y = 90; y < H - 10; y += 16) {
        ctx.beginPath();
        ctx.arc(stubX, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stub label
      ctx.fillStyle = '#475569';
      ctx.font = `600 12px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('SCAN TO VALIDATE', stubX + 150, 120);
      ctx.textAlign = 'left';

      // QR
      const qrSvg = cardRef.current.querySelector('svg');
      const finish = () => {
        const link = document.createElement('a');
        link.download = `PPIA-Member-Card-${memberId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      if (qrSvg) {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const img = new window.Image();
        img.onload = () => {
          const qrSize = 200;
          const qrX = stubX + 150 - qrSize / 2;
          ctx.drawImage(img, qrX, 150, qrSize, qrSize);
          ctx.fillStyle = '#64748B';
          ctx.font = `700 12px ui-monospace, monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(memberId, stubX + 150, 380);
          ctx.textAlign = 'left';
          finish();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      } else {
        finish();
      }
    } catch (error) {
      console.error('Failed to download card:', error);
    }
  };

  if (variant === 'compact') {
    return (
      <div className="chart-paper relative overflow-hidden rounded-[6px] border border-[#DCE7F1] shadow-[0_20px_44px_-30px_rgba(7,19,33,0.5)]">
        <div className="flex items-center justify-between gap-3 bg-[#E8231A] px-4 py-2.5">
          <span className="data-type text-[12px] font-black uppercase tracking-[0.14em] text-white">
            PPIA Auckland
          </span>
          <span className="data-type text-[12px] font-bold uppercase text-white/80">Member card</span>
        </div>
        <div className="flex items-center gap-4 p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#0F1B33] text-lg font-black text-white">
            {member.avatar ? (
              <Image src={member.avatar} alt={member.name} width={56} height={56} className="h-full w-full object-cover" unoptimized />
            ) : (
              getInitials(member.name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-black text-[#0F1B33]">{member.name}</h3>
            <p className="truncate text-sm ink-muted">{role.label}</p>
            <p className="data-type mt-0.5 text-[12px] uppercase ink-muted">{memberId}</p>
          </div>
          <div className="shrink-0 rounded-[4px] border border-[#DCE7F1] bg-white p-1.5">
            <QRCodeSVG value={validationUrl} size={56} level="M" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={cardRef}
        className="chart-paper relative overflow-hidden rounded-[6px] border border-[#DCE7F1] shadow-[0_40px_80px_-36px_rgba(7,19,33,0.7)]"
      >
        {/*
          Header band.

          Navy, not red: the logo is a white wordmark with red in it, so on a red
          band those parts vanished and the mark read as an unidentifiable smudge.
          The red is kept as the accent rule along the top edge instead.
        */}
        <div className="bg-[#0F1B33]">
          <div aria-hidden="true" className="h-1 bg-[#E8231A]" />
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <Image
              src="/Logo-PPIA-2025-White.png"
              alt="PPIA Auckland"
              width={200}
              height={80}
              priority
              className="h-7 w-auto"
            />
            <span className="data-type text-[12px] font-bold uppercase text-white/70">Member card</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row">
          {/* Main coupon */}
          <div className="min-w-0 flex-1 p-6">
            {/* Route line */}
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="data-type text-[12px] uppercase ink-muted">From</p>
                <p
                  className="text-2xl font-black leading-none text-[#0F1B33]"
                  style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                >
                  IDN
                </p>
              </div>
              <div className="relative mb-1 h-4 flex-1" aria-hidden="true">
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-[#C3D2E0]" />
                <Sailboat
                  size={16}
                  strokeWidth={2.2}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-0.5 text-[#C41E16]"
                />
              </div>
              <div className="text-right">
                <p className="data-type text-[12px] uppercase ink-muted">To</p>
                <p
                  className="text-2xl font-black leading-none text-[#0F1B33]"
                  style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                >
                  AKL
                </p>
              </div>
            </div>

            {/* Passenger */}
            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[#0F1B33] text-2xl font-black text-white">
                {member.avatar ? (
                  <Image src={member.avatar} alt={member.name} width={64} height={64} className="h-full w-full object-cover" unoptimized />
                ) : (
                  getInitials(member.name)
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black leading-tight text-[#0F1B33]">{member.name}</h2>
                <span
                  className={`data-type mt-1.5 inline-block rounded-[3px] px-2 py-0.5 text-[12px] font-bold uppercase ring-1 ring-inset ${role.className}`}
                >
                  {role.label}
                </span>
              </div>
            </div>

            {/*
              Details.

              University sits on its own full-width row and is allowed to wrap:
              sharing a three-column row with the dates truncated most real
              institution names to "University of Auckl…". The two dates then pair
              up on the row below, where short values fit comfortably.
            */}
            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4">
              {(
                [
                  ['Member ID', memberId, false],
                  ['University', member.university || '-', true],
                  ['Member since', formatDate(member.createdAt), false],
                  ...(expiryDate
                    ? [[isExpired ? 'Expired' : 'Valid until', formatDate(expiryDate), false] as const]
                    : []),
                ] as ReadonlyArray<readonly [string, string, boolean]>
              ).map(([label, value, wide]) => (
                <div key={label} className={`min-w-0 ${wide ? 'col-span-2' : ''}`}>
                  <dt className="data-type text-[12px] uppercase ink-muted">{label}</dt>
                  <dd
                    className={`mt-1 text-[13px] font-semibold ${
                      wide ? 'break-words' : 'truncate'
                    } ${label.startsWith('Expired') ? 'text-[#C41E16]' : 'text-[#28394F]'}`}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Barcode */}
            <div className="mt-6 flex h-10 items-end gap-[3px]" aria-hidden="true">
              {BARCODE.map((height, i) => (
                <span
                  key={i}
                  className="flex-1 bg-[#0F1B33]"
                  style={{ height: `${height}%`, opacity: i % 3 === 0 ? 0.85 : 0.55 }}
                />
              ))}
            </div>
          </div>

          {/* Perforated seam */}
          <div className="perforation-v hidden w-[9px] shrink-0 sm:block" aria-hidden="true" />
          <span aria-hidden="true" className="rope-rule mx-6 block opacity-60 sm:hidden" />

          {/* Stub with QR */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-3 border-t border-dashed border-[#C3D2E0] px-6 py-6 text-center sm:w-[220px] sm:border-l sm:border-t-0">
            <div className="rounded-[5px] border border-[#DCE7F1] bg-white p-3 shadow-sm">
              <QRCodeSVG value={validationUrl} size={132} level="M" />
            </div>
            <p className="data-type text-[12px] uppercase ink-muted">Scan to validate</p>
            <p className="data-type text-[12px] font-bold uppercase text-[#28394F]">{memberId}</p>
          </div>
        </div>
      </div>

      {showDownload && (
        <button
          onClick={handleDownload}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#0F1B33] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1A2B4A]"
        >
          <Download className="h-4 w-4" />
          Download member card
        </button>
      )}
    </div>
  );
}
