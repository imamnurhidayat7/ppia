'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Mail, Loader2, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export default function NewsletterForm() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('idle');

    try {
      await api.subscribeNewsletter(email, name || undefined);
      setStatus('success');
      setMessage(t('footer.subscribed'));
      setEmail('');
      setName('');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : t('common.error');
      setStatus('error');
      setMessage(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h4 className="text-white font-semibold mb-4">{t('footer.subscribe')}</h4>
      <p className="text-gray-400 text-sm mb-4">{t('footer.subscribe_desc')}</p>

      {status === 'success' ? (
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-400 flex-shrink-0" />
          <p className="text-green-200 text-sm">{message}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-[#E8231A] transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.your_email')}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-[#E8231A] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-3 bg-[#E8231A] hover:bg-[#c91e16] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin text-white" />
              ) : (
                <Send size={20} className="text-white" />
              )}
            </button>
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{message}</span>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
