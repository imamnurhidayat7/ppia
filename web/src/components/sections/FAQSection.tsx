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
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
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

function Accordion({
  item,
  isOpen,
  onToggle,
  accent,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  accent: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
        isOpen
          ? 'border-transparent bg-white shadow-[0_20px_50px_-24px_rgba(15,27,51,0.28)]'
          : 'border-[#E7EDF4] bg-[#FBFCFE] hover:border-[#D6DFEA] hover:bg-white'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-[15px] font-semibold leading-snug text-[#0F1B33]">
          {item.question}
        </span>
        {/* The chevron sits in a filled circle when open, so the expanded row is
            identifiable at a glance rather than only by its height. */}
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
          style={
            isOpen
              ? { background: accent, color: '#fff' }
              : { background: 'rgba(148,163,184,0.14)', color: '#94A3B8' }
          }
        >
          <ChevronDown
            size={15}
            className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
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
            <p className="px-6 pb-5 text-sm leading-relaxed text-slate-600">
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

  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="bg-white py-28">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading
          eyebrow="FAQ"
          title={heading}
          intro={intro}
          size="md"
          className="mb-12"
        />

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Accordion
                item={faq}
                isOpen={openId === faq.id}
                onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
                accent={colors.textAccent || '#E8231A'}
              />
            </motion.div>
          ))}
        </div>

        <p className="text-center mt-8 text-sm text-slate-400">
          More questions?{' '}
          <a href="/contact" className="font-semibold hover:underline" style={{ color: colors.textAccent }}>
            Get in touch
          </a>
        </p>
      </div>
    </section>
  );
}
