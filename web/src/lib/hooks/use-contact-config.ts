'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { ContactConfig, ContactChannel, ContactFAQ } from '@/lib/api-types';

interface UseContactConfigResult {
  channels: ContactChannel[];
  faqs: ContactFAQ[];
  loading: boolean;
}

const FALLBACK_CHANNELS: ContactChannel[] = [
  {
    icon: 'Mail',
    color: '#E8231A',
    label: 'Email Us',
    value: 'ppiauckland@gmail.com',
    sub: 'We reply within 1–2 business days',
    href: 'mailto:ppiauckland@gmail.com',
  },
  {
    icon: 'Instagram',
    color: '#C13584',
    label: 'Instagram',
    value: '@ppiauckland',
    sub: 'DM us for quick questions',
    href: 'https://instagram.com/ppiauckland',
  },
  {
    icon: 'MessageCircle',
    color: '#25D366',
    label: 'WhatsApp Community',
    value: 'Join our group',
    sub: 'Member announcements & discussions',
    href: '#membership',
  },
  {
    icon: 'MapPin',
    color: '#3B82F6',
    label: 'Location',
    value: 'Auckland, New Zealand',
    sub: 'Serving all Auckland universities',
    href: '#',
  },
];

const FALLBACK_FAQS: ContactFAQ[] = [
  {
    q: 'How do I join PPIA Auckland?',
    a: 'Registration is completely free. Click "Join" in the navigation bar, fill in the short form, and an admin will approve your account within 1–2 business days.',
  },
  {
    q: 'I\'m a new student arriving in Auckland — where do I start?',
    a: 'Check our Wiki PPIA page under Opportunities. It covers visas, accommodation, banking, phone plans, and everything else you need for your first weeks.',
  },
  {
    q: 'Can I propose an event or programme?',
    a: 'Absolutely. Fill in the contact form below with your idea, or reach out directly via Instagram DM. The committee reviews proposals every term.',
  },
  {
    q: 'Do you offer sponsorship or partnership opportunities?',
    a: 'Visit our Partnership page under Opportunities, or send an email to the address above with your proposal. We collaborate with NZ businesses, Indonesian organisations, and university departments.',
  },
  {
    q: 'How quickly will I get a response?',
    a: 'Most emails get a reply within 1–2 business days. For urgent matters, Instagram DM is the fastest way to reach us.',
  },
];

export function useContactConfig(): UseContactConfigResult {
  const [channels, setChannels] = useState<ContactChannel[]>(FALLBACK_CHANNELS);
  const [faqs, setFaqs] = useState<ContactFAQ[]>(FALLBACK_FAQS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.getSiteConfigByKey('contact');
        const config = res?.config as ContactConfig | undefined;
        if (!cancelled && config) {
          if (config.channels?.length) setChannels(config.channels);
          if (config.faqs?.length) setFaqs(config.faqs);
        }
      } catch {
        // use fallbacks
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { channels, faqs, loading };
}
