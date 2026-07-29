'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  (
    {
      className,
      label,
      description,
      disabled,
      id,
      checked,
      onChange,
      ...props
    },
    ref
  ) => {
    const toggleId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex items-start gap-3">
        {/*
          The whole switch is a <label>, so clicking the track (not just the
          text) toggles the input. The knob is the track's ::after pseudo, which
          keeps it a descendant that still reacts to `peer-checked` — a plain
          nested <div> would not, since Tailwind's peer variant only matches
          siblings of the checkbox.
        */}
        <label
          htmlFor={toggleId}
          className={cn(
            'relative inline-flex shrink-0 items-center',
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          )}
        >
          <input
            ref={ref}
            id={toggleId}
            type="checkbox"
            role="switch"
            disabled={disabled}
            checked={checked}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <span
            className={cn(
              'relative h-6 w-11 rounded-full bg-slate-200 transition-colors duration-200',
              'peer-checked:bg-primary-600',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2',
              'peer-disabled:opacity-50',
              "after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-200 after:content-['']",
              'peer-checked:after:translate-x-5',
              className
            )}
          />
        </label>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <label
                htmlFor={toggleId}
                className={cn(
                  'text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer select-none',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export { Toggle };
