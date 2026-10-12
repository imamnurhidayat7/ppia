'use client';
import { useState, useCallback } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  showReasonInput?: boolean;
  defaultReason?: string;
}

interface ConfirmContext {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  confirmWithReason: (opts: ConfirmOptions) => Promise<string | null>;
  /**
   * Confirm, then run `task` while the dialog shows progress.
   *
   * Resolves `false` when cancelled, `true` when the task succeeds, and
   * REJECTS when the task throws (dialog closes either way; the caller
   * toasts the error as before). This is what makes every delete/publish
   * button show a spinner instead of going silent mid-request.
   */
  confirmTask: (opts: ConfirmOptions, task: () => Promise<unknown>) => Promise<boolean>;
  state: {
    isOpen: boolean;
    busy: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    showReasonInput?: boolean;
    defaultReason?: string;
  };
  handleConfirm: (reason?: string) => void;
  handleCancel: () => void;
}

export function useConfirm(): ConfirmContext {
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<Omit<ConfirmOptions, never>>({
    title: '',
    message: '',
  });
  const [resolveRef, setResolveRef] = useState<((value: boolean | string | null) => void) | null>(null);
  const [rejectRef, setRejectRef] = useState<((reason?: unknown) => void) | null>(null);
  const [taskRef, setTaskRef] = useState<(() => Promise<unknown>) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setTaskRef(null);
      setBusy(false);
      setIsOpen(true);
      setResolveRef(() => resolve);
      setRejectRef(null);
    });
  }, []);

  const confirmWithReason = useCallback((opts: ConfirmOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setOptions({ ...opts, showReasonInput: true });
      setTaskRef(null);
      setBusy(false);
      setIsOpen(true);
      setResolveRef(() => resolve);
      setRejectRef(null);
    });
  }, []);

  const confirmTask = useCallback(
    (opts: ConfirmOptions, task: () => Promise<unknown>): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        setOptions(opts);
        setTaskRef(() => task);
        setBusy(false);
        setIsOpen(true);
        setResolveRef(() => resolve);
        setRejectRef(() => reject);
      });
    },
    []
  );

  const handleConfirm = useCallback((reason?: string) => {
    const task = taskRef;
    if (task) {
      // A task is attached: stay open, spin, and settle the promise from the
      // task outcome. Cancellation is locked out until it finishes.
      setBusy(true);
      task().then(
        () => {
          setBusy(false);
          setTaskRef(null);
          setIsOpen(false);
          resolveRef?.(true);
          setResolveRef(null);
          setRejectRef(null);
        },
        (error: unknown) => {
          setBusy(false);
          setTaskRef(null);
          setIsOpen(false);
          setResolveRef(null);
          rejectRef?.(error);
          setRejectRef(null);
        }
      );
      return;
    }
    setIsOpen(false);
    resolveRef?.(options.showReasonInput ? (reason ?? null) : true);
    setResolveRef(null);
  }, [resolveRef, rejectRef, taskRef, options.showReasonInput]);

  const handleCancel = useCallback(() => {
    // Never abandon an in-flight task: no double-submit, no orphaned promise.
    if (busy) return;
    setIsOpen(false);
    resolveRef?.(false);
    setResolveRef(null);
    setTaskRef(null);
    setRejectRef(null);
  }, [resolveRef, busy]);

  return {
    confirm,
    confirmWithReason,
    confirmTask,
    state: { isOpen, busy, ...options },
    handleConfirm,
    handleCancel,
  };
}

interface ConfirmHostProps {
  ctx: ConfirmContext;
}

export function ConfirmHost({ ctx }: ConfirmHostProps) {
  return (
    <ConfirmModal
      isOpen={ctx.state.isOpen}
      busy={ctx.state.busy}
      title={ctx.state.title}
      message={ctx.state.message}
      confirmLabel={ctx.state.confirmLabel}
      cancelLabel={ctx.state.cancelLabel}
      variant={ctx.state.variant}
      showReasonInput={ctx.state.showReasonInput}
      defaultReason={ctx.state.defaultReason}
      onConfirm={ctx.handleConfirm}
      onCancel={ctx.handleCancel}
    />
  );
}
