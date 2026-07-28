'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { API_ORIGIN } from '@/lib/api-base';

interface Props {
  candidate: {
    id: string;
    candidateNumber?: number;
    user: { id: string; name: string; avatar?: string; username: string; division?: { name: string; color?: string } };
    vision: string;
    mission: string;
    experience?: string;
    program?: string;
    slogan?: string;
    posterUrl?: string;
    status: string;
  };
  onSelect?: () => void;
  selected?: boolean;
}

const API_BASE_URL = API_ORIGIN;

function getFullUrl(url?: string | null) {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
}

export default function CandidateCard({ candidate, onSelect, selected }: Props) {
  const avatarUrl = getFullUrl(candidate.posterUrl || candidate.user.avatar);
  const initials = candidate.user.name.charAt(0).toUpperCase();

  return (
    <motion.div
      onClick={onSelect}
      whileHover={{ y: onSelect ? -2 : 0 }}
      transition={{ duration: 0.15 }}
      className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${
        onSelect ? 'cursor-pointer' : ''
      } ${
        selected
          ? 'border-[#E8231A] shadow-xl shadow-[#E8231A]/10'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Candidate number badge */}
      {candidate.candidateNumber !== undefined && (
        <div className="relative">
          <div className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-[#1A2B4A] text-white text-sm font-black flex items-center justify-center shadow">
            {candidate.candidateNumber}
          </div>
        </div>
      )}

      {/* Poster or avatar */}
      {avatarUrl ? (
        <div className="relative w-full h-48 bg-slate-100 overflow-hidden">
          <Image
            src={avatarUrl}
            alt={candidate.user.name}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            {candidate.slogan && (
              <p className="text-white text-xs italic leading-snug line-clamp-2">
                "{candidate.slogan}"
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-[#1A2B4A] to-[#0D1B33] flex items-center justify-center relative">
          <span className="text-white text-5xl font-black opacity-30">{initials}</span>
          {candidate.slogan && (
            <div className="absolute bottom-3 left-4 right-4">
              <p className="text-white/70 text-xs italic leading-snug line-clamp-2 text-center">
                "{candidate.slogan}"
              </p>
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Identity */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8231A] to-[#A31510] flex items-center justify-center text-white font-black text-lg overflow-hidden flex-shrink-0">
            {candidate.user.avatar && !candidate.posterUrl ? (
              <Image
                src={getFullUrl(candidate.user.avatar) || ''}
                alt={candidate.user.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[#1A2B4A] leading-tight truncate">{candidate.user.name}</h3>
            <p className="text-xs text-slate-400">@{candidate.user.username}</p>
            {candidate.user.division && (
              <span
                className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold text-white leading-none"
                style={{ backgroundColor: candidate.user.division.color || '#475569' }}
              >
                {candidate.user.division.name}
              </span>
            )}
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-1">Vision</p>
            <p className="text-slate-700 line-clamp-3 leading-relaxed">{candidate.vision}</p>
          </div>
          <div>
            <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-1">Mission</p>
            <p className="text-slate-700 line-clamp-3 leading-relaxed">{candidate.mission}</p>
          </div>
          {candidate.experience && (
            <div>
              <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-1">Experience</p>
              <p className="text-slate-700 line-clamp-2 leading-relaxed">{candidate.experience}</p>
            </div>
          )}
        </div>

        {/* Selected state */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E8231A] to-[#A31510] text-white text-center font-bold text-sm flex items-center justify-center gap-2"
          >
            <span>✓</span> Selected candidate
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
