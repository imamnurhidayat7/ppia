'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';

export interface BlockDefinition {
  type: string;
  label: string;
  description: string;
  thumbnail: React.ReactNode;
  category: 'layout' | 'content' | 'media' | 'interactive';
}

const CategoryColors: Record<string, string> = {
  layout: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  content: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  media: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  interactive: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

// Thumbnail SVG previews untuk tiap block type
function HeroThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#EEF2FF" />
      <rect x="20" y="20" width="120" height="12" rx="3" fill="#6366F1" opacity="0.8" />
      <rect x="35" y="38" width="90" height="7" rx="2" fill="#94A3B8" />
      <rect x="50" y="52" width="60" height="7" rx="2" fill="#94A3B8" />
      <rect x="55" y="66" width="50" height="12" rx="6" fill="#6366F1" />
    </svg>
  );
}

function TextThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F8FAFC" />
      <rect x="15" y="15" width="130" height="7" rx="2" fill="#334155" />
      <rect x="15" y="28" width="120" height="5" rx="2" fill="#94A3B8" />
      <rect x="15" y="38" width="125" height="5" rx="2" fill="#94A3B8" />
      <rect x="15" y="48" width="110" height="5" rx="2" fill="#94A3B8" />
      <rect x="15" y="58" width="90" height="5" rx="2" fill="#94A3B8" />
    </svg>
  );
}

function ImageThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F1F5F9" />
      <rect x="15" y="15" width="65" height="60" rx="4" fill="#CBD5E1" />
      <rect x="90" y="20" width="55" height="7" rx="2" fill="#334155" />
      <rect x="90" y="33" width="50" height="5" rx="2" fill="#94A3B8" />
      <rect x="90" y="43" width="45" height="5" rx="2" fill="#94A3B8" />
      <rect x="90" y="63" width="40" height="10" rx="5" fill="#6366F1" />
      <circle cx="35" cy="38" r="8" fill="#94A3B8" opacity="0.6" />
      <path d="M15 60 L35 40 L55 55 L65 45 L80 60" stroke="white" strokeWidth="2" fill="none" />
    </svg>
  );
}

function VideoThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#1E293B" />
      <rect x="15" y="10" width="130" height="70" rx="6" fill="#334155" />
      <circle cx="80" cy="45" r="18" fill="#6366F1" opacity="0.9" />
      <polygon points="74,36 74,54 94,45" fill="white" />
    </svg>
  );
}

function StatsThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F8FAFC" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${10 + i * 38}, 20)`}>
          <rect width="30" height="50" rx="4" fill="#EEF2FF" />
          <rect x="7" y="12" width="16" height="8" rx="2" fill="#6366F1" opacity="0.8" />
          <rect x="5" y="26" width="20" height="4" rx="2" fill="#CBD5E1" />
          <rect x="7" y="34" width="16" height="4" rx="2" fill="#CBD5E1" />
        </g>
      ))}
    </svg>
  );
}

function CTAThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#6366F1" />
      <rect x="20" y="22" width="120" height="10" rx="3" fill="white" opacity="0.9" />
      <rect x="35" y="38" width="90" height="7" rx="2" fill="white" opacity="0.5" />
      <rect x="45" y="55" width="70" height="16" rx="8" fill="white" />
      <rect x="60" y="60" width="40" height="6" rx="2" fill="#6366F1" />
    </svg>
  );
}

function FeatureThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F8FAFC" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${10 + i * 50}, 15)`}>
          <rect width="42" height="60" rx="6" fill="#EEF2FF" />
          <circle cx="21" cy="20" r="10" fill="#6366F1" opacity="0.7" />
          <rect x="7" y="36" width="28" height="5" rx="2" fill="#334155" />
          <rect x="9" y="46" width="24" height="4" rx="2" fill="#CBD5E1" />
          <rect x="9" y="54" width="20" height="4" rx="2" fill="#CBD5E1" />
        </g>
      ))}
    </svg>
  );
}

function GalleryThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F1F5F9" />
      <rect x="10" y="10" width="45" height="33" rx="3" fill="#CBD5E1" />
      <rect x="60" y="10" width="45" height="33" rx="3" fill="#CBD5E1" />
      <rect x="110" y="10" width="40" height="33" rx="3" fill="#CBD5E1" />
      <rect x="10" y="48" width="45" height="33" rx="3" fill="#CBD5E1" />
      <rect x="60" y="48" width="45" height="33" rx="3" fill="#CBD5E1" />
      <rect x="110" y="48" width="40" height="33" rx="3" fill="#CBD5E1" />
    </svg>
  );
}

function AccordionThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F8FAFC" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(10, ${10 + i * 20})`}>
          <rect width="140" height="14" rx="3" fill={i === 0 ? '#EEF2FF' : '#F1F5F9'} />
          <rect x="8" y="4" width="80" height="6" rx="2" fill={i === 0 ? '#6366F1' : '#94A3B8'} opacity="0.7" />
          <rect x="125" y="4" width="12" height="6" rx="2" fill="#CBD5E1" />
        </g>
      ))}
    </svg>
  );
}

function TimelineThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F8FAFC" />
      <line x1="20" y1="15" x2="20" y2="75" stroke="#6366F1" strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(0, ${20 + i * 22})`}>
          <circle cx="20" cy="5" r="5" fill="#6366F1" />
          <rect x="35" y="0" width="100" height="5" rx="2" fill="#334155" />
          <rect x="35" y="8" width="70" height="4" rx="2" fill="#CBD5E1" />
        </g>
      ))}
    </svg>
  );
}

function TeamThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F8FAFC" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${15 + i * 38}, 15)`}>
          <circle cx="15" cy="15" r="13" fill="#EEF2FF" stroke="#6366F1" strokeWidth="1.5" />
          <circle cx="15" cy="12" r="5" fill="#6366F1" opacity="0.6" />
          <rect x="6" y="30" width="18" height="3" rx="1" fill="#334155" />
          <rect x="8" y="36" width="14" height="3" rx="1" fill="#CBD5E1" />
        </g>
      ))}
    </svg>
  );
}

function QuoteThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F8FAFC" />
      <text x="20" y="45" fontSize="40" fill="#6366F1" fontFamily="serif">"</text>
      <rect x="40" y="30" width="90" height="5" rx="2" fill="#334155" />
      <rect x="40" y="40" width="70" height="4" rx="2" fill="#94A3B8" />
      <rect x="55" y="58" width="50" height="3" rx="1" fill="#CBD5E1" />
    </svg>
  );
}

function DividerThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F8FAFC" />
      <rect x="20" y="40" width="50" height="2" fill="#CBD5E1" />
      <circle cx="80" cy="41" r="4" fill="#6366F1" />
      <rect x="90" y="40" width="50" height="2" fill="#CBD5E1" />
    </svg>
  );
}

function TableThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F8FAFC" />
      <rect x="15" y="15" width="130" height="60" rx="4" fill="none" stroke="#CBD5E1" />
      <rect x="15" y="15" width="130" height="14" fill="#6366F1" opacity="0.2" />
      <line x1="15" y1="29" x2="145" y2="29" stroke="#CBD5E1" />
      <line x1="15" y1="43" x2="145" y2="43" stroke="#CBD5E1" />
      <line x1="15" y1="57" x2="145" y2="57" stroke="#CBD5E1" />
      <line x1="58" y1="15" x2="58" y2="75" stroke="#CBD5E1" />
      <line x1="101" y1="15" x2="101" y2="75" stroke="#CBD5E1" />
    </svg>
  );
}

function ContactThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F8FAFC" />
      <rect x="15" y="15" width="130" height="60" rx="6" fill="#EEF2FF" />
      <rect x="25" y="25" width="50" height="5" rx="2" fill="#6366F1" />
      <rect x="25" y="35" width="80" height="3" rx="1" fill="#94A3B8" />
      <rect x="25" y="48" width="60" height="3" rx="1" fill="#CBD5E1" />
      <rect x="25" y="58" width="40" height="8" rx="4" fill="#6366F1" opacity="0.7" />
    </svg>
  );
}

function CountdownThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#6366F1" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${25 + i * 38}, 20)`}>
          <rect width="30" height="35" rx="6" fill="white" opacity="0.9" />
          <rect x="8" y="12" width="14" height="8" rx="2" fill="#6366F1" />
          <rect x="10" y="24" width="10" height="3" rx="1" fill="#94A3B8" />
        </g>
      ))}
    </svg>
  );
}

function SponsorThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F8FAFC" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={15 + (i % 3) * 45} y={15 + Math.floor(i / 3) * 30} width="35" height="22" rx="4" fill="#EEF2FF" stroke="#CBD5E1" />
      ))}
    </svg>
  );
}

function MapThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F0FDF4" />
      <path d="M0 45 Q40 30 80 50 T160 40 L160 90 L0 90 Z" fill="#86EFAC" opacity="0.5" />
      <path d="M30 0 L30 90 M70 0 L70 90 M110 0 L110 90" stroke="#CBD5E1" strokeWidth="1" />
      <path d="M0 25 L160 25 M0 60 L160 60" stroke="#CBD5E1" strokeWidth="1" />
      <circle cx="80" cy="40" r="8" fill="#EF4444" />
      <circle cx="80" cy="40" r="3" fill="white" />
    </svg>
  );
}

