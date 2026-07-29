'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

interface Props {
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
}

const STEPS = [
  { id: 1, title: 'Campaign identity', desc: 'Slogan and poster photo' },
  { id: 2, title: 'Vision & mission',  desc: 'Goals and plans' },
  { id: 3, title: 'Experience',        desc: 'Background and programme' },
];

export default function CandidateRegistrationForm({ onSubmit, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [vision,     setVision]     = useState('');
  const [mission,    setMission]    = useState('');
  const [experience, setExperience] = useState('');
  const [program,    setProgram]    = useState('');
  const [slogan,     setSlogan]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const canNext1 = slogan.length >= 0; // slogan optional
  const canNext2 = vision.length >= 50 && mission.length >= 50;

  const handleSubmit = async () => {
    if (!canNext2) {
      setError('Vision and mission must be at least 50 characters');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ vision, mission, experience, program, slogan });
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not register. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-[#1A2B4A]"
              style={{ fontFamily: 'var(--font-display), Poppins, sans-serif' }}>
              Register as a candidate
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Step {step} of {STEPS.length}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Progress stepper */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-0">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    step > s.id
                      ? 'bg-emerald-500 text-white'
                      : step === s.id
                        ? 'bg-[#E8231A] text-white shadow-md shadow-[#E8231A]/30'
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                  </div>
                  <p className={`text-[12px] font-bold mt-1 whitespace-nowrap ${
                    step === s.id ? 'text-[#C41E16]' : step > s.id ? 'text-emerald-700' : 'text-slate-600'
                  }`}>
                    {s.title}
                  </p>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full ${step > s.id ? 'bg-emerald-400' : 'bg-slate-100'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {/* Step 1 */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-600">
                  💡 A strong slogan makes you easier for voters to remember.
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Campaign slogan <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    maxLength={100}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-[#E8231A] focus:ring-2 focus:ring-[#E8231A]/10 outline-none transition-all"
                    placeholder="For example: Together forward, PPIA thrives"
                  />
                  <p className="text-xs text-slate-400 mt-1 text-right">{slogan.length}/100</p>
                </div>
              </motion.div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Vision <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={vision}
                    onChange={(e) => setVision(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-[#E8231A] focus:ring-2 focus:ring-[#E8231A]/10 outline-none resize-none transition-all"
                    placeholder="The big picture you want to achieve for PPIA Auckland..."
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-xs ${vision.length >= 50 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {vision.length >= 50 ? '✓ Meets the requirement' : `${vision.length}/50 characters minimum`}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Mission <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={mission}
                    onChange={(e) => setMission(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-[#E8231A] focus:ring-2 focus:ring-[#E8231A]/10 outline-none resize-none transition-all"
                    placeholder="The concrete steps you will take to achieve the vision..."
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-xs ${mission.length >= 50 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {mission.length >= 50 ? '✓ Meets the requirement' : `${mission.length}/50 characters minimum`}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Experience <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-[#E8231A] focus:ring-2 focus:ring-[#E8231A]/10 outline-none resize-none transition-all"
                    placeholder="Relevant organisational, leadership, or achievement experience..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Programme <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-[#E8231A] focus:ring-2 focus:ring-[#E8231A]/10 outline-none resize-none transition-all"
                    placeholder="The flagship programmes you will run if elected..."
                  />
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length ? (
            <button
              onClick={() => {
                if (step === 2 && !canNext2) {
                  setError('Vision and mission must be at least 50 characters');
                  return;
                }
                setError(null);
                setStep(s => s + 1);
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E8231A] hover:bg-[#C71E15] text-white font-bold text-sm transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canNext2}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E8231A] hover:bg-[#C71E15] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Submit registration</>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
