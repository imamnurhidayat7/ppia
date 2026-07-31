'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import api from '@/lib/api';
import { API_ORIGIN } from '@/lib/api-base';
import { getImageUrl } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { Camera, Loader2, Save, X } from 'lucide-react';

interface AvatarPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar?: string | null;
  userName: string;
  /**
   * Called after a successful upload so the parent can refresh its profile
   * state with the new avatar URL.
   */
  onAvatarUpdated?: (newAvatarUrl: string) => void | Promise<void>;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Two-step avatar editor: the modal opens as a preview of the current photo,
 * the user clicks "Change photo" to pick a new file, and "Save" actually
 * uploads and persists it. The picked file is held in component state until
 * the user commits, so cancelling out keeps the original photo.
 */
export default function AvatarPreviewModal({
  isOpen,
  onClose,
  currentAvatar,
  userName,
  onAvatarUpdated,
}: AvatarPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSuccess, showError } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset state every time the modal re-opens so a previous draft doesn't
  // bleed into the next session.
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setSaving(false);
    }
  }, [isOpen]);

  // Build/revoke the object URL for the local preview so we don't leak memory.
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  // Close on Escape + click-outside, lock body scroll while open — same
  // pattern MemberCardModal uses elsewhere.
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Choose an image file');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      showError('Images can be up to 5MB');
      return;
    }
    setSelectedFile(file);
    // The picker keeps the same file selected after re-selection; clear the
    // value so picking the same file twice still triggers `onChange`.
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!selectedFile || saving) return;
    setSaving(true);
    try {
      const res = await api.uploadImage(selectedFile);
      const apiBase = API_ORIGIN;
      const avatarUrl = res.url.startsWith('http') ? res.url : `${apiBase}${res.url}`;
      await api.updateProfile({ avatar: avatarUrl });
      if (onAvatarUpdated) await onAvatarUpdated(avatarUrl);
      showSuccess('Profile photo updated');
      onClose();
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showError(err.response?.data?.error || err.message || 'Could not upload the photo');
    } finally {
      setSaving(false);
    }
  };

  const displaySrc = previewUrl
    ? previewUrl
    : currentAvatar
      ? getImageUrl(currentAvatar)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Profile photo preview"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[5px] border border-[#DCE7F1] bg-white shadow-2xl shadow-black/40 dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-[#DCE7F1] px-5 py-3 dark:border-slate-700">
          <h3 className="font-display text-base font-bold ink-strong">Profile photo</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-[#5B6B7C] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F1B33] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center px-5 py-6">
          <div
            className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-full bg-[#EDF5FB] dark:bg-slate-800"
            style={{
              boxShadow:
                'inset 0 0 0 1px rgba(11,28,46,0.14), 0 0 0 6px rgba(11,28,46,0.05)',
            }}
          >
            {displaySrc ? (
              <Image
                src={displaySrc}
                alt={userName}
                fill
                sizes="224px"
                className="object-cover"
                unoptimized
                priority
              />
            ) : (
              <span className="font-display text-4xl font-black text-[#5B6B7C]">
                {userName?.charAt(0).toUpperCase() ?? '?'}
              </span>
            )}
          </div>

          <p className="mt-4 text-center text-sm ink-body">
            {previewUrl
              ? 'New photo ready. Click Save to apply it.'
              : 'Click "Change photo" to pick a new image.'}
          </p>
          <p className="mt-1 text-center text-[12px] ink-muted">
            Images can be up to 5MB. JPG, PNG, or WEBP.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Pick a new profile photo"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#DCE7F1] px-5 py-3 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-[3px] border border-[#DCE7F1] px-4 py-2 text-sm font-semibold text-[#5B6B7C] transition-colors hover:border-[#9FB3C6] hover:text-[#0F1B33] disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          {previewUrl ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-[3px] bg-[#E8231A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#C41E16] disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-[3px] bg-[#E8231A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#C41E16]"
            >
              <Camera size={16} />
              Change photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
