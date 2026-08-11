'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Clock3,
  Quote,
  Building2,
  GraduationCap,
  BadgeCheck,
  User as UserIcon,
  FileText,
  LockKeyhole,
  Send,
} from 'lucide-react';
import DynamicFormField from './DynamicFormField';
import { useAuth } from '@/lib/auth-context';
import { FormGrid } from '@/components/dashboard';
import { Button } from '@/components/ui';
import type { ElectionFormField } from '@/lib/api-types';

interface Props {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  formFields?: ElectionFormField[];
  election?: {
    title: string;
    description?: string;
    registrationEnd?: string;
    status?: string;
  } | null;
}

type StepId = 'questions' | 'vision' | 'experience';

interface StepDef {
  id: StepId;
  title: string;
  desc: string;
  icon: typeof FileText;
}

function isEmpty(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    v === '' ||
    (Array.isArray(v) && v.length === 0)
  );
}

function getErrorMessage(e: unknown, fallback = 'Could not register. Try again.'): string {
  if (e && typeof e === 'object' && 'response' in e) {
    const r = (e as { response?: { data?: { error?: string } } }).response;
    if (r?.data?.error) return r.data.error;
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

function formatDeadline(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-NZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="data-type text-[11px] font-bold uppercase tracking-[0.14em] ink-muted">
      {children}
    </p>
  );
}

/** Numbered circular step indicator */
function StepDot({
  n,
  active,
  done,
}: {
  n: number;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors duration-200 ${
        done
          ? 'border-[#E8231A] bg-[#E8231A] text-white shadow-[0_4px_12px_rgba(232,35,26,0.25)]'
          : active
            ? 'border-[#E8231A] bg-white text-[#E8231A] shadow-[0_0_0_5px_rgba(232,35,26,0.08)] dark:bg-slate-900'
            : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : n}
    </div>
  );
}

function FieldCard({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: string | null;
}) {
  return (
    <div
      className={`rounded-[5px] border p-4 transition-colors ${
        error
          ? 'border-red-300 bg-red-50/40 dark:border-red-900/50 dark:bg-red-900/10'
          : 'border-[#DCE7F1] bg-[#F5FAFD]/60 focus-within:border-[#E8231A]/40 dark:border-slate-700 dark:bg-slate-800/30 dark:focus-within:border-[#E8231A]/50'
      }`}
    >
      {children}
    </div>
  );
}

function InfoStrip({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof FileText;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[5px] border border-[#E8231A]/15 bg-[#FFF5F5] p-4 dark:border-[#E8231A]/25 dark:bg-[#E8231A]/10">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8231A]/10">
        <Icon className="h-4 w-4 text-[#E8231A]" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

export default function CandidateRegistrationCard({
  onSubmit,
  onClose,
  formFields = [],
  election,
}: Props) {
  const { user } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Default fallback fields when admin hasn't configured any.
  const DEFAULT_FIELDS: ElectionFormField[] = [
    {
      id: '__vision__',
      electionId: '',
      type: 'FIELD_TEXT' as ElectionFormField['type'],
      label: 'Vision & Mission',
      description: 'Describe the big picture you want to achieve and how.',
      required: true,
      order: 0,
    },
    {
      id: '__experience__',
      electionId: '',
      type: 'FIELD_TEXT' as ElectionFormField['type'],
      label: 'Experience & Programme',
      description: 'Your relevant experience and flagship programmes.',
      required: true,
      order: 1,
    },
  ];

  const renderedFields: ElectionFormField[] =
    formFields.length > 0 ? formFields : DEFAULT_FIELDS;

  // One step for all fields.
  const STEPS: StepDef[] = [
    {
      id: 'questions' as const,
      title: 'Application form',
      desc: 'Fill in all fields',
      icon: FileText,
    },
  ];

  const totalSteps = STEPS.length;
  const currentStep = STEPS[Math.min(stepIndex, Math.max(totalSteps - 1, 0))];
  const CurrentStepIcon = currentStep?.icon ?? FileText;

  const stepReady = (() => {
    if (!currentStep) return true;
    return renderedFields
      .filter((f) => f.required)
      .every((f) => !isEmpty(fieldValues[f.id]));
  })();

  const handleNext = () => {
    if (!stepReady) {
      setError(
        currentStep?.id === 'questions'
          ? 'Please complete all required fields'
          : 'Vision and mission must be at least 50 characters'
      );
      return;
    }
    setError(null);
    setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
  };

  const validateAll = () => {
    const errs: Record<string, string | null> = {};
    let firstError: string | null = null;
    for (const f of renderedFields) {
      if (f.required && isEmpty(fieldValues[f.id])) {
        errs[f.id] = `"${f.label}" is required`;
        if (!firstError) firstError = errs[f.id]!;
      } else {
        errs[f.id] = null;
      }
    }
    setFieldErrors(errs);
    return firstError;
  };

  const handleSubmit = async () => {
    const validationError = validateAll();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      // Sync slogan/poster into dedicated columns if admin configured them.
      const _sf = formFields.find((f) => f.type === 'FIELD_TEXT' && /slogan/i.test(f.label));
      const _pf = formFields.find((f) => f.type === 'FIELD_IMAGE' && /(poster|photo|foto|gambar|image|pic)/i.test(f.label));
      if (_sf) payload.slogan = fieldValues[_sf.id] ?? null;
      if (_pf) payload.posterUrl = fieldValues[_pf.id] ?? null;
      if (formFields.length > 0) {
        payload.formResponses = formFields.map((f) => ({
          fieldId: f.id,
          value: fieldValues[f.id] ?? null,
        }));
      } else {
        payload.vision = fieldValues['__vision__'] ?? '';
        payload.mission = fieldValues['__vision__'] ?? '';
        payload.experience = fieldValues['__experience__'] ?? '';
        payload.program = fieldValues['__experience__'] ?? '';
      }
      await onSubmit(payload);
      setSuccess(true);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
      setSubmitting(false);
    }
  };

  const progressPct = ((stepIndex + 1) / totalSteps) * 100;
  const filledCount = renderedFields.filter(
    (f) => !isEmpty(fieldValues[f.id])
  ).length;

  const inputClasses =
    'w-full rounded-[5px] border border-[#DCE7F1] bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#E8231A]/40 focus:ring-4 focus:ring-[#E8231A]/8 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500';

  const _sfPreview = formFields.find((f) => f.type === 'FIELD_TEXT' && /slogan/i.test(f.label));
  const _pfPreview = formFields.find((f) => f.type === 'FIELD_IMAGE' && /(poster|photo|foto|gambar|image|pic)/i.test(f.label));
  const sloganValue =
    _sfPreview && typeof fieldValues[_sfPreview.id] === 'string'
      ? (fieldValues[_sfPreview.id] as string)
      : '';
  const posterValue =
    _pfPreview && typeof fieldValues[_pfPreview.id] === 'string'
      ? (fieldValues[_pfPreview.id] as string)
      : '';

  // Success state
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full"
      >
        <section className="chart-paper overflow-hidden rounded-[5px] border border-[#DCE7F1] dark:border-slate-800">
          <div className="h-1 w-full bg-gradient-to-r from-[#E8231A] via-[#F46A50] to-[#E8231A]" />
          <div className="flex flex-col items-center px-6 py-12 text-center sm:px-10">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8231A]/10"
            >
              <CheckCircle2 className="h-9 w-9 text-[#E8231A]" />
            </motion.div>
            <h2 className="font-display mt-5 text-2xl font-black tracking-tight ink-strong">
              Registration submitted!
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed ink-body">
              Your candidacy has been received and will be reviewed by the
              election committee. Keep an eye on your email for updates on
              the next steps.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Back to Pemira
              </Button>
              <Button leftIcon={<Send className="h-4 w-4" />} onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </section>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full"
    >
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* ================= Sidebar summary ================= */}
        <aside className="order-2 lg:order-1">
          <div className="chart-paper overflow-hidden rounded-[5px] border border-[#DCE7F1] dark:border-slate-800 lg:sticky lg:top-6">
            {/* Candidate identity */}
            <div className="border-b border-[#DCE7F1] p-5 dark:border-slate-800">
              <SectionLabel>Candidate</SectionLabel>
              {user ? (
                <div className="mt-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E8231A] to-[#A31C12] text-sm font-black text-white shadow-sm">
                      {user.name
                        ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
                        : 'C'}
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                        {user.name}
                        <BadgeCheck className="h-4 w-4 shrink-0 text-[#E8231A]" />
                      </p>
                      <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                        {[user.university, user.degree, user.major].filter(Boolean).join(' · ') || 'PPIA Member'}
                      </p>
                    </div>
                  </div>
                  {(user.university || user.major || user.studentId) && (
                    <div className="mt-4 space-y-2 border-t border-[#DCE7F1] pt-3 dark:border-slate-700">
                      {user.university && (
                        <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-[#E8231A]/60" />
                          <span className="truncate">{user.university}</span>
                        </div>
                      )}
                      {user.major && (
                        <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                          <GraduationCap className="h-3.5 w-3.5 shrink-0 text-[#E8231A]/60" />
                          <span className="truncate">{user.major}</span>
                        </div>
                      )}
                      {user.studentId && (
                        <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                          <UserIcon className="h-3.5 w-3.5 shrink-0 text-[#E8231A]/60" />
                          <span className="truncate">ID: {user.studentId}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 rounded-[5px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Sign in to register
                </div>
              )}
            </div>

            {/* Live campaign preview */}
            {(sloganValue || posterValue) && (
              <div className="border-b border-[#DCE7F1] p-5 dark:border-slate-800">
                <SectionLabel>Live preview</SectionLabel>
                {sloganValue && (
                  <div className="mt-3 flex items-start gap-2.5 rounded-[5px] border border-[#E8231A]/15 bg-[#FFF5F5] p-3.5 dark:border-[#E8231A]/25 dark:bg-[#E8231A]/10">
                    <Quote className="mt-0.5 h-4 w-4 shrink-0 text-[#E8231A]" />
                    <p className="text-sm font-semibold italic leading-snug text-slate-800 dark:text-slate-100">
                      &ldquo;{sloganValue}&rdquo;
                    </p>
                  </div>
                )}
                {posterValue && (
                  <div className="mt-3 overflow-hidden rounded-[5px] border border-[#DCE7F1] dark:border-slate-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={posterValue}
                      alt="Campaign poster preview"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Progress breakdown */}
            <div className="p-5">
              <div className="flex items-center justify-between">
                <SectionLabel>Progress</SectionLabel>
                <span className="data-type text-[11px] font-bold text-[#E8231A]">
                  {Math.round(Math.min(100, progressPct))}%
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#E8231A] to-[#F46A50]"
                  initial={false}
                  animate={{ width: `${Math.min(100, progressPct)}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <div className="mt-4 space-y-2.5">
                {STEPS.map((s, idx) => {
                  const done = stepIndex > idx;
                  const active = stepIndex === idx;
                  return (
                    <div key={s.id} className="flex items-center gap-2.5">
                      <StepDot n={idx + 1} active={active} done={done} />
                      <div className="min-w-0">
                        <p
                          className={`truncate text-[12px] font-bold ${
                            active
                              ? 'text-[#C41E16]'
                              : done
                                ? 'text-[#E8231A]'
                                : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {s.title}
                        </p>
                        {s.desc && (
                          <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                            {s.desc}
                          </p>
                        )}
                      </div>
                      {done && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-[#E8231A]" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* ================= Main form ================= */}
        <div className="order-1 lg:order-2">
          <section className="chart-paper overflow-hidden rounded-[5px] border border-[#DCE7F1] dark:border-slate-800">
            {/* top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-[#E8231A] via-[#F46A50] to-[#E8231A]" />

            {/* ---------- Header ---------- */}
            <header className="border-b border-[#DCE7F1] px-5 pb-5 pt-5 dark:border-slate-800 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0B1C2E] text-white"
                    style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22), 0 0 0 5px rgba(11,28,46,0.10)' }}
                  >
                    <CurrentStepIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <SectionLabel>Candidate registration</SectionLabel>
                    <h2 className="font-display text-lg font-bold tracking-tight ink-strong sm:text-xl">
                      {election?.title ?? 'PPIA election'}
                    </h2>
                    {election?.description && (
                      <p className="mt-0.5 text-sm leading-relaxed ink-body">
                        {election.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {election?.registrationEnd && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                      <Clock3 className="h-3.5 w-3.5" />
                      Closes {formatDeadline(election.registrationEnd)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    Secure form
                  </span>
                </div>
              </div>
            </header>

            {/* ---------- Body ---------- */}
            <div className="p-5 sm:p-6">
              <AnimatePresence mode="wait">
                {/* All fields in admin's configured order (or default virtual fields) */}
                {currentStep.id === 'questions' && (
                  <motion.div
                    key="step-questions"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    <InfoStrip
                      icon={FileText}
                      title="Complete all fields"
                      desc="Fill in every field below — responses are reviewed by the election committee."
                    />

                    <div className="mt-5">
                      <FormGrid columns={1}>
                        {renderedFields.map((field, i) => (
                          <motion.div
                            key={field.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06, duration: 0.25 }}
                          >
                            <FieldCard error={fieldErrors[field.id]}>
                              <div className="mb-3 flex items-center gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-500 ring-1 ring-[#DCE7F1] dark:bg-slate-900 dark:ring-slate-700">
                                  {i + 1}
                                </span>
                                <span className="data-type text-[11px] font-bold uppercase tracking-wide ink-muted">
                                  Question {i + 1}
                                </span>
                                {field.required && (
                                  <span className="rounded-full bg-[#E8231A]/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#E8231A]">
                                    Required
                                  </span>
                                )}
                              </div>
                              <DynamicFormField
                                field={field}
                                value={fieldValues[field.id]}
                                onChange={(v) =>
                                  setFieldValues((prev) => ({ ...prev, [field.id]: v }))
                                }
                                error={fieldErrors[field.id]}
                              />
                            </FieldCard>
                          </motion.div>
                        ))}
                      </FormGrid>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="flex items-start gap-2 overflow-hidden rounded-[5px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ---------- Footer actions ---------- */}
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE7F1] bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/30 sm:px-6">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  leftIcon={<ChevronLeft className="h-4 w-4" />}
                  onClick={() => (stepIndex > 0 ? setStepIndex((i) => i - 1) : onClose())}
                >
                  {stepIndex === 0 ? 'Cancel' : 'Back'}
                </Button>
              </div>

              <div className="flex items-center gap-3">
                {renderedFields.length > 0 && (
                  <span className="hidden text-[11px] font-semibold text-slate-400 dark:text-slate-500 sm:inline">
                    {filledCount}/{renderedFields.length} fields filled
                  </span>
                )}
                {stepIndex < totalSteps - 1 ? (
                  <Button
                    variant="primary"
                    rightIcon={<ChevronRight className="h-4 w-4" />}
                    onClick={handleNext}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    disabled={submitting}
                    leftIcon={
                      submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )
                    }
                    onClick={handleSubmit}
                  >
                    {submitting ? 'Submitting...' : 'Submit registration'}
                  </Button>
                )}
              </div>
            </footer>
          </section>
        </div>
      </div>
    </motion.div>
  );
}