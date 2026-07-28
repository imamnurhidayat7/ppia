'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { DatePicker } from '@/components/ui/DatePicker';
import { Eye, EyeOff, CheckCircle, AlertCircle, Upload, FileText, X, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

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

const inputCls = "w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F1B33] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#E8231A] focus:ring-4 focus:ring-[#E8231A]/10";
const selectCls = inputCls + " appearance-none";
const labelCls = "block text-sm font-medium text-[#0F1B33] mb-1.5";

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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally { setIsLoading(false); }
  };

  if (registrationOpen === null) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center" aria-busy="true">
        <p className="text-sm text-[#64748B]">Checking registration availability…</p>
      </main>
    );
  }

  if (!registrationOpen) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm">
          <Image src="/Logo-PPIA-2025-White.png" alt="PPIA Auckland" width={140} height={56} className="h-12 w-auto mx-auto invert" priority />
          <h1 className="mt-6 text-2xl font-black text-[#0F1B33]">Registration is currently closed</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#64748B]">
            Public membership applications are temporarily unavailable. Please contact PPIA Auckland if you need assistance.
          </p>
          <Link href="/contact" className="mt-6 inline-flex rounded-xl bg-[#E8231A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c91e16]">
            Contact us
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-[40%] relative overflow-hidden mesh-gradient items-center justify-center p-12">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10 max-w-sm text-center">
          <Image src="/Logo-PPIA-2025-White.png" alt="PPIA Auckland" width={180} height={72} className="h-14 w-auto mx-auto mb-10" priority />
          <h2 className="text-2xl font-black text-white leading-tight" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            Join 500+ Indonesian<br />students in Auckland
          </h2>
          <p className="mt-4 text-white/55 text-sm leading-relaxed">Free membership. Access to events, career resources, and a community that has your back.</p>
          {/* Step indicator */}
          <div className="mt-10 flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <button type="button" onClick={() => i < step && setStep(i as Step)} className={`h-8 w-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${i === step ? 'bg-white text-[#E8231A] scale-110' : i < step ? 'bg-white/30 text-white cursor-pointer hover:bg-white/50' : 'bg-white/10 text-white/40'}`}>{i + 1}</button>
                {i < 3 && <div className={`w-6 h-0.5 rounded ${i < step ? 'bg-white/50' : 'bg-white/15'}`} />}
              </div>
            ))}
          </div>
          <p className="mt-3 text-white/40 text-xs font-medium uppercase tracking-widest">{STEPS[step]}</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-6">
            <Link href="/"><Image src="/Logo-PPIA-2025-White.png" alt="PPIA Auckland" width={120} height={48} className="h-10 w-auto mx-auto invert" priority /></Link>
          </div>
          {/* Mobile step indicator */}
          <div className="lg:hidden flex items-center justify-center gap-1.5 mb-6">
            {STEPS.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-[#E8231A]' : i < step ? 'w-4 bg-[#E8231A]/40' : 'w-4 bg-[#E2E8F0]'}`} />)}
          </div>

          <h1 className="text-xl font-black text-[#0F1B33]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            {step === 0 && 'Create your account'}
            {step === 1 && 'Personal details'}
            {step === 2 && 'University info'}
            {step === 3 && 'Almost done'}
          </h1>
          <p className="text-[#64748B] mt-1 text-sm">Step {step + 1} of 4</p>

          {error && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            {/* Step 0: Account */}
            {step === 0 && (<>
              <div><label htmlFor="username" className={labelCls}>Username <span className="text-[#E8231A]">*</span></label><input id="username" name="username" required value={formData.username} onChange={set} className={inputCls} placeholder="Choose a username" autoComplete="username" /></div>
              <div><label htmlFor="password" className={labelCls}>Password <span className="text-[#E8231A]">*</span></label><div className="relative"><input id="password" name="password" type={showPassword ? 'text' : 'password'} required minLength={6} value={formData.password} onChange={set} className={inputCls + ' pr-11'} placeholder="Min 6 characters" autoComplete="new-password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F1B33]">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div>
              <div><label htmlFor="confirmPassword" className={labelCls}>Confirm password <span className="text-[#E8231A]">*</span></label><div className="relative"><input id="confirmPassword" name="confirmPassword" type={showConfirm ? 'text' : 'password'} required value={formData.confirmPassword} onChange={set} className={inputCls + ' pr-11'} placeholder="Re-enter password" autoComplete="new-password" /><button type="button" aria-label={showConfirm ? 'Hide password confirmation' : 'Show password confirmation'} onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F1B33]">{showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>{formData.confirmPassword && formData.password === formData.confirmPassword && <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1"><CheckCircle size={13}/>Match</p>}</div>
            </>)}

            {/* Step 1: Personal */}
            {step === 1 && (<>
              <div className="grid grid-cols-2 gap-4"><div><label htmlFor="firstName" className={labelCls}>First name <span className="text-[#E8231A]">*</span></label><input id="firstName" name="firstName" required value={formData.firstName} onChange={set} className={inputCls} placeholder="As on ID" autoComplete="given-name" /></div><div><label htmlFor="lastName" className={labelCls}>Last name</label><input id="lastName" name="lastName" value={formData.lastName} onChange={set} className={inputCls} placeholder="Optional" autoComplete="family-name" /></div></div>
              <div><label htmlFor="email" className={labelCls}>Personal email <span className="text-[#E8231A]">*</span></label><input id="email" name="email" type="email" required value={formData.email} onChange={set} className={inputCls} placeholder="you@gmail.com" autoComplete="email" /></div>
              <div><label htmlFor="phone" className={labelCls}>Phone <span className="text-[#E8231A]">*</span></label><input id="phone" name="phone" type="tel" required value={formData.phone} onChange={set} className={inputCls} placeholder="+64 or +62" autoComplete="tel" /></div>
            </>)}

            {/* Step 2: University */}
            {step === 2 && (<>
              <div className="grid grid-cols-2 gap-4"><div><label htmlFor="studentId" className={labelCls}>Student ID <span className="text-[#E8231A]">*</span></label><input id="studentId" name="studentId" required value={formData.studentId} onChange={set} className={inputCls} placeholder="12345678" /></div><div><label htmlFor="university" className={labelCls}>University <span className="text-[#E8231A]">*</span></label><input id="university" name="university" required value={formData.university} onChange={set} className={inputCls} placeholder="University of Auckland" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label htmlFor="universityEmail" className={labelCls}>Uni email <span className="text-[#E8231A]">*</span></label><input id="universityEmail" name="universityEmail" type="email" required value={formData.universityEmail} onChange={set} className={inputCls} placeholder="upi@aucklanduni.ac.nz" /></div><div><label htmlFor="upi" className={labelCls}>UPI <span className="text-[#E8231A]">*</span></label><input id="upi" name="upi" required value={formData.upi} onChange={set} className={inputCls} placeholder="abc123" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><label htmlFor="degree" className={labelCls}>Degree <span className="text-[#E8231A]">*</span></label><select id="degree" name="degree" value={formData.degree} onChange={set} className={selectCls}>{DEGREES.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}</select></div><div><label htmlFor="major" className={labelCls}>Major <span className="text-[#E8231A]">*</span></label><input id="major" name="major" required value={formData.major} onChange={set} className={inputCls} placeholder="Computer Science" /></div></div>
              <div className="grid grid-cols-2 gap-4"><div><DatePicker label="Graduation date *" value={formData.graduationDate} onChange={(d) => setFormData(p=>({...p, graduationDate: d}))} placeholder="Select" /></div><div><label htmlFor="funding" className={labelCls}>Funding</label><select id="funding" name="funding" value={formData.funding} onChange={set} className={selectCls}>{FUNDINGS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}</select></div></div>
              {/* LoA Upload */}
              <div><label className={labelCls}>LoA / CoE / LoG <span className="text-[#E8231A]">*</span></label><p className="text-xs text-[#94A3B8] mb-2">PDF, max 2 MB</p>{!loaCoeFile ? (<label htmlFor="loaCoe" className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#E2E8F0] bg-white py-6 cursor-pointer hover:border-[#E8231A] transition-colors"><Upload size={22} className="text-[#94A3B8]"/><span className="text-xs font-medium text-[#64748B]">Click to upload</span><input type="file" id="loaCoe" accept="application/pdf" onChange={handleLoaCoe} className="hidden"/></label>) : (<div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"><FileText size={18} className="text-emerald-600 shrink-0"/><span className="text-sm truncate flex-1">{loaCoeFile.name}</span><button type="button" aria-label="Remove uploaded document" onClick={()=>setLoaCoeFile(null)} className="text-[#94A3B8] hover:text-red-500"><X size={16}/></button></div>)}{loaCoeError && <p className="mt-1 text-xs text-red-600">{loaCoeError}</p>}</div>
            </>)}

            {/* Step 3: Confirm */}
            {step === 3 && (<>
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 space-y-2 text-sm">
                <p className="font-semibold text-[#0F1B33]">Review your info</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[#64748B]">
                  <span>Username</span><span className="text-[#0F1B33] font-medium">{formData.username}</span>
                  <span>Name</span><span className="text-[#0F1B33] font-medium">{formData.firstName} {formData.lastName}</span>
                  <span>Email</span><span className="text-[#0F1B33] font-medium truncate">{formData.email}</span>
                  <span>University</span><span className="text-[#0F1B33] font-medium truncate">{formData.university}</span>
                  <span>Degree</span><span className="text-[#0F1B33] font-medium">{formData.degree} — {formData.major}</span>
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 cursor-pointer"><input type="checkbox" name="consent" checked={formData.consent} onChange={set} className="mt-0.5 h-5 w-5 rounded border-gray-300 text-[#E8231A] focus:ring-[#E8231A]" /><span className="text-sm text-[#334155]">Register for UoA Engage (optional)</span></label>
              <label className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 cursor-pointer"><input type="checkbox" name="confirmation" required checked={formData.confirmation} onChange={set} className="mt-0.5 h-5 w-5 rounded border-gray-300 text-[#E8231A] focus:ring-[#E8231A]" /><span className="text-sm text-[#334155]">I agree to the <Link href="/legal/privacy-policy" className="font-semibold text-[#E8231A] hover:underline">Privacy Policy</Link> & <Link href="/legal/terms-of-service" className="font-semibold text-[#E8231A] hover:underline">Terms</Link> <span className="text-[#E8231A]">*</span></span></label>
            </>)}

            {/* Nav buttons */}
            <div className="flex items-center gap-3 pt-2">
              {step > 0 && (<button type="button" onClick={() => setStep((step - 1) as Step)} className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-5 py-3 text-sm font-medium text-[#0F1B33] hover:bg-[#F1F5F9] transition-colors"><ArrowLeft size={16}/>Back</button>)}
              {step < 3 ? (
                <button type="button" onClick={() => setStep((step + 1) as Step)} disabled={!canAdvance()} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#E8231A] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(232,35,26,0.5)] transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none">Continue <ArrowRight size={16}/></button>
              ) : (
                <button type="submit" disabled={isLoading || !canAdvance()} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#E8231A] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(232,35,26,0.5)] transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none">
                  {isLoading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"/> : <>Create account <ArrowRight size={16}/></>}
                </button>
              )}
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-[#64748B]">Already have an account? <Link href="/login" className="font-semibold text-[#E8231A] hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
