'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Search, Loader2, Calendar, FileText, Users, X, ArrowRight } from 'lucide-react';

interface SearchEvent {
  id: string;
  title: string;
  slug: string;
  location: string;
}

interface SearchArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
}

interface SearchMember {
  id: string;
  name: string;
  university: string;
}

interface SearchResults {
  results?: {
    events?: { items: SearchEvent[]; count: number };
    articles?: { items: SearchArticle[]; count: number };
    members?: SearchMember[];
  };
}

interface SingleTabResult {
  id: string;
  title?: string;
  name?: string;
  slug?: string;
  location?: string;
  category?: string;
  university?: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'articles' | 'members'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const search = async () => {
      if (query.trim().length < 2) {
        setResults(null);
        return;
      }

      setLoading(true);
      try {
        const data = await api.search(query, activeTab === 'all' ? undefined : activeTab);
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, activeTab]);

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
  };

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'events', label: 'Events' },
    { id: 'articles', label: 'Articles' },
    { id: 'members', label: 'Members' }
  ] as const;

  return (
    <>
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:border-white/25 hover:text-white"
      >
        <Search size={16} />
        <span className="hidden sm:inline">Search</span>
        <kbd className="data-type hidden items-center gap-1 rounded border border-white/15 px-1.5 py-0.5 text-[12px] font-semibold sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            ref={containerRef}
            className="relative w-full max-w-2xl bg-[#1A2B4A] rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
              <Search size={20} className="text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events, articles, members..."
                className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-lg"
              />
              {loading && <Loader2 size={20} className="animate-spin text-gray-400" />}
              <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-3 py-2 border-b border-white/10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#E8231A] text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto">
              {!query || query.length < 2 ? (
                <div className="p-8 text-center text-gray-400">
                  <Search size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Start typing to search</p>
                  <p className="text-sm mt-2">Search for events, articles, or members</p>
                </div>
              ) : results ? (
                <div className="p-3">
                  {activeTab === 'all' ? (
                    <>
                      {/* Events */}
                      {(results.results?.events?.items?.length ?? 0) > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            <Calendar size={14} />
                            Events
                          </div>
                          {results.results?.events?.items?.slice(0, 3).map((event) => (
                            <Link
                              key={event.id}
                              href={`/activities/events/${event.slug}`}
                              onClick={handleClose}
                              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 transition-colors group"
                            >
                              <div className="w-10 h-10 rounded-lg bg-[#E8231A]/20 flex items-center justify-center">
                                <Calendar size={18} className="text-[#E8231A]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{event.title}</p>
                                <p className="text-gray-400 text-sm truncate">{event.location}</p>
                              </div>
                              <ArrowRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Articles */}
                      {(results.results?.articles?.items?.length ?? 0) > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            <FileText size={14} />
                            Articles
                          </div>
                          {results.results?.articles?.items?.slice(0, 3).map((article) => (
                            <Link
                              key={article.id}
                              href={`/activities/news-articles/${article.slug}`}
                              onClick={handleClose}
                              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 transition-colors group"
                            >
                              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <FileText size={18} className="text-purple-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{article.title}</p>
                                <p className="text-gray-400 text-sm truncate">{article.category}</p>
                              </div>
                              <ArrowRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* Members */}
                      {(results.results?.members?.length ?? 0) > 0 && (
                        <div>
                          <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            <Users size={14} />
                            Members
                          </div>
                          {results.results?.members?.slice(0, 3).map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                                {member.name?.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{member.name}</p>
                                <p className="text-gray-400 text-sm truncate">{member.university}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {results.results?.events?.count === 0 &&
                        results.results?.articles?.count === 0 &&
                        (results.results?.members?.length ?? 0) === 0 && (
                          <div className="p-8 text-center text-gray-400">
                            <p>No results found for &quot;{query}&quot;</p>
                          </div>
                        )}
                    </>
                  ) : (
                    /* Single Type Results */
                    <div>
                      {activeTab === 'events' && results.results?.events?.items?.map((item) => (
                        <Link
                          key={item.id}
                          href={`/activities/events/${item.slug}`}
                          onClick={handleClose}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-[#E8231A]/20 flex items-center justify-center">
                            <Calendar size={18} className="text-[#E8231A]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{item.title}</p>
                            <p className="text-gray-400 text-sm truncate">{item.location}</p>
                          </div>
                          <ArrowRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                        </Link>
                      ))}
                      {activeTab === 'articles' && results.results?.articles?.items?.map((item) => (
                        <Link
                          key={item.id}
                          href={`/activities/news-articles/${item.slug}`}
                          onClick={handleClose}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <FileText size={18} className="text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{item.title}</p>
                            <p className="text-gray-400 text-sm truncate">{item.category}</p>
                          </div>
                          <ArrowRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                        </Link>
                      ))}
                      {activeTab === 'members' && results.results?.members?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/10 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Users size={18} className="text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{item.name}</p>
                            <p className="text-gray-400 text-sm truncate">{item.university}</p>
                          </div>
                          <ArrowRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                        </div>
                      ))}
                      {((activeTab === 'events' && (results.results?.events?.items?.length ?? 0) === 0) ||
                        (activeTab === 'articles' && (results.results?.articles?.items?.length ?? 0) === 0) ||
                        (activeTab === 'members' && (results.results?.members?.length ?? 0) === 0)) && (
                        <div className="p-8 text-center text-gray-400">
                          <p>No results found for &quot;{query}&quot;</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10">↵</kbd> to select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10">esc</kbd> to close
                </span>
              </div>
              <span>Powered by PPIA Search</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
