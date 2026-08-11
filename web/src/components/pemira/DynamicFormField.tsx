'use client';
import { useState, useRef } from 'react';
import { Upload, X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import type { ElectionFormField } from '@/lib/api-types';

export interface FieldValue {
  fieldId: string;
  value: unknown;
}

interface Props {
  field: ElectionFormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string | null;
}

const inputClass =
  'w-full rounded-[5px] border border-[#DCE7F1] bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-[#E8231A]/40 focus:ring-4 focus:ring-[#E8231A]/8 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-[#E8231A]/50';
const labelClass =
  'block text-[13px] font-bold text-slate-800 dark:text-slate-100';
const descClass =
  'text-xs text-slate-500 dark:text-slate-400 -mt-1 mb-2';
const optionBase =
  'flex items-center gap-3 px-3.5 py-3 rounded-[5px] border cursor-pointer transition-all';
const optionOn = 'border-[#E8231A]/40 bg-[#E8231A]/5 shadow-[0_0_0_1px_rgba(232,35,26,0.12)]';
const optionOff =
  'border-[#DCE7F1] bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600';

function bytesToMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export default function DynamicFormField({ field, value, onChange, error }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const requiredMark = field.required ? <span className="text-[#E8231A]">*</span> : null;
  const description = field.description ? (
    <p className={descClass}>{field.description}</p>
  ) : null;

  const showError = error || uploadError;

  // ---------- TEXT ----------
  if (field.type === 'FIELD_TEXT') {
    return (
      <div>
        <label className={labelClass}>
          {field.label} {requiredMark}
        </label>
        {description}
        <input
          type="text"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="Type your answer..."
        />
        {showError && <FieldError message={showError} />}
      </div>
    );
  }

  // ---------- TEXTAREA ----------
  if (field.type === 'FIELD_RICHTEXT') {
    return (
      <div>
        <label className={labelClass}>
          {field.label} {requiredMark}
        </label>
        {description}
        <textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={`${inputClass} resize-none`}
          placeholder="Type your answer..."
        />
        {showError && <FieldError message={showError} />}
      </div>
    );
  }

  // ---------- NUMBER ----------
  if (field.type === 'FIELD_NUMBER') {
    return (
      <div>
        <label className={labelClass}>
          {field.label} {requiredMark}
        </label>
        {description}
        <input
          type="number"
          value={value === undefined || value === null ? '' : (value as number)}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className={inputClass}
          placeholder="0"
        />
        {showError && <FieldError message={showError} />}
      </div>
    );
  }

  // ---------- SINGLE CHOICE ----------
  if (field.type === 'FIELD_SINGLE_CHOICE') {
    const options = field.options ?? [];
    return (
      <div>
        <label className={labelClass}>
          {field.label} {requiredMark}
        </label>
        {description}
        <div className="space-y-2">
          {options.map((opt) => {
            const checked = value === opt;
            return (
              <label
                key={opt}
                className={`${optionBase} ${checked ? optionOn : optionOff}`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    checked
                      ? 'border-[#E8231A] bg-[#E8231A]'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  checked={checked}
                  onChange={() => onChange(opt)}
                  className="sr-only"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">{opt}</span>
              </label>
            );
          })}
        </div>
        {showError && <FieldError message={showError} />}
      </div>
    );
  }

  // ---------- MULTIPLE CHOICE ----------
  if (field.type === 'FIELD_MULTIPLE_CHOICE') {
    const options = field.options ?? [];
    const picked = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (opt: string) => {
      if (picked.includes(opt)) {
        onChange(picked.filter((p) => p !== opt));
      } else {
        onChange([...picked, opt]);
      }
    };
    return (
      <div>
        <label className={labelClass}>
          {field.label} {requiredMark}
        </label>
        {description}
        <div className="space-y-2">
          {options.map((opt) => {
            const checked = picked.includes(opt);
            return (
              <label
                key={opt}
                className={`${optionBase} ${checked ? optionOn : optionOff}`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-2 transition-colors ${
                    checked
                      ? 'border-[#E8231A] bg-[#E8231A]'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {checked && (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6.5L4.5 9L10 3.5" />
                    </svg>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt)}
                  className="sr-only"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">{opt}</span>
              </label>
            );
          })}
        </div>
        {showError && <FieldError message={showError} />}
      </div>
    );
  }

  // ---------- IMAGE ----------
  if (field.type === 'FIELD_IMAGE') {
    // The API enforces 10MB and (jpg|jpeg|png|gif|webp) via magic-byte
    // signature checking; the admin-configured accept list can only narrow
    // that, never widen it. So clamp the default to what the server allows.
    const SERVER_ALLOWED = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const maxBytes = Math.min((field.maxFileSize ?? 10), 10) * 1024 * 1024;
    // The API normalises extensions to bare lowercase ("jpg", not ".jpg"),
    // so compare bare extensions here and add the dot only for display and
    // the file input's `accept` attribute.
    const acceptedRaw = (field.acceptedTypes ?? SERVER_ALLOWED);
    const accepted = (acceptedRaw.length ? acceptedRaw : SERVER_ALLOWED)
      .map((t) => String(t).toLowerCase().replace(/^\./, ''))
      .filter((t) => SERVER_ALLOWED.includes(t));
    const acceptedDisplay = accepted.map((a) => `.${a}`);
    const currentUrl = typeof value === 'string' ? value : '';

    const handleFile = async (file: File | null) => {
      if (!file) return;
      setUploadError(null);
      if (file.size > maxBytes) {
        setUploadError(`File exceeds ${bytesToMB(maxBytes)} MB limit`);
        return;
      }
      const ext = (file.name.split('.').pop() ?? '').toLowerCase();
      if (!accepted.includes(ext)) {
        setUploadError(`Accepted types: ${acceptedDisplay.join(', ')}`);
        return;
      }
      setUploading(true);
      try {
        // Backend upload endpoint (authenticated). The api client strips
        // any manual Content-Type so axios can build a proper multipart
        // boundary (multer needs that, otherwise req.file is undefined).
        const data = await api.uploadImage(file);
        setUploadedFileName(file.name);
        onChange(data.url);
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
            : undefined;
        setUploadError(msg ?? 'Upload failed. Please try again.');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    return (
      <div>
        <label className={labelClass}>
          {field.label} {requiredMark}
        </label>
        {description}
        {currentUrl ? (
          <div className="relative overflow-hidden rounded-[6px] border border-[#DCE7F1] bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUrl} alt={field.label} className="max-h-72 w-full object-contain" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/55 to-transparent px-3 py-2">
              <span className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-white/90">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span className="truncate">{uploadedFileName ?? 'Uploaded'}</span>
              </span>
              <button
                type="button"
                onClick={() => { onChange(''); setUploadedFileName(null); }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition hover:bg-white"
                aria-label={`Remove ${field.label}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-md transition hover:bg-white"
            >
              Replace
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[6px] border-2 border-dashed bg-white/50 px-4 py-9 transition-all ${
              isDragging
                ? 'border-[#E8231A] bg-[#FFF5F5]/60 shadow-[0_0_0_4px_rgba(232,35,26,0.08)]'
                : 'border-[#DCE7F1] hover:border-[#E8231A]/40 hover:bg-[#FFF5F5]/40 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-[#E8231A]/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-[#E8231A]" />
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Uploading…</span>
              </>
            ) : (
              <>
                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${isDragging ? 'bg-[#E8231A]/15' : 'bg-[#E8231A]/8'}`}>
                  <Upload className={`h-5 w-5 text-[#E8231A] transition-transform ${isDragging ? 'scale-110' : ''}`} />
                </span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {isDragging ? 'Drop to upload' : 'Click or drop to upload'}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Max {bytesToMB(maxBytes)} MB · {acceptedDisplay.join(', ')}
                </span>
              </>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedDisplay.join(',')}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {showError && <FieldError message={showError} />}
      </div>
    );
  }

  // ---------- VIDEO LINK ----------
  if (field.type === 'FIELD_VIDEO_LINK') {
    return (
      <div>
        <label className={labelClass}>
          {field.label} {requiredMark}
        </label>
        {description}
        <input
          type="url"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="https://youtube.com/watch?v=..."
        />
        {showError && <FieldError message={showError} />}
      </div>
    );
  }

  return null;
}

function FieldError({ message }: { message: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#C41E16] dark:text-red-400">
      <AlertCircle className="h-3.5 w-3.5" />
      <span>{message}</span>
    </div>
  );
}