'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Crown, Trophy } from 'lucide-react';
import { API_ORIGIN } from '@/lib/api-base';

interface Result {
  id: string;
  name: string;
  avatar?: string;
  username: string;
  slogan?: string;
  voteCount: number;
  percentage: number;
}

const API_BASE_URL = API_ORIGIN;
function getFullUrl(url?: string | null) {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
}

export default function ResultsBar({ results, totalVotes }: { results: Result[]; totalVotes: number }) {
  if (totalVotes === 0 || results.length === 0) {
    return (
      <div className="text-center py-10">
        <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">No votes cast yet.</p>
      </div>
    );
  }

  const maxVotes = Math.max(...results.map(r => r.voteCount));

  return (
    <div className="space-y-3">
      {results.map((r, idx) => {
        const isLeader = r.voteCount === maxVotes && r.voteCount > 0;
        return (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.08 }}
            className={`rounded-2xl border p-4 transition-all ${
              isLeader
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                : 'bg-white border-slate-100'
            }`}
          >
            <div className="flex items-center gap-3 mb-2.5">
              {/* Rank badge */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                idx === 0
                  ? 'bg-amber-400 text-white'
                  : idx === 1
                    ? 'bg-slate-300 text-slate-700'
                    : idx === 2
                      ? 'bg-orange-400 text-white'
                      : 'bg-slate-100 text-slate-500'
              }`}>
                {idx === 0 ? <Crown className="w-3.5 h-3.5" /> : `#${idx + 1}`}
              </div>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A2B4A] to-[#E8231A] flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                {r.avatar ? (
                  <Image
                    src={getFullUrl(r.avatar) || ''}
                    alt={r.name}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  r.name.charAt(0).toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-sm truncate">{r.name}</p>
                  {isLeader && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                </div>
                {r.slogan && <p className="text-[12px] italic text-slate-600 truncate">"{r.slogan}"</p>}
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-black text-[#E8231A] leading-none">{r.voteCount}</p>
                <p className="text-xs text-slate-400">{r.percentage.toFixed(1)}%</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${isLeader ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-[#E8231A] to-[#A31510]'}`}
                initial={{ width: 0 }}
                animate={{ width: `${r.percentage}%` }}
                transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        );
      })}

      <div className="flex items-center justify-center gap-2 pt-2 text-sm text-slate-400">
        <Trophy className="w-4 h-4" />
        <span>Total votes: <span className="font-black text-slate-900">{totalVotes}</span></span>
      </div>
    </div>
  );
}
