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
  state: {
    isOpen: boolean;
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
  const [options, setOptions] = useState<Omit<ConfirmOptions, never>>({
    title: '',
    message: '',
  });
  const [resolveRef, setResolveRef] = useState<((value: boolean | string | null) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      setResolveRef(() => resolve);
    });
  }, []);

  const confirmWithReason = useCallback((opts: ConfirmOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setOptions({ ...opts, showReasonInput: true });
      setIsOpen(true);
      setResolveRef(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback((reason?: string) => {
    setIsOpen(false);
    resolveRef?.(options.showReasonInput ? (reason ?? null) : true);
    setResolveRef(null);
  }, [resolveRef, options.showReasonInput]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolveRef?.(false);
    setResolveRef(null);
  }, [resolveRef]);

  return {
    confirm,
    confirmWithReason,
    state: { isOpen, ...options },
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
