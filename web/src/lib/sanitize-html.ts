import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitise rich text before it is handed to `dangerouslySetInnerHTML`.
 *
 * Every long-form field on this site — article bodies, research abstracts, event
 * descriptions, legal sections, wiki answers, CMS page blocks — is authored as
 * HTML in the TipTap editor, stored as a raw string, and previously injected
 * into the page untouched. That trusted whatever was in the database: a stored
 * XSS in any of those fields would execute on the public site, and the CMS has
 * enough write paths (and had an unauthenticated FAQ endpoint) that "only admins
 * can write it" was not a safe assumption.
 *
 * The allowlist below is derived from what the editor can actually produce:
 * StarterKit (paragraphs, headings, lists, blockquote, code, rules), plus the
 * Underline, Link, TextAlign, TextStyle and Color extensions. Anything the
 * editor cannot generate is not allowed through, so tightening this list does
 * not cost editors any formatting they have.
 *
 * `isomorphic-dompurify` is used rather than plain DOMPurify because these
 * fields are rendered from both server and client components.
 */

/** Tags the editor can produce, and nothing else. */
const ALLOWED_TAGS = [
  'p',
  'br',
  'span',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'mark',
  'sub',
  'sup',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'hr',
  'a',
  // Tables are not in the toolbar today, but legacy content contains them.
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];

/**
 * `style` is allowed because text alignment and text colour are stored inline by
 * the TextAlign and Color extensions. DOMPurify parses and filters CSS, so this
 * does not permit `expression()`, `url(javascript:…)` or similar.
 */
const ALLOWED_ATTR = ['href', 'target', 'rel', 'title', 'class', 'style', 'colspan', 'rowspan'];

let hooksRegistered = false;

function registerHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;

  /**
   * Any link that opens a new tab gets `rel="noopener noreferrer"`.
   *
   * Without `noopener` the opened page can reach back through `window.opener`
   * and navigate the tab it came from. The editor sets `target` but authors can
   * paste markup, so this is enforced here rather than trusted.
   */
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Duck-typed rather than `node instanceof Element`.
    //
    // `Element` is a browser global. isomorphic-dompurify runs on a jsdom window
    // it creates internally and does not install that global, so referring to it
    // outside the browser throws ReferenceError — which meant this hook (and
    // therefore every server-side sanitize call) failed rather than sanitising.
    const element = node as Partial<Element>;
    if (element.tagName !== 'A' || typeof element.getAttribute !== 'function') return;

    if (element.getAttribute('target')) {
      element.setAttribute?.('rel', 'noopener noreferrer');
    }
  });
}

/**
 * Return `dirty` with anything unsafe removed.
 *
 * Non-string input yields an empty string rather than throwing, because these
 * values come from a JSON column and may be null on rows that predate a field.
 */
export function sanitizeHtml(dirty: unknown): string {
  if (typeof dirty !== 'string' || dirty.length === 0) return '';
  registerHooks();
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // `javascript:` and friends never survive; data: URIs are not needed here.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    // Keep the text of a removed tag rather than dropping the sentence with it.
    KEEP_CONTENT: true,
  });
}

/**
 * Escape a JSON-LD payload for embedding in a <script> element.
 *
 * `JSON.stringify` does not escape `<`, so a string containing `</script>` in
 * any indexed field would close the script element early and let the rest be
 * parsed as markup. Escaping the three characters that can start a tag or an
 * HTML comment closes that off while keeping the JSON valid.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * Flatten CMS HTML to plain text, for places that show a preview rather than
 * the formatted body — card excerpts, list rows, meta descriptions.
 *
 * These fields are authored in the rich-text editor, so they arrive as markup.
 * Dropping them straight into JSX renders the tags as literal text: cards were
 * showing `<p style="text-align: justify;">Rony P. Nugraha, …` to visitors.
 * Sanitising is not the answer here — the caller wants no markup at all.
 *
 * Block-level tags become a space so words either side do not run together,
 * and the handful of entities the editor emits are decoded.
 */
export function toPlainText(html: unknown): string {
  if (typeof html !== 'string' || html.length === 0) return '';

  return (
    html
      // <br>, </p>, </li>, </h2>… are word boundaries, not nothing.
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/blockquote|\/tr)\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim()
  );
}
