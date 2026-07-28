'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.FC<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {Icon && (
        <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-6">
          <Icon size={40} className="text-gray-300" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 dark:text-slate-400 text-center max-w-md mb-6">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8231A] text-white rounded-xl font-medium hover:bg-[#c91e16] transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8231A] text-white rounded-xl font-medium hover:bg-[#c91e16] transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

// Pre-built empty states with inline SVG components
export function EmptyEvents() {
  const Icon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-gray-300">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );

  return (
    <EmptyState
      icon={Icon}
      title="No Events Yet"
      description="Create your first event to get started with managing your organization's activities."
      action={{ label: 'Create Event', href: '/dashboard/admin/events' }}
    />
  );
}

export function EmptyArticles() {
  const Icon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-gray-300">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );

  return (
    <EmptyState
      icon={Icon}
      title="No Articles Yet"
      description="Start writing articles to share news and updates with your community."
      action={{ label: 'Write Article', href: '/dashboard/admin/articles' }}
    />
  );
}

export function EmptyMembers() {
  const Icon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-gray-300">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  return (
    <EmptyState
      icon={Icon}
      title="No Members Yet"
      description="Members will appear here once they register and join your organization."
    />
  );
}

export function EmptyMedia() {
  const Icon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-gray-300">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );

  return (
    <EmptyState
      icon={Icon}
      title="No Media Files"
      description="Upload images and files to use in your events and articles."
      action={{ label: 'Upload Media', href: '/dashboard/admin/media' }}
    />
  );
}

export function EmptySearch() {
  const Icon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-gray-300">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );

  return (
    <EmptyState
      icon={Icon}
      title="No Results Found"
      description="Try adjusting your search or filters to find what you're looking for."
    />
  );
}

export function EmptyRegistrations() {
  const Icon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-gray-300">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );

  return (
    <EmptyState
      icon={Icon}
      title="No Event Registrations"
      description="You haven't registered for any events yet. Browse our events to find something interesting!"
      action={{ label: 'Browse Events', href: '/activities/events' }}
    />
  );
}
