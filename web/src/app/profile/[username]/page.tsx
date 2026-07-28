'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  GraduationCap,
  MapPin,
  Building2,
  Globe,
  BookOpen,
  CalendarDays,
  FileText,
  Loader2,
  User as UserIcon,
} from 'lucide-react';
import api from '@/lib/api';

interface PublicUser {
  id: string;
  username: string;
  name: string;
  role: string;
  position?: string;
  avatar?: string;
  bio?: string;
  linkedIn?: string;
  instagram?: string;
  twitter?: string;
  university?: string;
  major?: string;
  degree?: string;
  createdAt: string;
  division?: { id: string; name: string; slug: string; color?: string };
  articles: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    imageUrl?: string;
    category: string;
    published: boolean;
    views?: number;
    likes?: number;
    createdAt: string;
  }>;
  researches: Array<{
    id: string;
    title: string;
    slug: string;
    abstract: string;
    publicationDate?: string;
    researchType: string;
    published: boolean;
    downloadCount: number;
    viewCount: number;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    slug: string;
    startDate: string;
    location?: string;
    imageUrl?: string;
    registeredAt: string;
    registrationStatus: string;
  }>;
}

// Inline social icons (lucide-react v1.x doesn't have brand icons)
const LinkedinIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const InstagramIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const XIcon = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const formatMonthYear = (date: string | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

const formatShortDate = (date: string | undefined): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const ROLE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', bg: 'bg-rose-100', text: 'text-rose-700' },
  BOARD: { label: 'Board', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  MEMBER: { label: 'Member', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username;

  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'articles' | 'research'>('events');

  useEffect(() => {
    if (!username) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getPublicProfile(username);
        setUser(res.user);
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } };
        if (e?.response?.status === 404) {
          setError('User not found');
        } else {
          setError('Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#E8231A]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <UserIcon className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">
            {error || 'Profile not found'}
          </h1>
          <p className="text-slate-500 mb-8">
            The profile you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#E8231A] hover:bg-[#C71E15] text-white font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const roleBadge = ROLE_BADGE[user.role] ?? ROLE_BADGE.MEMBER;
  const initials = (user.name || user.username || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hasArticles = user.articles.length > 0;
  const hasResearches = user.researches.length > 0;
  const hasEvents = user.events.length > 0;

  const positionLabel = user.position
    ? user.position.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <>
      {/* Banner spacer */}
      <div className="bg-gradient-to-r from-[#0D1B33] via-[#1a2d4a] to-[#0D1B33] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#E8231A] rounded-full blur-3xl -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#E8231A] rounded-full blur-3xl translate-y-1/2" />
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="h-1 w-20 bg-[#E8231A] rounded-full" />
        </div>
      </div>

      {/* Profile content */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column: Identity + Bio + Details */}
            <div className="lg:col-span-1 space-y-6">
              {/* Identity card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl border border-slate-200 p-6"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#E8231A] to-[#A31510] flex items-center justify-center text-white text-3xl font-black shadow-lg overflow-hidden border-4 border-white">
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.name}
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-slate-900">{user.name}</h2>
                  {positionLabel && (
                    <p className="text-sm text-slate-600 mt-1">{positionLabel}</p>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleBadge.bg} ${roleBadge.text}`}>
                      {roleBadge.label}
                    </span>
                    {user.division && (
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: user.division.color || '#475569' }}
                      >
                        {user.division.name}
                      </span>
                    )}
                  </div>

                  {/* Social icons */}
                  {(user.linkedIn || user.instagram || user.twitter) && (
                    <div className="flex gap-2 mt-5">
                      {user.linkedIn && (
                        <a
                          href={user.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-700"
                          title="LinkedIn"
                        >
                          <LinkedinIcon size={18} />
                        </a>
                      )}
                      {user.instagram && (
                        <a
                          href={user.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-700"
                          title="Instagram"
                        >
                          <InstagramIcon size={18} />
                        </a>
                      )}
                      {user.twitter && (
                        <a
                          href={user.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-700"
                          title="Twitter/X"
                        >
                          <XIcon size={18} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Bio */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-2xl border border-slate-200 p-6"
              >
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">About</h2>
                {user.bio ? (
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">{user.bio}</p>
                ) : (
                  <p className="text-slate-400 text-sm italic">No bio yet.</p>
                )}
              </motion.div>

              {/* Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="bg-white rounded-2xl border border-slate-200 p-6"
              >
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Details</h2>
                <dl className="space-y-3 text-sm">
                  {user.university && (
                    <div className="flex items-start gap-3">
                      <GraduationCap className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <dt className="text-xs text-slate-400">University</dt>
                        <dd className="text-slate-800 font-medium">{user.university}</dd>
                      </div>
                    </div>
                  )}
                  {user.major && (
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <dt className="text-xs text-slate-400">Major</dt>
                        <dd className="text-slate-800 font-medium">{user.major}</dd>
                      </div>
                    </div>
                  )}
                  {user.degree && (
                    <div className="flex items-start gap-3">
                      <Globe className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <dt className="text-xs text-slate-400">Degree</dt>
                        <dd className="text-slate-800 font-medium">{user.degree.replace(/_/g, ' ')}</dd>
                      </div>
                    </div>
                  )}
                  {user.division && (
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <dt className="text-xs text-slate-400">Division</dt>
                        <dd className="text-slate-800 font-medium">{user.division.name}</dd>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <dt className="text-xs text-slate-400">Joined</dt>
                      <dd className="text-slate-800 font-medium">{formatMonthYear(user.createdAt)}</dd>
                    </div>
                  </div>
                </dl>
              </motion.div>
            </div>

            {/* Right column: Activity tabs */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
              >
                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                  {[
                    { key: 'events', label: 'Events', icon: CalendarDays, count: user.events.length },
                    { key: 'articles', label: 'Articles', icon: FileText, count: user.articles.length },
                    { key: 'research', label: 'Research', icon: BookOpen, count: user.researches.length },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as 'events' | 'articles' | 'research')}
                      className={`flex-1 px-4 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                        activeTab === tab.key
                          ? 'text-[#E8231A] border-b-2 border-[#E8231A] bg-red-50/40'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="p-6">
                  {activeTab === 'events' && (
                    <>
                      {!hasEvents ? (
                        <div className="text-center py-12">
                          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 text-sm">No event registrations yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {user.events.map((evt) => (
                            <div
                              key={evt.id}
                              className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors"
                            >
                              {evt.imageUrl ? (
                                <Image
                                  src={evt.imageUrl}
                                  alt={evt.title}
                                  width={64}
                                  height={64}
                                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#E8231A] to-[#A31510] flex items-center justify-center shrink-0">
                                  <CalendarDays className="w-7 h-7 text-white" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-900 truncate">{evt.title}</h3>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatShortDate(evt.startDate)}
                                  </span>
                                  {evt.location && (
                                    <span className="inline-flex items-center gap-1 truncate">
                                      <MapPin className="w-3 h-3 shrink-0" />
                                      {evt.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                                  evt.registrationStatus === 'ATTENDED'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {evt.registrationStatus === 'ATTENDED' ? 'Attended' : 'Registered'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'articles' && (
                    <>
                      {!hasArticles ? (
                        <div className="text-center py-12">
                          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 text-sm">No articles published yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {user.articles.map((a) => (
                            <Link
                              key={a.id}
                              href={`/activities/news-articles/${a.slug}`}
                              className="block group rounded-xl border border-slate-100 hover:border-slate-200 overflow-hidden transition-colors"
                            >
                              {a.imageUrl && (
                                <div className="relative w-full h-32 bg-slate-100">
                                  <Image
                                    src={a.imageUrl}
                                    alt={a.title}
                                    width={400}
                                    height={128}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    unoptimized
                                  />
                                </div>
                              )}
                              <div className="p-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8231A]">
                                  {a.category}
                                </span>
                                <h3 className="font-bold text-slate-900 mt-1 line-clamp-2 group-hover:text-[#E8231A] transition-colors">
                                  {a.title}
                                </h3>
                                {a.excerpt && (
                                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{a.excerpt}</p>
                                )}
                                <p className="text-[11px] text-slate-400 mt-3">{formatShortDate(a.createdAt)}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {activeTab === 'research' && (
                    <>
                      {!hasResearches ? (
                        <div className="text-center py-12">
                          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 text-sm">No research published yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {user.researches.map((r) => (
                            <div
                              key={r.id}
                              className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                                  <BookOpen className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-slate-900">{r.title}</h3>
                                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.abstract}</p>
                                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                                    <span className="font-bold uppercase tracking-wider text-purple-600">
                                      {r.researchType.replace(/_/g, ' ')}
                                    </span>
                                    {r.publicationDate && (
                                      <span className="inline-flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatShortDate(r.publicationDate)}
                                      </span>
                                    )}
                                    <span>{r.viewCount} views</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
