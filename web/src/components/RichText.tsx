import { createElement } from 'react';
import { sanitizeHtml } from '@/lib/sanitize-html';

interface RichTextProps {
  /** Raw HTML from the CMS. Sanitised before it reaches the DOM. */
  html: unknown;
  className?: string;
  /** Element to render. Defaults to a div. */
  as?: 'div' | 'span' | 'section' | 'article' | 'p';
  /** Rendered instead of nothing when the field is empty. */
  fallback?: React.ReactNode;
}

/**
 * Render CMS-authored HTML safely.
 *
 * Use this instead of calling `dangerouslySetInnerHTML` at the point of use.
 * Routing every rich-text field through one component means sanitising is the
 * default rather than something each new call site has to remember, and a future
 * change to the policy applies everywhere at once.
 */
export function RichText({ html, className, as = 'div', fallback = null }: RichTextProps) {
  const clean = sanitizeHtml(html);
  if (!clean) return <>{fallback}</>;

  return createElement(as, {
    className,
    dangerouslySetInnerHTML: { __html: clean },
  });
}

export default RichText;
