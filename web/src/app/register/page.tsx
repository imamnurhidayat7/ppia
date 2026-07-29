'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  Eye,
  EyeOff,
  FileText,
  Sailboat,
  Upload,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import AuthShell, { AUTH_FIELD, AUTH_LABEL } from '@/components/auth/AuthShell';

const DEGREES = [
  { value: 'BACHELOR', label: 'Bachelor' },
  { value: 'MASTER', label: 'Master' },
  { value: 'DOCTORATE', label: 'Doctorate' },
  { value: 'NON_DEGREE', label: 'Non-Degree' },
];
const FUNDINGS = [
  { value: 'LPDP', label: 'LPDP' },
  { value: 'SELF_FUNDED', label: 'Self-Funded' },
  { value: 'SCHOLARSHIP', label: 'Scholarship' },
  { value: 'OTHER', label: 'Other' },
];

const STEPS = ['Account', 'Personal', 'University', 'Confirm'] as const;
type Step = 0 | 1 | 2 | 3;

const STEP_TITLE: Record<Step, string> = {
  0: 'Create your account',
  1: 'Personal details',
  2: 'University info',
  3: 'Almost done',
};

const inputCls = AUTH_FIELD;
const selectCls = `${AUTH_FIELD} appearance-none`;
const labelCls = AUTH_LABEL;

