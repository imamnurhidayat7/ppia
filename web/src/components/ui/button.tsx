'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-150',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'btn-press'
    );

    const variants = {
      primary: cn(
        'bg-primary-600 text-white hover:bg-primary-700',
        'shadow-sm hover:shadow-md'
      ),
      secondary: cn(
        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200',
        'border border-slate-200 dark:border-slate-700'
      ),
      outline: cn(
        'bg-transparent text-primary-600 border border-primary-500',
        'hover:bg-primary-50'
      ),
      ghost: cn(
        'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800',
        'hover:text-slate-900 dark:text-slate-100'
      ),
      danger: cn(
        'bg-danger-500 text-white hover:bg-danger-600',
        'shadow-sm hover:shadow-md'
      ),
      success: cn(
        'bg-success-500 text-white hover:bg-success-600',
        'shadow-sm hover:shadow-md'
      ),
    };

    const sizes = {
      xs: 'h-8 px-3 text-xs gap-1.5',
      sm: 'h-9 px-4 text-sm gap-2',
      md: 'h-11 px-5 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
