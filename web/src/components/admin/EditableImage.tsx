'use client';

/**
 * EditableImage
 *
 * Renders an image normally. On hover shows an edit overlay.
 * Clicking opens a panel to upload a new image or paste a URL.
 */

import { useState, useRef } from 'react';
import { Upload, Link2, X, Loader2, ImageIcon } from 'lucide-react';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

interface EditableImageProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
  /** Render as background-image div instead of <img> */
  asBackground?: boolean;
  style?: React.CSSProperties;
  alt?: string;
  placeholder?: string;
}

export function EditableImage({
  value,
  onChange,
  className = '',
  asBackground = false,
  style,
  alt = '',
  placeholder = 'Click to add an image',
}: EditableImageProps) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const res = await api.uploadImage(file);
      onChange(res.url);
      setOpen(false);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput('');
    setOpen(false);
  };

  const imageUrl = value ? getImageUrl(value) : '';

  const overlay = (
    <button
      onClick={() => setOpen(true)}
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity z-10 cursor-pointer group"
    >
      <div className="bg-white/90 rounded-lg px-3 py-2 flex items-center gap-2 text-sm font-medium text-slate-700 shadow">
        <ImageIcon size={14} />
        Replace image
      </div>
    </button>
  );

  const empty = (
    <button
      onClick={() => setOpen(true)}
      className={`${className} flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-700 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors gap-2 text-slate-400 text-sm`}
      style={style}
    >
      <ImageIcon size={20} />
      {placeholder}
    </button>
  );

  const panel = open && (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Replace image</h3>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-4">
          {(['upload', 'url'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${tab === t ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {t === 'upload' ? 'Upload a file' : 'Paste a URL'}
            </button>
          ))}
        </div>

        {tab === 'upload' && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:border-[#E8231A] hover:text-[#E8231A] transition-colors"
            >
              {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
              <span className="text-sm">{uploading ? 'Uploading...' : 'Click to choose an image file'}</span>
            </button>
          </div>
        )}

        {tab === 'url' && (
          <div className="space-y-3">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E8231A]"
              autoFocus
            />
            <button
              onClick={handleUrlSubmit}
              className="w-full py-2 bg-[#E8231A] hover:bg-[#C41E16] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Use this URL
            </button>
          </div>
        )}

        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

        {/* Current image preview */}
        {value && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Current image:</p>
            {/* Plain <img> on purpose. This is the in-place CMS editor: the
                preview shows whatever URL an editor has just pasted, including
                hosts that are not listed in next.config's remotePatterns, where
                next/image would render a broken box instead of the image the
                editor is trying to check. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="current" className="w-full h-24 object-cover rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );

  if (!value) return <>{empty}{panel}</>;

  if (asBackground) {
    return (
      <div className={`relative ${className}`} style={{ ...style, backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {overlay}
        {panel}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      {/* Plain <img>, same reasoning as the preview above: arbitrary editor-
          supplied hosts, plus `className` and `style` are pass-through from any
          caller, so there is no box for `fill` to position against. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={alt} className={className} style={style} />
      {overlay}
      {panel}
    </div>
  );
}
