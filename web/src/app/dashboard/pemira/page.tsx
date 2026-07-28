'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Badge, Button } from '@/components/ui';
import {
  EmptyBlock,
  LoadingRows,
  PageHero,
  PageStack,
  SectionCard,
  SectionHeading,
  StatTile,
  StatTileRow,
} from '@/components/dashboard';
import BallotCard from '@/components/pemira/BallotCard';
import ResultsBar from '@/components/pemira/ResultsBar';
import ElectionTimeline from '@/components/pemira/ElectionTimeline';
import CountdownTimer from '@/components/pemira/CountdownTimer';
import CandidateRegistrationForm from '@/components/pemira/CandidateRegistrationForm';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  History,
  Info,
  MessageSquare,
  RefreshCw,
  UserPlus,
  Vote,
} from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'Upcoming',
  REGISTRATION: 'Registration open',
  CAMPAIGN: 'Campaign',
  VOTING: 'Voting in progress',
  CLOSED: 'Closed',
  PUBLISHED: 'Completed',
};

const ACTIVE_STATUSES = ['REGISTRATION', 'CAMPAIGN', 'VOTING'];

interface Election {
  id: string;
  title: string;
  description?: string;
  status: string;
  registrationStart: string;
  registrationEnd: string;
  campaignStart: string;
  campaignEnd: string;
  votingStart: string;
  votingEnd: string;
  _count?: { candidates: number; votes: number };
}

interface ElectionsResponse {
  elections?: Election[];
}

interface MyVote {
  id: string;
  candidate?: { id: string; user?: { name?: string; avatar?: string } };
}

interface VoteResponse {
  vote?: MyVote | null;
}

interface ResultRow {
  id: string;
  name: string;
  avatar?: string;
  username: string;
  slogan?: string;
  voteCount: number;
  percentage: number;
}

interface ResultsResponse {
  results?: ResultRow[];
  totalVotes?: number;
}

interface Candidate {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  slogan?: string;
  rejectionReason?: string;
}

interface CandidatesResponse {
  candidates?: Candidate[];
}

