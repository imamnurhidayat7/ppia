'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  /** A confirmed task is running: spin, lock dismissal, announce. */
  busy?: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  showReasonInput?: boolean;
  defaultReason?: string;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  busy = false,
  title,
  message,
  confirmLabel = 'Yes, continue',
  cancelLabel = 'Cancel',
  variant = 'danger',
  showReasonInput,
  defaultReason = '',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [reason, setReason] = useState(defaultReason);

  const handleConfirm = () => {
    if (busy) return;
    onConfirm(showReasonInput ? reason : undefined);
    setReason('');
  };

  const handleCancel = () => {
    if (busy) return;
    setReason('');
    onCancel();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            aria-busy={busy || undefined}
          >
            {busy && (
              <p aria-live="polite" className="sr-only">
                Working, please wait…
              </p>
            )}
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 ${
              variant === 'danger' ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30'
            }`}>
              <div className="flex items-center gap-3">
                {variant === 'danger' ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
              </div>
              <button
                onClick={handleCancel}
                disabled={busy}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Close dialog"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                {message}
              </p>

              {showReasonInput && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Reason (optional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={handleCancel}
                disabled={busy}
                className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm hover:bg-slate-50 dark:bg-slate-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelLabel}
              </button>
              <button
                onClick={handleConfirm}
                disabled={busy}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white font-bold text-sm transition-colors disabled:cursor-wait disabled:opacity-80 ${
                  variant === 'danger'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                {busy && (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white"
                  />
                )}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
