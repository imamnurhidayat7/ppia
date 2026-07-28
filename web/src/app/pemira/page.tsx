'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import ElectionCard from '@/components/pemira/ElectionCard';
import PageHeader from '@/components/PageHeader';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Vote, Users, Calendar, ShieldCheck } from 'lucide-react';

export default function PemiraListPage() {
  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getElections().then((res) => {
      setElections(res.elections || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const activeElection = elections.find(e =>
    ['REGISTRATION', 'CAMPAIGN', 'VOTING'].includes(e.status)
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />

      <PageHeader
        label="PPIA Auckland Democracy"
        title="PEMIRA"
        titleAccent="PPIA Auckland"
        description="The PPIA Auckland student body election. Your vote decides who leads the association next — an open, fair, and democratic process."
        breadcrumbs={[{ label: 'PEMIRA' }]}
      />

      {/* Stats bar */}
      <div className="bg-[#0D1B33] text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-3xl font-black text-[#E8231A]">{elections.length}</p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Total Elections</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-3xl font-black text-emerald-400">
                {elections.filter(e => ['REGISTRATION','CAMPAIGN','VOTING'].includes(e.status)).length}
              </p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">In Progress</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-3xl font-black text-amber-400">
                {elections.reduce((sum, e) => sum + (e._count?.candidates || 0), 0)}
              </p>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Total Candidates</p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 flex-1 w-full">

        {/* Active election highlight */}
        {activeElection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A2B4A] via-[#0D1B33] to-[#1A2B4A] p-8 md:p-12 shadow-2xl border border-white/10">
              {/* Decorative glow */}
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #E8231A, transparent 70%)', transform: 'translate(30%, -30%)' }} />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #E8231A, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8231A] text-white text-xs font-bold animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      IN PROGRESS
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white mb-2"
                    style={{ fontFamily: 'var(--font-display), Poppins, sans-serif' }}>
                    {activeElection.title}
                  </h2>
                  {activeElection.description && (
                    <p className="text-slate-400 text-sm max-w-lg">{activeElection.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {activeElection._count?.candidates || 0} candidates
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Vote className="w-4 h-4" />
                      {activeElection._count?.votes || 0} votes
                    </span>
                  </div>
                </div>
                <a
                  href={`/pemira/${activeElection.id}`}
                  className="flex-shrink-0 px-8 py-4 rounded-2xl bg-[#E8231A] hover:bg-[#C71E15] text-white font-black text-base transition-all shadow-lg hover:shadow-[0_0_20px_rgba(232,35,26,0.4)] hover:-translate-y-0.5"
                >
                  View Election →
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-xl font-black text-[#1A2B4A] mb-6"
            style={{ fontFamily: 'var(--font-display), Poppins, sans-serif' }}>
            How PEMIRA Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { icon: <Calendar className="w-5 h-5" />, step: '01', title: 'Registration', desc: 'Eligible PPIA members put themselves forward as candidates' },
              { icon: <Users className="w-5 h-5" />, step: '02', title: 'Campaign', desc: 'Candidates present their vision, mission, and work programme to members' },
              { icon: <Vote className="w-5 h-5" />, step: '03', title: 'Voting', desc: 'Every PPIA member votes online, securely and in secret' },
              { icon: <ShieldCheck className="w-5 h-5" />, step: '04', title: 'Results', desc: 'The outcome is announced openly to all members' },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E8231A]/10 text-[#E8231A] flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-xs font-black text-slate-300 tracking-widest">{item.step}</span>
                </div>
                <h3 className="font-bold text-[#1A2B4A] mb-1">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Elections list */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-[#1A2B4A]"
              style={{ fontFamily: 'var(--font-display), Poppins, sans-serif' }}>
              All Elections
            </h2>
            {!loading && (
              <span className="text-sm text-slate-500">{elections.length} elections</span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                    <div className="w-20 h-6 rounded-full bg-slate-200" />
                  </div>
                  <div className="w-3/4 h-5 rounded-lg bg-slate-200 mb-2" />
                  <div className="w-full h-4 rounded-lg bg-slate-100 mb-1" />
                  <div className="w-2/3 h-4 rounded-lg bg-slate-100 mb-4" />
                  <div className="flex gap-4">
                    <div className="w-24 h-3 rounded bg-slate-100" />
                    <div className="w-16 h-3 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : elections.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200"
            >
              <Vote className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="font-bold text-slate-400 text-lg">No elections yet</p>
              <p className="text-slate-400 text-sm mt-1">Check back for the next PEMIRA announcement</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {elections.map((e, idx) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <ElectionCard election={e} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
