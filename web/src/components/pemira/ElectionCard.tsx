'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Vote, Clock, Users, ChevronRight } from 'lucide-react';

interface Props {
  election: {
    id: string;
    title: string;
    description?: string;
    status: string;
    votingStart: string;
    votingEnd: string;
    registrationStart?: string;
    registrationEnd?: string;
    campaignStart?: string;
    _count?: { candidates: number; votes: number };
  };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  UPCOMING:     { label: 'Upcoming',     bg: 'bg-slate-100',   text: 'text-slate-600',  dot: 'bg-slate-400' },
  REGISTRATION: { label: 'Registration', bg: 'bg-amber-50',    text: 'text-amber-700',  dot: 'bg-amber-500' },
  CAMPAIGN:     { label: 'Campaign',     bg: 'bg-blue-50',     text: 'text-blue-700',   dot: 'bg-blue-500' },
  VOTING:       { label: 'Voting',       bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  CLOSED:       { label: 'Closed',       bg: 'bg-slate-100',   text: 'text-slate-500',  dot: 'bg-slate-400' },
  PUBLISHED:    { label: 'Completed',    bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

const isActive = (status: string) => ['REGISTRATION', 'CAMPAIGN', 'VOTING'].includes(status);

export default function ElectionCard({ election }: Props) {
  const cfg = STATUS_CONFIG[election.status] ?? STATUS_CONFIG.UPCOMING;
  const active = isActive(election.status);

  return (
    <Link href={`/pemira/${election.id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className={`block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all p-6 border h-full relative overflow-hidden ${
          active ? 'border-[#E8231A]/30' : 'border-slate-100'
        }`}
      >
        {/* Active indicator strip */}
        {active && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#E8231A] to-[#A31510]" />
        )}

        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            active
              ? 'bg-gradient-to-br from-[#E8231A] to-[#A31510] shadow-lg'
              : 'bg-slate-100'
          }`}>
            <Vote className={`w-6 h-6 ${active ? 'text-white' : 'text-slate-400'}`} />
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${active ? 'animate-pulse' : ''}`} />
            {cfg.label}
          </span>
        </div>

        <h3 className="font-black text-[#1A2B4A] text-lg mb-2 leading-snug"
          style={{ fontFamily: 'var(--font-display), Poppins, sans-serif' }}>
          {election.title}
        </h3>
        {election.description && (
          <p className="text-sm text-slate-500 line-clamp-2 mb-4">{election.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date(election.votingStart).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {election._count?.candidates ?? 0} candidates
          </span>
        </div>

        {/* Vote progress bar (only for voting phase) */}
        {election.status === 'VOTING' && (
          <div className="mt-auto pt-3 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Votes cast</span>
              <span className="font-bold text-[#E8231A]">{election._count?.votes ?? 0}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs font-bold text-[#E8231A] mt-2">
          View details <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </motion.div>
    </Link>
  );
}
