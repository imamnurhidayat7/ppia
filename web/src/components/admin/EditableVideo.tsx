'use client';

/**
 * EditableVideo
 *
 * Renders an embedded video. On hover shows edit overlay.
 * Clicking opens a panel to paste YouTube/Vimeo URL.
 */

import { useState } from 'react';
import { Video, X, Play } from 'lucide-react';

interface EditableVideoProps {
  value: string; // YouTube/Vimeo URL or embed URL
  onChange: (url: string) => void;
  className?: string;
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  // Already an embed URL
  if (url.includes('youtube.com/embed/') || url.includes('player.vimeo.com')) return url;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

export function EditableVideo({ value, onChange, className = '' }: EditableVideoProps) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState(value || '');

  const embedUrl = getEmbedUrl(value);

  const handleSubmit = () => {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setOpen(false);
  };

  const panel = open && (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Replace video</h3>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Paste a YouTube or Vimeo URL. For example:<br />
          <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">https://youtube.com/watch?v=xxxx</code>
        </p>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#E8231A] mb-3"
          autoFocus
        />
        {/* Preview */}
        {getEmbedUrl(urlInput) && (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black mb-3">
            <iframe
              src={getEmbedUrl(urlInput)!}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Video preview"
            />
          </div>
        )}
        <button
          onClick={handleSubmit}
          className="w-full py-2 bg-[#E8231A] hover:bg-[#C41E16] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Use this video
        </button>
      </div>
    </div>
  );

  if (!embedUrl) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={`${className} flex flex-col items-center justify-center bg-slate-800 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-[#E8231A] hover:bg-slate-700 transition-colors gap-3 text-slate-400 text-sm min-h-[200px]`}
        >
          <Video size={32} className="opacity-50" />
          Click to add a video
        </button>
        {panel}
      </>
    );
  }

  return (
    <>
      <div className={`relative ${className} group`}>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video"
          />
        </div>
        {/* Edit overlay */}
        <button
          onClick={() => setOpen(true)}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-xl cursor-pointer"
        >
          <div className="bg-white/90 rounded-lg px-3 py-2 flex items-center gap-2 text-sm font-medium text-slate-700 shadow">
            <Play size={14} />
            Replace video
          </div>
        </button>
      </div>
      {panel}
    </>
  );
}
