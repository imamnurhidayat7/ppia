'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

export default function CountdownTimer({ targetMs, label }: { targetMs: number; label: string }) {
  const [remaining, setRemaining] = useState(Math.max(0, targetMs));

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  const days  = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const mins  = Math.floor((remaining / (1000 * 60)) % 60);
  const secs  = Math.floor((remaining / 1000) % 60);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="bg-gradient-to-br from-[#1A2B4A] to-[#0D1B33] rounded-2xl p-5 shadow-lg border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-[#E8231A]" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{label}</p>
      </div>

      {remaining <= 0 ? (
        <p className="text-center text-white font-bold text-sm py-2">Waktu habis</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: days,  label: 'Hari' },
            { value: hours, label: 'Jam' },
            { value: mins,  label: 'Menit' },
            { value: secs,  label: 'Detik' },
          ].map((item, idx) => (
            <div key={idx} className="text-center">
              <motion.div
                key={item.value}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="bg-white/10 rounded-xl py-3 mb-1.5"
              >
                <span className="text-2xl font-black text-white tabular-nums">{pad(item.value)}</span>
              </motion.div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
