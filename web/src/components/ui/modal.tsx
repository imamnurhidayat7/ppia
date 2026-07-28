'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  description,
  size = 'md',
  showClose = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
}: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="modal-backdrop animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/*
        Centring via flex rather than `top-1/2 -translate-y-1/2`.

        With the translate approach the panel had no height limit, so long
        content grew symmetrically past both edges of the viewport — the header
        and its close button ended up above the top of the screen with no way to
        reach them. A flex-centred, height-capped column keeps the header and
        footer fixed and scrolls only the body.
      */}
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 pointer-events-none">
        <div
          className={cn('pointer-events-auto w-full', sizes[size])}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
        >
          <div
            className={cn(
              'flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl animate-scale-in dark:bg-slate-800',
              className
            )}
          >
            {/* Header — stays put while the body scrolls. */}
            {(title || showClose) && (
              <div className="flex shrink-0 items-start justify-between gap-4 p-6 pb-4">
                <div className="min-w-0">
                  {title && (
                    <h2
                      id="modal-title"
                      className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                    >
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p
                      id="modal-description"
                      className="mt-1 truncate text-sm text-slate-500"
                    >
                      {description}
                    </p>
                  )}
                </div>
                {showClose && (
                  <button
                    onClick={onClose}
                    className={cn(
                      'shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600',
                      'dark:text-slate-400 dark:hover:bg-slate-700'
                    )}
                    aria-label="Close modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Body — the only scrolling region. */}
            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6',
                // Without a header there is nothing above to provide the gap.
                title || showClose ? 'pt-0' : 'pt-6'
              )}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}

// Modal Footer helper
export interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 pt-4 border-t border-slate-100 -mx-6 -mb-6 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl',
        className
      )}
    >
      {children}
    </div>
  );
}

// Confirm Dialog
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const buttonVariants = {
    danger: 'bg-danger-500 hover:bg-danger-600 text-white',
    warning: 'bg-warning-500 hover:bg-warning-600 text-white',
    default: 'bg-primary-600 hover:bg-primary-700 text-white',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showClose={false}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {description && (
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        )}

        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={isLoading}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg',
              'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200',
              'transition-colors disabled:opacity-50'
            )}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2.5 text-sm font-medium rounded-lg text-white',
              'transition-colors disabled:opacity-50',
              buttonVariants[variant]
            )}
          >
            {isLoading ? 'Loading...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
