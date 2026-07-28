'use client';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface Phase {
  key: string;
  label: string;
  date: string;
  dateEnd?: string;
}

export default function ElectionTimeline({ phases, currentIndex }: { phases: Phase[]; currentIndex: number }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">
        Election Timeline
      </h3>
      <div className="relative">
        {/* Vertical connector */}
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100" />

        <div className="space-y-5">
          {phases.map((phase, idx) => {
            const isPast = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <motion.div
                key={phase.key}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-start gap-4 relative"
              >
                {/* Icon */}
                <div className="relative z-10 flex-shrink-0">
                  {isPast ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-8 h-8 rounded-full bg-[#E8231A] flex items-center justify-center shadow-lg shadow-[#E8231A]/30">
                      <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <Circle className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className={`font-bold text-sm leading-none ${
                    isCurrent ? 'text-[#E8231A]' : isPast ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {phase.label}
                    {isCurrent && (
                      <span className="ml-2 text-[10px] font-black bg-[#E8231A]/10 text-[#E8231A] px-2 py-0.5 rounded-full align-middle">
                        Now
                      </span>
                    )}
                  </p>
                  <p className={`text-xs mt-0.5 flex items-center gap-1 ${
                    isPast ? 'text-slate-400' : isCurrent ? 'text-slate-500' : 'text-slate-300'
                  }`}>
                    <Clock className="w-3 h-3" />
                    {phase.date}
                    {phase.dateEnd && <span className="text-slate-300">→ {phase.dateEnd}</span>}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
