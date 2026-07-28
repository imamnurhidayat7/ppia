'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Building2, Calendar, User, Award } from 'lucide-react';

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

const formatDate = (date: string | Date | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

const formatShortDate = (date: string | Date | undefined) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
};

const getRoleBadge = (role: string) => {
  const badges: Record<string, { label: string; bg: string; text: string }> = {
    SUPER_ADMIN: { label: 'Super Admin', bg: 'bg-rose-500/20', text: 'text-rose-300' },
    BOARD: { label: 'Board', bg: 'bg-indigo-500/20', text: 'text-indigo-300' },
    MEMBER: { label: 'Member', bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
  };
  return badges[role] ?? badges.MEMBER;
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

export default function MemberCard({ member, variant = 'default', showDownload = true }: MemberCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const roleBadge = getRoleBadge(member.role);
  const memberId = member.studentId || `PPIA-${member.id.slice(0, 6).toUpperCase()}`;
  const validationUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${memberId}` : `/verify/${memberId}`;

  // Compute expiry: graduationDate if available, else createdAt + 1 year
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

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const card = cardRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const scale = 2;

      canvas.width = 1014 * scale;
      canvas.height = 638 * scale;

      if (!ctx) return;

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0D1B33');
      gradient.addColorStop(0.5, '#1A2B4A');
      gradient.addColorStop(1, '#0D1B33');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw decorative circles
      ctx.fillStyle = 'rgba(232, 35, 26, 0.1)';
      ctx.beginPath();
      ctx.arc(canvas.width - 100 * scale, -50 * scale, 300 * scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(232, 35, 26, 0.05)';
      ctx.beginPath();
      ctx.arc(100 * scale, canvas.height + 100 * scale, 250 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Draw PPIA logo text
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${48 * scale}px Poppins, sans-serif`;
      ctx.fillText('PPIA', 60 * scale, 80 * scale);
      ctx.font = `${18 * scale}px Poppins, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('Auckland', 60 * scale, 105 * scale);

      // Draw member info
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${36 * scale}px Poppins, sans-serif`;
      ctx.fillText(member.name, 60 * scale, 200 * scale);

      ctx.font = `${16 * scale}px Poppins, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      const positionText = member.position?.replace(/_/g, ' ') || member.role;
      ctx.fillText(positionText.toUpperCase(), 60 * scale, 235 * scale);

      // Draw divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(60 * scale, 270 * scale);
      ctx.lineTo(300 * scale, 270 * scale);
      ctx.stroke();

      // Draw details
      const details = [
        { label: 'Member ID', value: memberId },
        { label: 'Division', value: member.division?.name || '-' },
        { label: 'University', value: member.university || '-' },
        { label: 'Member Since', value: formatDate(member.createdAt) },
      ];

      if (expiryDate) {
        details.push({ label: 'Valid Until', value: formatDate(expiryDate) });
      }

      details.forEach((detail, i) => {
        const y = 320 * scale + i * 45 * scale;
        ctx.font = `${12 * scale}px Poppins, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(detail.label, 60 * scale, y);
        ctx.font = `bold ${16 * scale}px Poppins, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(detail.value, 60 * scale, y + 22 * scale);
      });

      // Draw QR code area background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(700 * scale, 150 * scale, 270 * scale, 340 * scale);
      ctx.fillStyle = '#0D1B33';
      ctx.fillRect(710 * scale, 160 * scale, 250 * scale, 250 * scale);

      // Draw QR code SVG to canvas
      const qrSvg = cardRef.current.querySelector('svg');
      if (qrSvg) {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const img = new window.Image();
        img.onload = () => {
          ctx.drawImage(img, 720 * scale, 170 * scale, 230 * scale, 230 * scale);

          // Draw validation text below QR
          ctx.fillStyle = '#0D1B33';
          ctx.font = `${12 * scale}px Poppins, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('Scan to validate', 835 * scale, 420 * scale);
          ctx.font = `bold ${10 * scale}px Poppins, sans-serif`;
          ctx.fillStyle = '#64748B';
          ctx.fillText('ppiaauckland.org', 835 * scale, 440 * scale);

          // Download
          const link = document.createElement('a');
          link.download = `PPIA-Member-Card-${memberId}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      }
    } catch (error) {
      console.error('Failed to download card:', error);
    }
  };

  if (variant === 'compact') {
    return (
      <div className="bg-gradient-to-br from-[#0D1B33] via-[#1A2B4A] to-[#0D1B33] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-2xl font-bold overflow-hidden">
              {member.avatar ? (
                <Image src={member.avatar} alt={member.name} width={64} height={64} className="w-full h-full object-cover" unoptimized />
              ) : (
                getInitials(member.name)
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg">{member.name}</h3>
              <p className="text-white/60 text-sm">{member.position?.replace(/_/g, ' ') || member.role}</p>
              <p className="text-white/40 text-xs font-mono mt-1">{memberId}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-2">
            <QRCodeSVG value={validationUrl} size={64} level="M" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D1B33] via-[#1A2B4A] to-[#0D1B33] p-8 text-white shadow-2xl"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8231A]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#E8231A]/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          {/* Header with Logo */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 flex items-center overflow-hidden">
                <Image
                  src="/Logo-PPIA-2025-White.png"
                  alt="PPIA Auckland"
                  width={140}
                  height={40}
                  className="h-full w-auto object-contain"
                  unoptimized
                />
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleBadge.bg} ${roleBadge.text}`}>
              {roleBadge.label}
            </span>
          </div>

          {/* Member Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              {/* Avatar and Name */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E8231A] to-[#A31510] flex items-center justify-center text-3xl font-black shadow-lg overflow-hidden border-4 border-white/20">
                  {member.avatar ? (
                    <Image src={member.avatar} alt={member.name} width={80} height={80} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    getInitials(member.name)
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-black">{member.name}</h2>
                  <p className="text-white/60 text-sm">{member.position?.replace(/_/g, ' ') || 'Member'}</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-white/40" />
                  <div>
                    <p className="text-white/40 text-xs">Member ID</p>
                    <p className="font-mono font-bold text-sm">{memberId}</p>
                  </div>
                </div>
                {member.division && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-white/40" />
                    <div>
                      <p className="text-white/40 text-xs">Division</p>
                      <p className="font-medium text-sm">{member.division.name}</p>
                    </div>
                  </div>
                )}
                {member.university && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-white/40" />
                    <div>
                      <p className="text-white/40 text-xs">University</p>
                      <p className="font-medium text-sm">{member.university}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-white/40" />
                  <div>
                    <p className="text-white/40 text-xs">Member Since</p>
                    <p className="font-medium text-sm">{formatDate(member.createdAt)}</p>
                  </div>
                </div>
                {expiryDate && (
                  <div className="flex items-center gap-3">
                    <Award className="w-4 h-4 text-white/40" />
                    <div>
                      <p className="text-white/40 text-xs">{isExpired ? 'Expired' : 'Valid Until'}</p>
                      <p className={`font-medium text-sm ${isExpired ? 'text-red-300' : ''}`}>{formatDate(expiryDate)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center">
              <div className="bg-white rounded-2xl p-4 shadow-xl">
                <QRCodeSVG value={validationUrl} size={160} level="M" includeMargin />
              </div>
              <p className="text-white/50 text-xs mt-4 text-center">
                Scan to validate membership<br />
                <span className="text-white/30">ppiaauckland.org/verify/{memberId}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Button */}
      {showDownload && (
        <button
          onClick={handleDownload}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Member Card
        </button>
      )}
    </div>
  );
}