/** Required-field marker. Colour meets AA on the card; the text carries the meaning. */
function Req() {
  return (
    <span className="accent-label" aria-hidden="true">
      *
    </span>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(0);
  const [formData, setFormData] = useState({
    email: '', username: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', phone: '',
    studentId: '', university: '', universityEmail: '', upi: '',
    degree: 'BACHELOR', major: '', graduationDate: undefined as Date | undefined,
    funding: 'SELF_FUNDED', consent: false, confirmation: false,
  });
  const [loaCoeFile, setLoaCoeFile] = useState<File | null>(null);
  const [loaCoeError, setLoaCoeError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);
  const { register, user } = useAuth();
  const router = useRouter();

  useEffect(() => { if (user) router.replace('/dashboard'); }, [user, router]);
  useEffect(() => {
    api.getSettings()
      .then((result) => setRegistrationOpen(result?.settings?.allowPublicRegistration !== 'false'))
      // Fail open in the UI; the API remains the authoritative enforcement.
      .catch(() => setRegistrationOpen(true));
  }, []);

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleLoaCoe = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; setLoaCoeError('');
    if (!file) { setLoaCoeFile(null); return; }
    if (file.type !== 'application/pdf') { setLoaCoeError('Must be a PDF'); setLoaCoeFile(null); return; }
    if (file.size > 2 * 1024 * 1024) { setLoaCoeError('Max 2 MB'); setLoaCoeFile(null); return; }
    setLoaCoeFile(file);
  };

  const canAdvance = (): boolean => {
    if (step === 0) return !!(formData.username && formData.password && formData.confirmPassword && formData.password === formData.confirmPassword);
    if (step === 1) return !!(formData.firstName && formData.email && formData.phone);
    if (step === 2) return !!(formData.studentId && formData.university && formData.universityEmail && formData.upi && formData.major && formData.graduationDate && loaCoeFile);
    return formData.confirmation;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      let loaCoeUrl: string | undefined;
      if (loaCoeFile) {
        const fd = new FormData(); fd.append('file', loaCoeFile);
        const r = await api.uploadDocument(fd); loaCoeUrl = r.url;
      }
      await register({
        email: formData.email, username: formData.username, password: formData.password,
        firstName: formData.firstName, lastName: formData.lastName, phone: formData.phone,
        studentId: formData.studentId, university: formData.university,
        universityEmail: formData.universityEmail, upi: formData.upi,
        degree: formData.degree, major: formData.major,
        graduationDate: formData.graduationDate!.toISOString(),
        funding: formData.funding, consent: formData.consent,
        confirmation: formData.confirmation, loaCoe: loaCoeUrl,
      });
      router.push('/registration-pending');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Registration failed.');
    } finally { setIsLoading(false); }
  };

  if (registrationOpen === null) {
    // First paint, before the settings request resolves. Rendered inside the
    // same shell so the page does not flash a bare line of text and then jump
    // into a completely different layout.
    return (
      <AuthShell
        eyebrow="Join the crew"
        headline={
          <>
            Free membership
            <br />
            for Indonesian students
          </>
        }
        blurb="Events, career resources, and a community in Auckland that has your back."
      >
        <div
          className="text-center"
          aria-busy="true"
        >
          <span
            aria-hidden="true"
            className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-[#DCE7F1] border-t-[#C41E16]"
          />
          <p className="data-type mt-5 text-[12px] font-bold uppercase ink-muted">
            Checking registration availability…
          </p>
        </div>
      </AuthShell>
    );
  }

  if (!registrationOpen) {
    return (
      <AuthShell
        eyebrow="Registration"
        headline={<>Boarding is closed for now</>}
        blurb="Public membership applications are paused. The committee can still help you directly."
      >
        <div className="text-center">
          <h1 className="text-2xl font-black ink-strong" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            Registration is currently closed
          </h1>
          <span aria-hidden="true" className="rope-rule mx-auto mt-5 block w-24 opacity-70" />
          <p className="mt-5 text-[15px] leading-relaxed ink-body">
            Public membership applications are temporarily unavailable. Please contact PPIA Auckland if you need assistance.
          </p>
          <Link
            href="/contact"
            className="mt-7 inline-flex rounded-[4px] bg-[#C41E16] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#A81812]"
          >
            Contact us
          </Link>
        </div>
      </AuthShell>
    );
  }

  /**
   * Stage list for the panel: the four steps as legs of a crossing, with the
   * completed ones ticked. Only completed stages are clickable, matching the
   * original behaviour.
   */
  const stages = (
    <ol className="mx-auto max-w-xs space-y-3 text-left lg:mx-0 lg:max-w-none">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label}>
            <button
              type="button"
              onClick={() => done && setStep(i as Step)}
              disabled={!done}
              aria-current={current ? 'step' : undefined}
              className={`flex w-full items-center gap-3 rounded-[4px] px-2 py-1.5 text-left transition-colors ${
                done ? 'cursor-pointer hover:bg-white/10' : 'cursor-default'
              }`}
            >
              <span
                aria-hidden="true"
                className={`data-type flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                  current
                    ? 'bg-white text-[#0B1C2E]'
                    : done
                      ? 'bg-white/25 text-white'
                      : 'bg-white/10 text-white/60'
                }`}
              >
                {done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`data-type text-[12px] font-bold uppercase ${
                  current ? 'text-white' : done ? 'ink-body' : 'ink-muted'
                }`}
              >
                {label}
              </span>
              {current && <Sailboat size={14} aria-hidden="true" className="ml-auto shrink-0 text-[#FF8A80]" />}
            </button>
          </li>
        );
      })}
    </ol>
  );

  return (
    <AuthShell
      eyebrow="Join the crew"
      headline={
        <>
          Free membership
          <br />
          for Indonesian students
        </>
      }
      blurb="Events, career resources, and a community in Auckland that has your back. Four short steps."
      panelFooter={stages}
    >
      <div className="">
        <header>
          <p className="data-type accent-label text-[12px] font-bold uppercase">
            Step {step + 1} of 4 · {STEPS[step]}
          </p>
          <h1
            className="mt-2 text-2xl font-black ink-strong"
            style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
          >
            {STEP_TITLE[step]}
          </h1>

          {/* Progress as a filled rule, so the position is visible on mobile
              where the panel's stage list is collapsed. */}
          <div className="mt-4 flex gap-1.5" aria-hidden="true">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className="h-[3px] flex-1 rounded-full transition-colors"
                style={{ background: i <= step ? '#C41E16' : '#DCE7F1' }}
              />
            ))}
          </div>
          <span aria-hidden="true" className="rope-rule mt-5 block opacity-70" />
        </header>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-[4px] border border-[#F3C9C6] bg-[#FEF2F1] px-4 py-3 text-[14px]"
            style={{ color: '#8F120D' }}
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Step 0: Account */}
          {step === 0 && (<>
            <div><label htmlFor="username" className={labelCls}>Username <Req /></label><input id="username" name="username" required value={formData.username} onChange={set} className={inputCls} placeholder="Choose a username" autoComplete="username" /></div>
            <div><label htmlFor="password" className={labelCls}>Password <Req /></label><div className="relative"><input id="password" name="password" type={showPassword ? 'text' : 'password'} required minLength={6} value={formData.password} onChange={set} className={inputCls + ' pr-12'} placeholder="Min 6 characters" autoComplete="new-password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[3px] p-1 ink-muted transition-colors hover:ink-strong">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            <div><label htmlFor="confirmPassword" className={labelCls}>Confirm password <Req /></label><div className="relative"><input id="confirmPassword" name="confirmPassword" type={showConfirm ? 'text' : 'password'} required value={formData.confirmPassword} onChange={set} className={inputCls + ' pr-12'} placeholder="Re-enter password" autoComplete="new-password" /><button type="button" aria-label={showConfirm ? 'Hide password confirmation' : 'Show password confirmation'} onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[3px] p-1 ink-muted transition-colors hover:ink-strong">{showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{formData.confirmPassword && formData.password === formData.confirmPassword && <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-[#047857]"><CheckCircle size={14} aria-hidden="true" />Passwords match</p>}</div>
          </>)}

          {/* Step 1: Personal */}
          {step === 1 && (<>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label htmlFor="firstName" className={labelCls}>First name <Req /></label><input id="firstName" name="firstName" required value={formData.firstName} onChange={set} className={inputCls} placeholder="As on ID" autoComplete="given-name" /></div><div><label htmlFor="lastName" className={labelCls}>Last name</label><input id="lastName" name="lastName" value={formData.lastName} onChange={set} className={inputCls} placeholder="Optional" autoComplete="family-name" /></div></div>
            <div><label htmlFor="email" className={labelCls}>Personal email <Req /></label><input id="email" name="email" type="email" required value={formData.email} onChange={set} className={inputCls} placeholder="you@gmail.com" autoComplete="email" /></div>
            <div><label htmlFor="phone" className={labelCls}>Phone <Req /></label><input id="phone" name="phone" type="tel" required value={formData.phone} onChange={set} className={inputCls} placeholder="+64 or +62" autoComplete="tel" /></div>
          </>)}

          {/* Step 2: University */}
          {step === 2 && (<>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label htmlFor="studentId" className={labelCls}>Student ID <Req /></label><input id="studentId" name="studentId" required value={formData.studentId} onChange={set} className={inputCls} placeholder="12345678" /></div><div><label htmlFor="university" className={labelCls}>University <Req /></label><input id="university" name="university" required value={formData.university} onChange={set} className={inputCls} placeholder="University of Auckland" /></div></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label htmlFor="universityEmail" className={labelCls}>Uni email <Req /></label><input id="universityEmail" name="universityEmail" type="email" required value={formData.universityEmail} onChange={set} className={inputCls} placeholder="upi@aucklanduni.ac.nz" /></div><div><label htmlFor="upi" className={labelCls}>UPI <Req /></label><input id="upi" name="upi" required value={formData.upi} onChange={set} className={inputCls} placeholder="abc123" /></div></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label htmlFor="degree" className={labelCls}>Degree <Req /></label><select id="degree" name="degree" value={formData.degree} onChange={set} className={selectCls}>{DEGREES.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}</select></div><div><label htmlFor="major" className={labelCls}>Major <Req /></label><input id="major" name="major" required value={formData.major} onChange={set} className={inputCls} placeholder="Computer Science" /></div></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><DatePicker label="Graduation date *" value={formData.graduationDate} onChange={(d) => setFormData(p=>({...p, graduationDate: d}))} placeholder="Select" /></div><div><label htmlFor="funding" className={labelCls}>Funding</label><select id="funding" name="funding" value={formData.funding} onChange={set} className={selectCls}>{FUNDINGS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}</select></div></div>

            {/* LoA upload */}
            <div>
              <label className={labelCls}>LoA / CoE / LoG <Req /></label>
              <p className="data-type mb-2 text-[12px] uppercase ink-muted">PDF · max 2 MB</p>
              {!loaCoeFile ? (
                <label htmlFor="loaCoe" className="flex cursor-pointer flex-col items-center gap-2 rounded-[4px] border-2 border-dashed border-[#C3D2E0] bg-white py-7 transition-colors hover:border-[#C41E16]">
                  <Upload size={22} className="ink-muted" aria-hidden="true" />
                  <span className="text-[14px] font-medium ink-body">Click to upload</span>
                  <input type="file" id="loaCoe" accept="application/pdf" onChange={handleLoaCoe} className="hidden" />
                </label>
              ) : (
                <div className="flex items-center gap-3 rounded-[4px] border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3">
                  <FileText size={18} className="shrink-0 text-[#047857]" aria-hidden="true" />
                  <span className="flex-1 truncate text-[14px] ink-strong">{loaCoeFile.name}</span>
                  <button type="button" aria-label="Remove uploaded document" onClick={()=>setLoaCoeFile(null)} className="rounded-[3px] p-1 ink-muted transition-colors hover:text-[#B01812]"><X size={16} /></button>
                </div>
              )}
              {loaCoeError && <p className="mt-1.5 text-[13px] font-medium" style={{ color: '#B01812' }}>{loaCoeError}</p>}
            </div>
          </>)}

          {/* Step 3: Confirm */}
          {step === 3 && (<>
            {/* Review reads as a filled-in manifest rather than a grey box. */}
            <div className="rounded-[4px] border border-[#DCE7F1] bg-white p-5">
              <p className="data-type text-[12px] font-bold uppercase ink-muted">Review your details</p>
              <span aria-hidden="true" className="rope-rule my-3 block opacity-70" />
              <dl className="space-y-2.5 text-[15px]">
                {[
                  ['Username', formData.username],
                  ['Name', `${formData.firstName} ${formData.lastName}`.trim()],
                  ['Email', formData.email],
                  ['University', formData.university],
                  ['Degree', `${formData.degree} — ${formData.major}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4">
                    <dt className="data-type shrink-0 text-[12px] uppercase ink-muted">{label}</dt>
                    <dd className="min-w-0 truncate text-right font-semibold ink-strong">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-[4px] border border-[#DCE7F1] bg-white p-4">
              <input type="checkbox" name="consent" checked={formData.consent} onChange={set} className="mt-0.5 h-5 w-5 rounded border-[#C3D2E0] text-[#C41E16] focus:ring-[#C41E16]" />
              <span className="text-[15px] leading-relaxed ink-body">Register for UoA Engage (optional)</span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-[4px] border border-[#DCE7F1] bg-white p-4">
              <input type="checkbox" name="confirmation" required checked={formData.confirmation} onChange={set} className="mt-0.5 h-5 w-5 rounded border-[#C3D2E0] text-[#C41E16] focus:ring-[#C41E16]" />
              <span className="text-[15px] leading-relaxed ink-body">
                I agree to the{' '}
                <Link href="/legal/privacy-policy" className="accent-label font-semibold hover:underline">Privacy Policy</Link>
                {' '}&amp;{' '}
                <Link href="/legal/terms-of-service" className="accent-label font-semibold hover:underline">Terms</Link>{' '}
                <Req />
              </span>
            </label>
          </>)}

          {/* Navigation */}
          <div className="flex items-center gap-3 pt-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep((step - 1) as Step)} className="flex items-center gap-1.5 rounded-[4px] border border-[#C3D2E0] bg-white px-5 py-3 text-[15px] font-medium ink-strong transition-colors hover:bg-[#F5FAFD]">
                <ArrowLeft size={16} aria-hidden="true" />Back
              </button>
            )}
            {step < 3 ? (
              <button type="button" onClick={() => setStep((step + 1) as Step)} disabled={!canAdvance()} className="flex flex-1 items-center justify-center gap-2 rounded-[4px] bg-[#C41E16] px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_30px_-12px_rgba(196,30,22,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#A81812] disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
                Continue <ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <button type="submit" disabled={isLoading || !canAdvance()} className="flex flex-1 items-center justify-center gap-2 rounded-[4px] bg-[#C41E16] px-5 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_30px_-12px_rgba(196,30,22,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#A81812] disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
                {isLoading ? (
                  <>
                    <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Submitting…
                  </>
                ) : (
                  <>Create account <ArrowRight size={16} aria-hidden="true" /></>
                )}
              </button>
            )}
          </div>
        </form>

        <span aria-hidden="true" className="rope-rule mt-7 block opacity-70" />

        <p className="mt-5 text-center text-[15px] ink-body">
          Already have an account?{' '}
          <Link href="/login" className="accent-label font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