function NewsletterThumb() {
  return (
    <svg viewBox="0 0 160 90" className="w-full h-full" aria-hidden>
      <rect width="160" height="90" fill="#F8FAFC" />
      <rect x="20" y="25" width="120" height="40" rx="6" fill="#EEF2FF" />
      <rect x="30" y="30" width="60" height="5" rx="2" fill="#6366F1" />
      <rect x="30" y="42" width="50" height="8" rx="4" fill="white" stroke="#CBD5E1" />
      <rect x="85" y="42" width="35" height="8" rx="4" fill="#6366F1" />
    </svg>
  );
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  { type: 'HERO', label: 'Hero', description: 'Full-width banner with heading, text and a button', thumbnail: <HeroThumb />, category: 'layout' },
  { type: 'TEXT', label: 'Text', description: 'A block of formatted text', thumbnail: <TextThumb />, category: 'content' },
  { type: 'IMAGE', label: 'Image + text', description: 'An image beside a block of text', thumbnail: <ImageThumb />, category: 'media' },
  { type: 'VIDEO', label: 'Video', description: 'Embed a YouTube or Vimeo video', thumbnail: <VideoThumb />, category: 'media' },
  { type: 'STATISTIC', label: 'Statistic', description: 'Highlight a key number', thumbnail: <StatsThumb />, category: 'content' },
  { type: 'CTA_BUTTON', label: 'Call to action', description: 'Heading, text and a button', thumbnail: <CTAThumb />, category: 'interactive' },
  { type: 'FEATURE', label: 'Features', description: 'Grid of cards with icons', thumbnail: <FeatureThumb />, category: 'content' },
  { type: 'GALLERY', label: 'Gallery', description: 'Grid of photos', thumbnail: <GalleryThumb />, category: 'media' },
  { type: 'FAQ', label: 'FAQ', description: 'Expandable questions and answers', thumbnail: <AccordionThumb />, category: 'interactive' },
  { type: 'TIMELINE', label: 'Timeline', description: 'Milestones in chronological order', thumbnail: <TimelineThumb />, category: 'content' },
  { type: 'TEAM', label: 'Team', description: 'Grid of people with photos and roles', thumbnail: <TeamThumb />, category: 'content' },
  { type: 'QUOTE', label: 'Quote', description: 'A testimonial or quote with attribution', thumbnail: <QuoteThumb />, category: 'content' },
  { type: 'DIVIDER', label: 'Divider', description: 'Decorative separator between sections', thumbnail: <DividerThumb />, category: 'layout' },
  { type: 'TABLE', label: 'Table', description: 'Rows and columns of data', thumbnail: <TableThumb />, category: 'content' },
  { type: 'CONTACT', label: 'Contact', description: 'Contact details and social links', thumbnail: <ContactThumb />, category: 'interactive' },
  { type: 'COUNTDOWN', label: 'Countdown', description: 'Counts down to an event', thumbnail: <CountdownThumb />, category: 'interactive' },
  { type: 'SPONSOR', label: 'Sponsors', description: 'Grid of sponsor or partner logos', thumbnail: <SponsorThumb />, category: 'media' },
  { type: 'MAP', label: 'Map', description: 'Embed a Google Maps location', thumbnail: <MapThumb />, category: 'media' },
  { type: 'NEWSLETTER_FORM', label: 'Newsletter', description: 'Email signup form', thumbnail: <NewsletterThumb />, category: 'interactive' },
  { type: 'HEADING', label: 'Heading', description: 'Section heading with a subtitle', thumbnail: <TextThumb />, category: 'layout' },
  { type: 'CODE', label: 'Code', description: 'Code with syntax highlighting', thumbnail: <TextThumb />, category: 'content' },
  { type: 'SPACER', label: 'Spacer', description: 'Empty vertical gap between blocks', thumbnail: <TextThumb />, category: 'layout' },
  { type: 'SOCIAL_LINK', label: 'Social link', description: 'A social media link with an icon', thumbnail: <TextThumb />, category: 'interactive' },
  { type: 'COLUMNS', label: 'Columns', description: 'Two-column layout', thumbnail: <TextThumb />, category: 'layout' },
  { type: 'MEMBER_CARD', label: 'Member card', description: 'Member profile with photo and bio', thumbnail: <TextThumb />, category: 'content' },
];

interface BlockLibraryProps {
  onSelect: (type: string) => void;
  onClose: () => void;
  /** Block types that cannot be added again */
  disabledTypes?: string[];
}

export function BlockLibrary({ onSelect, onClose, disabledTypes = [] }: BlockLibraryProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'layout', label: 'Layout' },
    { key: 'content', label: 'Content' },
    { key: 'media', label: 'Media' },
    { key: 'interactive', label: 'Interactive' },
  ];

  const filtered = BLOCK_DEFINITIONS.filter((b) => {
    const matchSearch = b.label.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === 'all' || b.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Add a block</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Tutup library"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E8231A]"
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto shrink-0">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.key
                ? 'bg-[#E8231A] text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Block grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-400 mt-8">No matching blocks</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((block) => {
              const disabled = disabledTypes.includes(block.type);
              return (
                <button
                  key={block.type}
                  onClick={() => !disabled && onSelect(block.type)}
                  disabled={disabled}
                  className={`flex flex-col rounded-lg border-2 overflow-hidden transition-all text-left group ${
                    disabled
                      ? 'border-slate-200 dark:border-slate-700 opacity-40 cursor-not-allowed'
                      : 'border-slate-200 dark:border-slate-600 hover:border-[#E8231A] hover:shadow-md cursor-pointer'
                  }`}
                  title={disabled ? 'Already added to this page' : block.description}
                >
                  {/* Thumbnail */}
                  <div className="w-full aspect-video bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    {block.thumbnail}
                  </div>
                  {/* Info */}
                  <div className="p-2">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {block.label}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${CategoryColors[block.category]}`}>
                        {block.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
                      {block.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
