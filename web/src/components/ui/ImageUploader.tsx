'use client';

import * as React from 'react';
import { Upload, X, Loader2, Link } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { API_ORIGIN } from '@/lib/api-base';

interface ImageUploaderProps {
  value?: string;
  onChange?: (url: string) => void;
  label?: string;
  placeholder?: string;
}

const API_URL = API_ORIGIN;

export function ImageUploader({
  value,
  onChange,
  label,
  placeholder = 'Click or drag to upload',
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [showUrlInput, setShowUrlInput] = React.useState(false);
  const [urlInputValue, setUrlInputValue] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { showError } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const fullUrl = data.url.startsWith('http://') || data.url.startsWith('https://')
          ? data.url
          : `${API_URL}${data.url}`;
        onChange?.(fullUrl);
        return;
      }
      throw new Error('Upload failed');
    } catch (error) {
      console.error('Upload failed:', error);
      showError('Failed to upload image. Make sure the API server is running.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    setUrlInputValue('');
    onChange?.('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlSubmit = () => {
    if (urlInputValue.trim()) {
      onChange?.(urlInputValue.trim());
      setShowUrlInput(false);
      setUrlInputValue('');
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-[#1A2B4A] mb-2">
          {label}
        </label>
      )}

      {/* URL entry wins over the preview, otherwise "Use URL" on an existing
          image would set state that nothing rendered. */}
      {showUrlInput ? (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-3 space-y-2.5">
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">
            Paste image URL
          </label>
          <input
            type="url"
            value={urlInputValue}
            onChange={(e) => setUrlInputValue(e.target.value)}
            placeholder="https://example.com/logo.svg"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 dark:bg-slate-900 focus:border-[#E8231A] focus:ring-2 focus:ring-[#E8231A]/10 transition-all outline-none text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUrlSubmit();
              if (e.key === 'Escape') setShowUrlInput(false);
            }}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUrlSubmit}
              className="px-3 py-1.5 bg-[#E8231A] text-white rounded-lg text-xs font-semibold hover:bg-[#C41E16] transition-colors"
            >
              Use this URL
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUrlInput(false);
                setUrlInputValue('');
              }}
              className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : value ? (
        <div className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
          {/*
            `object-contain` on a chequerboard, not `object-cover`. Cropping is
            wrong for the things most often uploaded here — partner logos and
            wordmarks — and in a preview the useful thing is seeing the whole
            asset, including how much transparent padding it carries.
          */}
          <div
            className="flex items-center justify-center h-40 bg-white dark:bg-slate-800"
            style={{
              backgroundImage:
                'linear-gradient(45deg, rgba(148,163,184,0.18) 25%, transparent 25%, transparent 75%, rgba(148,163,184,0.18) 75%), linear-gradient(45deg, rgba(148,163,184,0.18) 25%, transparent 25%, transparent 75%, rgba(148,163,184,0.18) 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 8px 8px',
            }}
          >
            <img
              src={getImageUrl(value)}
              alt="Preview"
              className="max-h-full max-w-full object-contain p-3"
            />
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-2 p-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="px-3 py-1.5 bg-white/15 border border-white/40 rounded-lg text-xs font-medium text-white hover:bg-white/25 transition-colors"
            >
              Use URL
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-1.5 bg-red-500 rounded-lg text-xs font-medium text-white hover:bg-red-600 transition-colors flex items-center gap-1"
            >
              <X size={13} />
              Remove
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      ) : (
        <div
          className={`relative rounded-xl border-2 border-dashed transition-colors ${
            isDragging
              ? 'border-[#E8231A] bg-[#E8231A]/5'
              : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />

          {/* Padding and control sizes stay modest so the whole thing still
              fits the 360px editor inspector without wrapping awkwardly. */}
          <div className="px-4 py-6 text-center">
            {isUploading ? (
              <div className="flex flex-col items-center py-4">
                <Loader2 size={30} className="animate-spin text-[#E8231A] mb-2.5" />
                <p className="text-xs text-gray-500 dark:text-slate-400">Uploading…</p>
              </div>
            ) : (
              <>
                <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-[#E8231A]/10 flex items-center justify-center">
                  <Upload size={19} className="text-[#E8231A]" />
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-0.5">
                  {placeholder}
                </p>
                <p className="text-[12px] text-gray-600 dark:text-slate-400 mb-3.5">
                  Drag a file here, or choose an option below
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-[#E8231A] text-white rounded-lg text-xs font-semibold hover:bg-[#C41E16] transition-colors"
                  >
                    Upload file
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(true)}
                    className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                  >
                    <Link size={13} />
                    Paste URL
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
