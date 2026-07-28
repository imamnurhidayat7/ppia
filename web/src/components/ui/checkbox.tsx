'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      error,
      disabled,
      id,
      checked,
      onChange,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            disabled={disabled}
            checked={checked}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'w-5 h-5 rounded border-2 transition-all duration-150 cursor-pointer',
              'flex items-center justify-center',
              'peer-checked:bg-primary-600 peer-checked:border-primary-600',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2',
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
              error ? 'border-danger-500' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400',
              className
            )}
          >
            <Check
              className={cn(
                'w-3.5 h-3.5 text-white transition-transform duration-150',
                checked ? 'scale-100' : 'scale-0'
              )}
            />
          </div>
        </div>
        {label && (
          <div className="flex-1">
            <label
              htmlFor={checkboxId}
              className={cn(
                'text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {label}
            </label>
            {error && (
              <p className="mt-1 text-sm text-danger-500">{error}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
