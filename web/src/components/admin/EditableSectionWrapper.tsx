'use client';

/**
 * EditableSectionWrapper
 *
 * Marks the boundary of one page section on the canvas and selects it in the
 * rail when clicked.
 *
 * Two fixes over the previous version:
 *  1. The label chip relied on `group-hover` but no ancestor carried the `group`
 *     class, so it never appeared on hover — only on the active section.
 *  2. The highlight used `outline` with an offset, which drew *outside* the
 *     section box and visually collided with the neighbouring section. It now
 *     uses an inset ring, so adjacent sections never overlap.
 */

import { useEditableCanvas } from '@/lib/editable-canvas-context';
import { type ReactNode } from 'react';

interface EditableSectionWrapperProps {
  sectionKey: string;
  label: string;
  children: ReactNode;
}

export function EditableSectionWrapper({
  sectionKey,
  label,
  children,
}: EditableSectionWrapperProps) {
  const { activeKey, setActiveKey } = useEditableCanvas();
  const isActive = activeKey === sectionKey;

  return (
    // A plain div: the children already render their own <section>, so nesting
    // another landmark here would duplicate it for screen readers.
    <div
      id={`canvas-section-${sectionKey}`}
      onClick={() => setActiveKey(sectionKey)}
      role="group"
      aria-label={label}
      className={`group relative transition-shadow duration-150 ${
        isActive
          ? 'ring-2 ring-inset ring-[#E8231A]'
          : 'ring-1 ring-inset ring-transparent hover:ring-[#E8231A]/40'
      }`}
    >
      {/* Section label — sits in the corner, never intercepts clicks */}
      <span
        className={`pointer-events-none absolute top-0 left-0 z-40 inline-flex items-center h-6 px-2.5 text-[11px] font-semibold rounded-br-md transition-opacity duration-150 ${
          isActive
            ? 'bg-[#E8231A] text-white opacity-100'
            : 'bg-slate-900/80 text-white opacity-0 group-hover:opacity-100'
        }`}
      >
        {label}
      </span>

      {children}
    </div>
  );
}
