'use client';

/**
 * EditableField
 *
 * Renders content as it appears on the live page, and turns into an input on
 * click.
 *
 * Affordance note: this used to show an absolutely positioned "✏ Edit" badge
 * above the element on hover, which overlapped whatever sat above it — on the
 * hero that meant the badge landed on top of the headline. The hover state is
 * now a dashed outline drawn outside the box, so it can never cover text, plus
 * a native tooltip. Nothing shifts layout on hover.
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';

interface EditableFieldProps {
  /** Current value */
  value: string;
  /** Called when value changes */
  onChange: (val: string) => void;
  /** HTML tag to render as (default: span) */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div' | 'blockquote';
  /** Use textarea for multiline content */
  multiline?: boolean;
  /** Extra className applied to both view and edit state */
  className?: string;
  /** Placeholder shown when empty */
  placeholder?: string;
  /** Accessible description of what this field is, used in the tooltip */
  label?: string;
}

export function EditableField({
  value,
  onChange,
  as: Tag = 'span',
  multiline = false,
  className = '',
  placeholder = 'Click to fill in',
  label,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Sync when external value changes
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
    }
    // Commit on Enter for single-line
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      commit();
    }
    // Cmd/Ctrl+Enter commits multiline without leaving the keyboard
    if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
    }
  };

  if (editing) {
    const sharedClass = `${className} w-full block caret-[#E8231A] rounded-md px-1.5 py-0.5 outline-none ring-2 ring-[#E8231A] ring-offset-1 ring-offset-transparent`;
    /**
     * Colours are inline rather than utility classes on purpose. The incoming
     * `className` often carries a colour of its own (`text-white` on dark
     * sections), and two competing single-class utilities resolve by stylesheet
     * order, not by their position in the string — so the value could end up
     * white-on-white while being typed. Inline styles always win.
     */
    const editStyle: React.CSSProperties = {
      backgroundColor: 'rgba(255, 255, 255, 0.97)',
      color: '#0F172A',
    };

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          autoFocus
          rows={Math.max(2, draft.split('\n').length)}
          aria-label={label ?? placeholder}
          style={editStyle}
          className={`${sharedClass} resize-y`}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        autoFocus
        aria-label={label ?? placeholder}
        style={editStyle}
        className={sharedClass}
      />
    );
  }

  const isEmpty = !value;

  return (
    <Tag
      role="button"
      tabIndex={0}
      onClick={startEdit}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startEdit();
        }
      }}
      title={label ? `Click to edit the ${label}` : 'Click to edit this text'}
      aria-label={label ? `Edit ${label}` : undefined}
      className={`${className} cursor-text rounded-md transition-[outline-color] duration-150
        outline outline-1 outline-dashed outline-offset-2 outline-transparent
        hover:outline-[#E8231A]/60
        focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#E8231A]
        ${isEmpty ? 'outline-[#E8231A]/40' : ''}`}
    >
      {value || <span className="opacity-45 italic font-normal">{placeholder}</span>}
    </Tag>
  );
}
