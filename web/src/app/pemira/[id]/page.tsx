'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageHeader from '@/components/PageHeader';
import CandidateCard from '@/components/pemira/CandidateCard';
import BallotCard from '@/components/pemira/BallotCard';
import ResultsBar from '@/components/pemira/ResultsBar';
import ElectionTimeline from '@/components/pemira/ElectionTimeline';
import CountdownTimer from '@/components/pemira/CountdownTimer';
import CandidateRegistrationForm from '@/components/pemira/CandidateRegistrationForm';
import {
  Loader2, Vote, Users, ArrowLeft, Trophy,
  UserPlus, AlertCircle, CheckCircle2, Info,
} from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'Upcoming',
  REGISTRATION: 'Registration Open',
  CAMPAIGN: 'Campaign',
  VOTING: 'Voting Open',
  CLOSED: 'Closed',
  PUBLISHED: 'Results Published',
};

// Dates follow the English-language interface, so en-NZ rather than id-ID.
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function ElectionDetailPage() {
  const { user, isAuthenticated } = useAuth();
  const params = useParams<{ id: string }>();
  const [election, setElection] = useState<any>(null);
  const [myVote, setMyVote] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRegForm, setShowRegForm] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'candidates' | 'about'>('candidates');

  const loadElection = async () => {
    try {
      const res = await api.getElection(params.id);
      setElection(res.election);
    } catch {}
    setLoading(false);
  };

  const loadResults = async () => {
    try {
      const res = await api.getElectionResults(params.id);
      setResults(res);
    } catch {}
  };

  const loadMyVote = async () => {
    try {
      const res = await api.getMyVote(params.id);
      setMyVote(res.vote);
    } catch {}
  };

  /* eslint-disable react-hooks/set-state-in-effect --
     the loaders only write state after awaiting the network; the linter cannot
     see past the call. Declared after the loaders on purpose, since referencing
     them earlier would read the consts before they are initialised. */
  useEffect(() => {
    if (!params?.id) return;
    loadElection();
    loadResults();
    if (isAuthenticated) loadMyVote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id, isAuthenticated]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleRegister = async (data: any) => {
    await api.registerCandidate(params.id, data);
    setShowRegForm(false);
    setRegSuccess(true);
    await loadElection();
  };

  const handleVote = async (candidateId: string) => {
    await api.castVote(params.id, candidateId);
    await loadMyVote();
    await loadResults();
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#E8231A]" />
        </div>
        <Footer />
      </div>
    );
  }

  /* ─── Not found ─── */
  if (!election) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          <Vote className="w-16 h-16 text-slate-200 mb-4" />
          <h2 className="text-xl font-black text-slate-700 mb-2">Election not found</h2>
          <Link href="/pemira" className="text-[#E8231A] font-bold text-sm hover:underline">
            ← Back to all elections
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  /* ─── Computed state ─── */
  const now = new Date();
  const isRegistration = now >= new Date(election.registrationStart) && now < new Date(election.registrationEnd);
  const isCampaign = now >= new Date(election.campaignStart) && now < new Date(election.votingStart);
  const isVoting = now >= new Date(election.votingStart) && now < new Date(election.votingEnd);
  const isClosed = now >= new Date(election.votingEnd);
  const isPublished = election.status === 'PUBLISHED';

  // Countdown: what's next?
  let countdownTarget: number | null = null;
  let countdownLabel = '';
  if (!isRegistration && now < new Date(election.registrationStart)) {
    countdownTarget = new Date(election.registrationStart).getTime() - now.getTime();
    countdownLabel = 'Registration opens in';
  } else if (isRegistration) {
    countdownTarget = new Date(election.registrationEnd).getTime() - now.getTime();
    countdownLabel = 'Registration closes in';
  } else if (isCampaign) {
    countdownTarget = new Date(election.votingStart).getTime() - now.getTime();
    countdownLabel = 'Voting starts in';
  } else if (isVoting) {
    countdownTarget = new Date(election.votingEnd).getTime() - now.getTime();
    countdownLabel = 'Voting ends in';
  }

  const phaseIndex =
    isClosed || isPublished ? 4
    : isVoting ? 3
    : isCampaign ? 2
    : isRegistration ? 1
    : 0;

  const phases = [
    { key: 'upcoming',     label: 'Upcoming',     date: '—' },
    { key: 'reg',          label: 'Registration', date: formatDate(election.registrationStart), dateEnd: formatDate(election.registrationEnd) },
    { key: 'campaign',     label: 'Campaign',     date: formatDate(election.campaignStart), dateEnd: formatDate(election.votingStart) },
    { key: 'voting',       label: 'Voting',       date: formatDate(election.votingStart), dateEnd: formatDate(election.votingEnd) },
    { key: 'closed',       label: 'Finished',     date: formatDate(election.votingEnd) },
  ];

  const approvedCandidates = (election.candidates || []).filter((c: any) => c.status === 'APPROVED');
  const myCandidacy = user ? (election.candidates || []).find((c: any) => c.userId === user.id) : null;
  const totalVotes = results?.totalVotes ?? 0;

  /* ─── Status badge ─── */
  const statusLabelText = STATUS_LABEL[election.status] ?? election.status;
  const statusBgClass =
    isVoting ? 'bg-emerald-500'
    : isRegistration ? 'bg-amber-500'
    : isCampaign ? 'bg-blue-500'
    : 'bg-slate-500';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      <PageHeader
        label="PEMIRA PPIA Auckland"
        title={election.title}
        description={election.description}
        breadcrumbs={[
          { label: 'PEMIRA', href: '/pemira' },
          { label: election.title },
        ]}
      />

      {/* Status strip */}
      <div className={`${statusBgClass} text-white py-3`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(isVoting || isRegistration) && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
            <span className="font-bold text-sm">{statusLabelText}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/80">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {approvedCandidates.length} candidates</span>
            <span className="flex items-center gap-1.5"><Vote className="w-4 h-4" /> {totalVotes} votes</span>
          </div>
        </div>
      </div>

      {/* Voted banner */}
      <AnimatePresence>
        {myVote && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border-b border-emerald-200"
          >
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3 text-emerald-700">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-semibold">
                You voted for <span className="font-black">{myVote.candidate?.user?.name}</span> on {formatDateTime(myVote.votedAt || '')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ─── Main column ─── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Registration success */}
            {regSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-5"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-800">Registration submitted</p>
                  <p className="text-sm text-emerald-700 mt-0.5">
                    Your candidacy is waiting for admin review. Check this page for status updates.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Registration CTA */}
            {isRegistration && isAuthenticated && !myCandidacy && !regSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-gradient-to-br from-[#1A2B4A] to-[#0D1B33] rounded-3xl p-6 shadow-xl"
              >
                <div className="absolute top-0 right-0 w-48 h-48 opacity-10 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, #E8231A, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus className="w-5 h-5 text-[#E8231A]" />
                      <span className="text-xs font-black text-[#E8231A] uppercase tracking-wider">Registration Open</span>
                    </div>
                    <h3 className="text-lg font-black text-white mb-1">Want to stand as a candidate?</h3>
                    <p className="text-sm text-slate-400">
                      Register before {formatDate(election.registrationEnd)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRegForm(true)}
                    className="flex-shrink-0 px-6 py-3 rounded-xl bg-[#E8231A] hover:bg-[#C71E15] text-white font-bold text-sm transition-all hover:-translate-y-0.5 shadow-lg"
                  >
                    Register now
                  </button>
                </div>
              </motion.div>
            )}

            {/* My candidacy status */}
            {myCandidacy && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-amber-200 p-5 flex items-start gap-3"
              >
                <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-800">Your candidacy</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Current status:{' '}
                    <span className={`font-bold ${
                      myCandidacy.status === 'APPROVED' ? 'text-emerald-600'
                      : myCandidacy.status === 'REJECTED' ? 'text-red-600'
                      : 'text-amber-600'
                    }`}>
                      {myCandidacy.status === 'APPROVED' ? 'Approved ✓'
                        : myCandidacy.status === 'REJECTED' ? 'Rejected ✗'
                        : 'Waiting for admin approval…'}
                    </span>
                  </p>
                </div>
              </motion.div>
            )}

            {/* Not logged in during voting */}
            {isVoting && !isAuthenticated && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <Link href="/login" className="font-bold underline">Sign in</Link> to cast your vote in this election.
                </p>
              </div>
            )}

            {/* Ballot (voting phase, not yet voted) */}
            {isVoting && !myVote && approvedCandidates.length > 0 && (
              <BallotCard candidates={approvedCandidates} onVote={handleVote} />
            )}

            {/* Candidates section */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setActiveTab('candidates')}
                  className={`flex-1 py-4 text-sm font-bold transition-colors ${
                    activeTab === 'candidates'
                      ? 'text-[#E8231A] border-b-2 border-[#E8231A]'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Candidates ({approvedCandidates.length})
                </button>
                <button
                  onClick={() => setActiveTab('about')}
                  className={`flex-1 py-4 text-sm font-bold transition-colors ${
                    activeTab === 'about'
                      ? 'text-[#E8231A] border-b-2 border-[#E8231A]'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Election info
                </button>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'candidates' ? (
                    <motion.div
                      key="candidates"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {approvedCandidates.length === 0 ? (
                        <div className="text-center py-16">
                          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                          <p className="font-bold text-slate-400">No approved candidates yet</p>
                          <p className="text-sm text-slate-400 mt-1">
                            {isRegistration
                              ? 'Candidate registration is currently open.'
                              : 'Keep an eye on this page.'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {approvedCandidates.map((c: any, idx: number) => (
                            <motion.div
                              key={c.id}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.06 }}
                            >
                              <CandidateCard
                                candidate={{ ...c, candidateNumber: idx + 1 }}
                              />
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="about"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Registration opens', value: formatDate(election.registrationStart) },
                          { label: 'Registration closes', value: formatDate(election.registrationEnd) },
                          { label: 'Campaign starts', value: formatDate(election.campaignStart) },
                          { label: 'Voting starts', value: formatDate(election.votingStart) },
                          { label: 'Voting ends', value: formatDate(election.votingEnd) },
                          { label: 'Status', value: statusLabelText },
                        ].map(item => (
                          <div key={item.label} className="bg-slate-50 rounded-xl p-4">
                            <p className="text-[12px] font-black text-slate-600 uppercase tracking-wider mb-1">{item.label}</p>
                            <p className="text-sm font-bold text-slate-800">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ─── Sidebar ─── */}
          <div className="space-y-5">
            {/* Countdown */}
            {countdownTarget !== null && countdownTarget > 0 && (
              <CountdownTimer targetMs={countdownTarget} label={countdownLabel} />
            )}

            {/* Timeline */}
            <ElectionTimeline phases={phases} currentIndex={phaseIndex} />

            {/* Results */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="font-black text-sm text-slate-700">
                  {isClosed || isPublished ? 'Final results' : 'Live results'}
                </h3>
              </div>
              <div className="p-5">
                <ResultsBar
                  results={results?.results ?? []}
                  totalVotes={results?.totalVotes ?? 0}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Registration form modal */}
      <AnimatePresence>
        {showRegForm && (
          <CandidateRegistrationForm
            onSubmit={handleRegister}
            onClose={() => setShowRegForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
