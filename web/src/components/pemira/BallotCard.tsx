'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import CandidateCard from './CandidateCard';

interface Props {
  candidates: any[];
  onVote: (candidateId: string) => Promise<void>;
}

export default function BallotCard({ candidates, onVote }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCandidate = candidates.find(c => c.id === selectedId);

  const handleConfirm = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      await onVote(selectedId);
      setSuccess(true);
      setShowConfirm(false);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not cast your vote. Try again.');
      setShowConfirm(false);
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl border-2 border-emerald-300 p-10 text-center shadow-xl"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2">Vote submitted!</h3>
        <p className="text-slate-600">
          Thank you for taking part in PEMIRA PPIA Auckland 🗳️
        </p>
      </motion.div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1A2B4A] to-[#0D1B33] px-6 py-5">
        <h2 className="text-xl font-black text-white"
          style={{ fontFamily: 'var(--font-display), Poppins, sans-serif' }}>
          🗳️ Ballot
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Select one candidate, then confirm your vote.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Candidate grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              selected={selectedId === c.id}
              onSelect={() => setSelectedId(c.id)}
            />
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit button */}
        <button
          onClick={() => selectedId && setShowConfirm(true)}
          disabled={!selectedId || submitting}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#E8231A] to-[#A31510] hover:from-[#C71E15] hover:to-[#E8231A] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-base shadow-xl hover:shadow-[0_8px_25px_rgba(232,35,26,0.4)] transition-all"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Processing...</span>
          ) : selectedId ? (
            '🗳️ Cast my vote'
          ) : (
            'Select a candidate first'
          )}
        </button>
      </div>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showConfirm && selectedCandidate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[#E8231A]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🗳️</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-1">Confirm your choice</h3>
                <p className="text-sm text-slate-500">Your vote cannot be changed once confirmed</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-center">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Selected candidate</p>
                <p className="text-xl font-black text-[#1A2B4A]">{selectedCandidate.user.name}</p>
                {selectedCandidate.slogan && (
                  <p className="text-sm italic text-slate-500 mt-1">"{selectedCandidate.slogan}"</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[#E8231A] text-white font-bold hover:bg-[#C71E15] transition-colors disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Yes, confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