interface CandidateRegistrationInput {
  vision: string;
  mission: string;
  experience?: string;
  program?: string;
  slogan?: string;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function ElectionItem({
  election,
  userId,
  nowMs,
}: {
  election: Election;
  userId?: string;
  nowMs: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [myVote, setMyVote] = useState<MyVote | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [myCandidate, setMyCandidate] = useState<Candidate | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const isRegistration =
    nowMs >= new Date(election.registrationStart).getTime() &&
    nowMs < new Date(election.registrationEnd).getTime();
  const isCampaign =
    nowMs >= new Date(election.campaignStart).getTime() &&
    nowMs < new Date(election.votingStart).getTime();
  const isVoting =
    nowMs >= new Date(election.votingStart).getTime() &&
    nowMs < new Date(election.votingEnd).getTime();
  const isClosed = nowMs >= new Date(election.votingEnd).getTime();

  const phaseIndex =
    isClosed || election.status === 'PUBLISHED'
      ? 4
      : isVoting
        ? 3
        : isCampaign
          ? 2
          : isRegistration
            ? 1
            : 0;

  const phases = [
    { key: 'upcoming', label: 'Upcoming', date: '—' },
    {
      key: 'reg',
      label: 'Registration',
      date: formatDate(election.registrationStart),
      dateEnd: formatDate(election.registrationEnd),
    },
    { key: 'campaign', label: 'Campaign', date: formatDate(election.campaignStart) },
    {
      key: 'voting',
      label: 'Voting',
      date: formatDate(election.votingStart),
      dateEnd: formatDate(election.votingEnd),
    },
    { key: 'closed', label: 'Completed', date: formatDate(election.votingEnd) },
  ];

  let countdownTarget: number | null = null;
  let countdownLabel = '';
  if (isRegistration) {
    countdownTarget = new Date(election.registrationEnd).getTime() - nowMs;
    countdownLabel = 'Registration closes in';
  } else if (isCampaign) {
    countdownTarget = new Date(election.votingStart).getTime() - nowMs;
    countdownLabel = 'Voting starts in';
  } else if (isVoting) {
    countdownTarget = new Date(election.votingEnd).getTime() - nowMs;
    countdownLabel = 'Voting ends in';
  }

  const loadDetails = useCallback(
    async (force = false) => {
      if (dataLoaded && !force) return;
      setDataLoaded(true);
      const [voteRes, resRes, candRes] = await Promise.allSettled([
        isVoting || isClosed ? api.getMyVote(election.id) : Promise.resolve(null),
        api.getElectionResults(election.id),
        api.getCandidates(election.id),
      ]);
      if (voteRes.status === 'fulfilled' && voteRes.value) {
        setMyVote((voteRes.value as VoteResponse).vote ?? null);
      }
      if (resRes.status === 'fulfilled') {
        setResults(resRes.value as ResultsResponse);
      }
      if (candRes.status === 'fulfilled') {
        const list = (candRes.value as CandidatesResponse).candidates || [];
        setMyCandidate(list.find((candidate) => candidate.userId === userId) ?? null);
      }
    },
    [dataLoaded, election.id, isClosed, isVoting, userId]
  );

  const handleRegister = async (data: CandidateRegistrationInput) => {
    await api.registerCandidate(election.id, data);
    setShowRegForm(false);
    setRegSuccess(true);
    await loadDetails(true);
  };

  const handleVote = async (candidateId: string) => {
    await api.castVote(election.id, candidateId);
    await loadDetails(true);
  };

  const handleToggle = () => {
    if (!expanded) loadDetails();
    setExpanded(!expanded);
  };

  const approvedCandidates = results?.results ?? [];
  const isActive = ACTIVE_STATUSES.includes(election.status);
  const panelId = `election-panel-${election.id}`;

  return (
    <SectionCard flush className={isActive ? 'border-[#E8231A]/40 dark:border-[#E8231A]/40' : undefined}>
      {isActive && <div className="h-1 bg-gradient-to-r from-[#E8231A] to-[#A31510]" />}

      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={
              isActive
                ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E8231A] text-white'
                : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800'
            }
          >
            <Vote className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold leading-tight text-slate-900 dark:text-slate-50">
              {election.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {STATUS_LABEL[election.status] ?? election.status}
              </span>
              {isActive && (
                <Badge variant="danger">
                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[#E8231A]" />
                  In progress
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {formatDate(election.votingStart)} – {formatDate(election.votingEnd)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/pemira/${election.id}`}
            target="_blank"
            aria-label={`View the public page for ${election.title}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            rightIcon={
              expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
            }
          >
            {expanded ? 'Close' : 'Details'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div id={panelId} className="space-y-5 border-t border-slate-100 p-5 dark:border-slate-800">
          {countdownTarget !== null && countdownTarget > 0 && (
            <CountdownTimer targetMs={countdownTarget} label={countdownLabel} />
          )}

          {myVote && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  Your vote has been recorded
                </p>
                <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                  You voted for{' '}
                  <span className="font-bold">{myVote.candidate?.user?.name || 'a candidate'}</span>
                </p>
              </div>
            </div>
          )}

          {myCandidate?.status === 'REJECTED' && !regSuccess && (
            <div className="space-y-3 rounded-2xl border border-danger-200 bg-danger-50 p-4 dark:border-danger-900/50 dark:bg-danger-900/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-500" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-danger-800 dark:text-danger-200">
                    Registration rejected
                  </p>
                  {myCandidate.rejectionReason && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-danger-700 dark:text-danger-300">
                      <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        <span className="font-bold">Reason: </span>
                        {myCandidate.rejectionReason}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              {isRegistration && (
                <Button
                  variant="danger"
                  size="sm"
                  className="w-full"
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                  onClick={() => {
                    setRegSuccess(false);
                    setShowRegForm(true);
                  }}
                >
                  Apply again
                </Button>
              )}
            </div>
          )}

          {myCandidate && myCandidate.status !== 'REJECTED' && (
            <div
              className={
                myCandidate.status === 'APPROVED'
                  ? 'flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20'
                  : 'flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20'
              }
            >
              <Info
                className={
                  myCandidate.status === 'APPROVED'
                    ? 'mt-0.5 h-5 w-5 shrink-0 text-emerald-500'
                    : 'mt-0.5 h-5 w-5 shrink-0 text-amber-500'
                }
              />
              <div className="min-w-0">
                <p
                  className={
                    myCandidate.status === 'APPROVED'
                      ? 'text-sm font-bold text-emerald-800 dark:text-emerald-200'
                      : 'text-sm font-bold text-amber-800 dark:text-amber-200'
                  }
                >
                  {myCandidate.status === 'APPROVED'
                    ? 'Your candidacy was approved'
                    : 'Awaiting committee approval'}
                </p>
                {myCandidate.slogan && (
                  <p className="mt-0.5 text-xs italic text-slate-600 dark:text-slate-300">
                    &ldquo;{myCandidate.slogan}&rdquo;
                  </p>
                )}
              </div>
            </div>
          )}

          {regSuccess && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                Registration submitted. Awaiting committee verification.
              </p>
            </div>
          )}

          {isRegistration && !myCandidate && !regSuccess && (
            <Button
              variant="primary"
              className="w-full"
              leftIcon={<UserPlus className="h-4 w-4" />}
              onClick={() => setShowRegForm(true)}
            >
              Register as a candidate
            </Button>
          )}

          {isVoting && !myVote && approvedCandidates.length > 0 && (
            <BallotCard
              candidates={approvedCandidates.map((row) => ({
                id: row.id,
                user: {
                  id: row.id,
                  name: row.name,
                  username: row.username,
                  avatar: row.avatar,
                },
                vision: '',
                mission: '',
                slogan: row.slogan,
                status: 'APPROVED',
              }))}
              onVote={handleVote}
            />
          )}

          {approvedCandidates.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                {isClosed || election.status === 'PUBLISHED' ? 'Final results' : 'Live results'}
              </p>
              <ResultsBar results={approvedCandidates} totalVotes={results?.totalVotes ?? 0} />
            </div>
          )}

          <ElectionTimeline phases={phases} currentIndex={phaseIndex} />
        </div>
      )}

      <AnimatePresence>
        {showRegForm && (
          <CandidateRegistrationForm
            onSubmit={handleRegister}
            onClose={() => setShowRegForm(false)}
          />
        )}
      </AnimatePresence>
    </SectionCard>
  );
}

export default function MemberPemiraPage() {
  const { user } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  /**
   * Phase calculations need a clock. It is captured once when the list arrives
   * so render stays pure, which React Compiler requires.
   */
  const [nowMs, setNowMs] = useState(0);

  const fetchElections = useCallback(async () => {
    try {
      const res = (await api.getElections()) as ElectionsResponse;
      setElections(res.elections || []);
    } catch (error) {
      console.error('Failed to fetch elections:', error);
    } finally {
      setNowMs(Date.now());
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchElections() only writes state after awaiting the network request; the
     linter cannot see past the await. */
  useEffect(() => {
    fetchElections();
  }, [fetchElections]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const active = elections.filter((election) => ACTIVE_STATUSES.includes(election.status));
  const upcoming = elections.filter((election) => election.status === 'UPCOMING');
  const past = elections.filter((election) => ['CLOSED', 'PUBLISHED'].includes(election.status));

  return (
    <PageStack>
      <PageHero
        eyebrow="Student election"
        title="PEMIRA"
        description="Follow each stage of the election, register as a candidate, and cast your vote."
        icon={Vote}
        actions={
          <Link
            href="/pemira"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <ExternalLink className="h-4 w-4" />
            Public page
          </Link>
        }
      />

      {!loading && elections.length > 0 && (
        <StatTileRow columns={3}>
          <StatTile label="In progress" value={active.length} tone="red" icon={Vote} />
          <StatTile label="Upcoming" value={upcoming.length} tone="amber" icon={AlertCircle} />
          <StatTile label="Completed" value={past.length} tone="emerald" icon={History} />
        </StatTileRow>
      )}

      {loading ? (
        <LoadingRows rows={3} />
      ) : elections.length === 0 ? (
        <SectionCard flush>
          <EmptyBlock
            icon={Vote}
            title="No elections yet"
            description="Keep an eye on this page, the PEMIRA schedule will be announced here."
          />
        </SectionCard>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <SectionHeading
                title="In progress"
                description="Stages that need your attention right now."
              />
              <div className="space-y-4">
                {active.map((election) => (
                  <ElectionItem
                    key={election.id}
                    election={election}
                    userId={user?.id}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <SectionHeading title="Upcoming" description="Not open yet, save the date." />
              <div className="space-y-4">
                {upcoming.map((election) => (
                  <ElectionItem
                    key={election.id}
                    election={election}
                    userId={user?.id}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <SectionHeading title="Completed" description="Past elections and their results." />
              <div className="space-y-4">
                {past.map((election) => (
                  <ElectionItem
                    key={election.id}
                    election={election}
                    userId={user?.id}
                    nowMs={nowMs}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageStack>
  );
}
