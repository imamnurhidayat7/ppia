'use client';

/**
 * FAQSection — 3-4 expandable questions shown before the Membership CTA.
 *
 * Answers the most common hesitation points so visitors don't have to navigate
 * away to the full FAQ page before registering.
 *
 * Data source: CMS landing section key "faq" → blocks of type FAQ.
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useLandingSection, getBlocksByType } from '@/lib/hooks/use-landing-section';
import { useLandingColors } from '@/lib/hooks/use-landing-colors';
import SectionHeading from './SectionHeading';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const DEFAULT_FAQS: FAQItem[] = [
  {
    id: '1',
    question: 'Is PPIA membership free?',
    answer: 'Yes — membership is completely free for all Indonesian students currently studying in Auckland, regardless of university or degree level.',
  },
  {
    id: '2',
    question: 'Do I need to be enrolled at a specific university?',
    answer: 'No. We welcome students from all Auckland institutions — University of Auckland, AUT, Massey (Albany campus), and any other accredited institution.',
  },
  {
    id: '3',
    question: 'What kind of events does PPIA organise?',
    answer: 'Everything from academic workshops and career networking to cultural nights, sports days, and social hangouts. We run 20+ events per year.',
  },
  {
    id: '4',
    question: 'How do I register?',
    answer: 'Click "Register" in the navigation bar, fill in the short form, and you\'re done. An admin will approve your account within 1-2 business days.',
  },
];

/**
 * One logbook entry.
 *
 * The rows are ruled lines in a ship's log rather than a stack of floating
 * rounded cards: a numbered entry on the left, the question written across the
 * rule, and the answer indented under it. The open row is marked by a solid
 * accent spine down its left edge, which is readable at a glance and does not
 * depend on the chevron.
 */
function LogEntry({
  item,
  index,
  isOpen,
  onToggle,
  accent,
}: {
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  accent: string;
}) {
  return (
    <div
      className={`relative overflow-hidden border-b border-[#D8E3EE] transition-colors duration-300 ${
        isOpen ? 'bg-white/70' : 'hover:bg-white/50'
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px] origin-top transition-transform duration-300"
        style={{ background: accent, transform: `scaleY(${isOpen ? 1 : 0})` }}
      />

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-baseline gap-4 py-5 pl-5 pr-4 text-left sm:gap-6"
      >
        <span
          className="data-type shrink-0 text-[12px] font-bold transition-colors"
          style={{ color: isOpen ? accent : '#94A3B8' }}
          aria-hidden="true"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="flex-1 text-[15px] font-semibold leading-snug text-[#0F1B33] sm:text-base">
          {item.question}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`mt-0.5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: isOpen ? accent : '#94A3B8' }}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-6 pl-[3.1rem] pr-6 text-sm leading-relaxed ink-body sm:pl-[4.25rem]">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQSection() {
  const { section } = useLandingSection('faq');
  const { colors } = useLandingColors();
  const [openId, setOpenId] = useState<string | null>(null);

  const faqs = useMemo<FAQItem[]>(() => {
    const cms = getBlocksByType(section?.blocks, 'FAQ');
    if (cms.length > 0) {
      return cms.map((b) => ({
        id: b.id,
        question: b.title || '',
        answer: b.content || b.subtitle || '',
      }));
    }
    return DEFAULT_FAQS;
  }, [section]);

  const heading = section?.title || 'Got questions?';
  const intro =
    section?.subtitle || 'Here are the answers to the things people ask most before joining.';
  // The eyebrow used to be the literal string 'FAQ' with no way to change it.
  const eyebrow = (section?.config?.badge as string | undefined) || 'FAQ';

  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="sea-shore relative overflow-hidden py-28">
      <div className="relative mx-auto max-w-3xl px-6">
        <SectionHeading
          eyebrow={eyebrow}
          title={heading}
          intro={intro}
          size="md"
          className="mb-12"
        />

        <div className="chart-paper overflow-hidden rounded-[5px] border border-[#D8E3EE] shadow-[0_24px_60px_-34px_rgba(7,19,33,0.4)]">
          <div className="flex items-center justify-between border-b border-[#D8E3EE] bg-white/40 px-5 py-3">
            <p className="data-type text-[12px] font-bold uppercase ink-muted">Log entries</p>
            <p className="data-type text-[12px] uppercase ink-muted">
              {String(faqs.length).padStart(2, '0')} total
            </p>
          </div>

          {faqs.map((faq, i) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="last:[&>div]:border-b-0"
            >
              <LogEntry
                item={faq}
                index={i}
                isOpen={openId === faq.id}
                onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
                accent={colors.textAccent || '#E8231A'}
              />
            </motion.div>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-slate-400">
          More questions?{' '}
          {/* Link, not <a>: an internal navigation with a plain anchor forces a
              full document reload and loses the client-side transition. */}
          <Link
            href="/contact"
            className="font-semibold hover:underline"
            style={{ color: colors.textAccent }}
          >
            Get in touch
          </Link>
        </p>
      </div>
    </section>
  );
}
