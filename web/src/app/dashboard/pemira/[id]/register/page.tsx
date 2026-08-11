'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui';
import {
  PageHero,
  PageStack,
  SectionCard,
  LoadingRows,
} from '@/components/dashboard';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Clock3,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import CandidateRegistrationCard from '@/components/pemira/CandidateRegistrationCard';
import type { ElectionFormField } from '@/lib/api-types';

interface Election {
  id: string;
  title: string;
  description?: string;
  status: string;
  registrationStart: string;
  registrationEnd: string;
}

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'Upcoming',
  REGISTRATION: 'Registration open',
  CAMPAIGN: 'Campaign',
  VOTING: 'Voting in progress',
  CLOSED: 'Closed',
  PUBLISHED: 'Completed',
};

export default function PemiraRegisterPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [election, setElection] = useState<Election | null>(null);
  const [formFields, setFormFields] = useState<ElectionFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Guard against a not-yet-hydrated route param producing a bogus
    // "/dashboard/pemira/undefined/..." URL.
    if (!params.id) {
      router.replace('/dashboard/pemira');
      return;
    }
    if (authLoading) return;
    // The dashboard root layout owns the unauthenticated redirect (it pushes
    // `/login?next=<encoded pathname>`), so this page must not push another
    // login URL — two competing pushes cause a redirect race that can land on
    // a wrong or "undefined" destination.
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const [electionRes, fieldsRes] = await Promise.all([
          api.getElection(params.id),
          api.getElectionFormFields(params.id),
        ]);
        if (cancelled) return;
        setElection(electionRes.election ?? electionRes);
        setFormFields(Array.isArray(fieldsRes) ? fieldsRes : fieldsRes.fields ?? []);
      } catch (e: unknown) {
        const message =
          e && typeof e === 'object' && 'response' in e
            ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
            : undefined;
        if (!cancelled) {
          setError(message || 'Could not load this election.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, isAuthenticated, authLoading, router]);

  const registrationOpen = election?.status === 'REGISTRATION';

  const registrationWindow = (() => {
    if (!election?.registrationStart || !election?.registrationEnd) return null;
    const start = new Date(election.registrationStart).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
    });
    const end = new Date(election.registrationEnd).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${start} – ${end}`;
  })();

  const handleSubmit = useCallback(async (data: Record<string, unknown>) => {
    try {
      await api.registerCandidate(election!.id, data);
      setSubmitted(true);
    } catch (e) {
      throw e;
    }
  }, [election]);

  if (authLoading) {
    return (
      <PageStack>
        <PageHero title="Register as a candidate" />
        <LoadingRows rows={4} />
      </PageStack>
    );
  }

  // Not authenticated: the dashboard layout is performing the redirect to
  // /login?next=<this page>. Render nothing to avoid flashing protected UI.
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <PageStack>
        <PageHero title="Register as a candidate" />
        <LoadingRows rows={4} />
      </PageStack>
    );
  }

  if (error || !election) {
    return (
      <PageStack>
        <PageHero title="Register as a candidate" />
        <SectionCard>
          <div className="p-8 text-center">
            <p className="text-sm text-red-600">{error ?? 'Election not found.'}</p>
            <div className="mt-4">
              <Link href="/dashboard/pemira">
                <Button variant="outline">Back to Pemira</Button>
              </Link>
            </div>
          </div>
        </SectionCard>
      </PageStack>
    );
  }

  if (submitted) {
    return (
      <PageStack>
        <div className="max-w-2xl mx-auto w-full">
          <SectionCard>
            <div className="px-6 py-12 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </span>
              <h2 className="mt-4 text-xl font-black text-[#1A2B4A]" style={{ fontFamily: 'var(--font-display), Poppins, sans-serif' }}>
                Registration submitted!
              </h2>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                Your candidacy for <strong>{election.title}</strong> has been
                submitted. The committee will review your application.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link href="/dashboard/pemira">
                  <Button variant="outline">Back to Pemira</Button>
                </Link>
                <Link href={`/dashboard/pemira/${election.id}`}>
                  <Button>View election</Button>
                </Link>
              </div>
            </div>
          </SectionCard>
        </div>
      </PageStack>
    );
  }

  return (
    <PageStack>
      <div>
        <Link
          href="/dashboard/pemira"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#E8231A] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Pemira
        </Link>
      </div>

      <PageHero
        eyebrow="PEMIRA · Registration"
        title={`Register as a candidate`}
        description={election.description || election.title}
        icon={UserPlus}
        actions={
          registrationOpen && registrationWindow ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-700 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              Open · {registrationWindow}
            </span>
          ) : null
        }
      />

      {!registrationOpen && (
        <SectionCard>
          <div className="p-6 text-center">
            <p className="text-sm text-slate-500">
              Registration for <strong>{election.title}</strong> is not open.
              {election.status ? ` Status: ${STATUS_LABEL[election.status] ?? election.status}.` : ''}
            </p>
            <div className="mt-4">
              <Link href="/dashboard/pemira">
                <Button variant="outline">Back to Pemira</Button>
              </Link>
            </div>
          </div>
        </SectionCard>
      )}

      {registrationOpen && (
        <div className="w-full">
          {/* Election context strip */}
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="chart-paper rounded-[6px] border border-[#DCE7F1] p-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                  <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Registration window
                  </p>
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                    {registrationWindow}
                  </p>
                </div>
              </div>
            </div>
            <div className="chart-paper rounded-[6px] border border-[#DCE7F1] p-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8231A]/10">
                  <ClipboardList className="h-4 w-4 text-[#E8231A]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Form fields
                  </p>
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                    {formFields.length > 0
                      ? `${formFields.length} custom field${formFields.length > 1 ? 's' : ''}`
                      : 'Standard form'}
                  </p>
                </div>
              </div>
            </div>
            <div className="chart-paper rounded-[6px] border border-[#DCE7F1] p-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
                  <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Review process
                  </p>
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                    Committee review
                  </p>
                </div>
              </div>
            </div>
            <div className="chart-paper rounded-[6px] border border-[#DCE7F1] p-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
                  <Clock3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Status
                  </p>
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                    {STATUS_LABEL[election.status] ?? election.status}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <CandidateRegistrationCard
            formFields={formFields}
            election={{ ...election, status: election.status }}
            onClose={() => router.push('/dashboard/pemira')}
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </PageStack>
  );
}