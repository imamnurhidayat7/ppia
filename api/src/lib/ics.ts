/**
 * iCalendar (RFC 5545) serialisation.
 *
 * Hand-rolled rather than pulled from npm because the format's awkward parts are
 * few and each one is handled explicitly below: CRLF line endings, folding long
 * lines at 75 octets, escaping the reserved characters in TEXT values, and UTC
 * timestamps. Getting any of these wrong is what makes a feed fail to import,
 * so they are the whole reason this file exists.
 */

/** Events without an explicit end get this duration so importers show a block. */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startDate: Date;
  endDate?: Date | null;
  /** Canonical public URL of the event, included as URL and in the description. */
  url?: string | null;
  /** Last modification time, surfaced so clients can detect updates. */
  updatedAt?: Date | null;
}

/**
 * Format a Date as a UTC timestamp: 20260728T093000Z.
 *
 * Everything is emitted in UTC so no VTIMEZONE component is needed and the
 * result is unambiguous regardless of the reader's locale.
 */
const toIcsUtc = (date: Date): string =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(
    date.getUTCDate()
  ).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}${String(
    date.getUTCMinutes()
  ).padStart(2, '0')}${String(date.getUTCSeconds()).padStart(2, '0')}Z`;

/**
 * Escape a TEXT value per RFC 5545 §3.3.11.
 *
 * Backslash first, otherwise the escapes introduced below would be escaped again.
 */
const escapeText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');

/**
 * Reduce stored HTML to plain text.
 *
 * Event descriptions in this database contain markup, and calendar clients show
 * DESCRIPTION verbatim — an unstripped body would display raw tags.
 */
const htmlToPlainText = (html: string): string =>
  html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|div|h[1-6]|li|tr)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * Fold a content line to 75 octets, per RFC 5545 §3.1.
 *
 * The limit is octets, not characters, so multi-byte UTF-8 has to be measured
 * after encoding — a naive character split can cut a character in half and
 * produce a file some clients reject. Continuation lines start with a space.
 */
const foldLine = (line: string): string => {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let cursor = 0;
  // First line takes 75 octets; continuations take 74 plus the leading space.
  let budget = 75;

  while (cursor < bytes.length) {
    let end = Math.min(cursor + budget, bytes.length);

    // Never split inside a UTF-8 sequence: continuation bytes match 0b10xxxxxx.
    while (end > cursor && end < bytes.length && (bytes[end] & 0xc0) === 0x80) {
      end -= 1;
    }

    parts.push(bytes.subarray(cursor, end).toString('utf8'));
    cursor = end;
    budget = 74;
  }

  return parts.join('\r\n ');
};

/** Escape a Windows-style newline set and fold, for one `NAME:value` line. */
const contentLine = (name: string, value: string): string => foldLine(`${name}:${value}`);

const PRODID = '-//PPIA Auckland//Events//EN';

/** Serialise one VEVENT component. */
const renderVEvent = (event: CalendarEvent, stamp: string): string[] => {
  const end = event.endDate ?? new Date(event.startDate.getTime() + DEFAULT_DURATION_MS);

  const descriptionParts: string[] = [];
  if (event.description) descriptionParts.push(htmlToPlainText(event.description));
  if (event.url) descriptionParts.push(event.url);

  const lines = [
    'BEGIN:VEVENT',
    // Stable across regenerations so re-importing updates the entry instead of
    // creating a duplicate.
    contentLine('UID', `${event.id}@ppiaauckland.org`),
    contentLine('DTSTAMP', stamp),
    contentLine('DTSTART', toIcsUtc(event.startDate)),
    contentLine('DTEND', toIcsUtc(end)),
    contentLine('SUMMARY', escapeText(event.title)),
  ];

  if (descriptionParts.length > 0) {
    lines.push(contentLine('DESCRIPTION', escapeText(descriptionParts.join('\n\n'))));
  }
  if (event.location) {
    lines.push(contentLine('LOCATION', escapeText(event.location)));
  }
  if (event.url) {
    lines.push(contentLine('URL', event.url));
  }
  if (event.updatedAt) {
    lines.push(contentLine('LAST-MODIFIED', toIcsUtc(event.updatedAt)));
  }

  lines.push('STATUS:CONFIRMED');
  lines.push('END:VEVENT');
  return lines;
};

/**
 * Build a complete iCalendar document.
 *
 * `calendarName` shows up as the subscription's title in clients that support
 * the widely-implemented X-WR-CALNAME extension.
 */
export const buildIcsCalendar = (
  events: CalendarEvent[],
  options?: { calendarName?: string }
): string => {
  const stamp = toIcsUtc(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    contentLine('PRODID', PRODID),
    'CALSCALE:GREGORIAN',
    // PUBLISH marks this as a one-way feed rather than a meeting invitation,
    // which stops clients from offering an RSVP that has nowhere to go.
    'METHOD:PUBLISH',
  ];

  if (options?.calendarName) {
    lines.push(contentLine('X-WR-CALNAME', escapeText(options.calendarName)));
    lines.push(contentLine('NAME', escapeText(options.calendarName)));
  }

  for (const event of events) {
    lines.push(...renderVEvent(event, stamp));
  }

  lines.push('END:VCALENDAR');

  // RFC 5545 requires CRLF, and a trailing break after the final line.
  return `${lines.join('\r\n')}\r\n`;
};

/**
 * Safe filename for a Content-Disposition header.
 *
 * Titles come from the CMS and can contain quotes, semicolons or non-ASCII,
 * all of which would break out of the header value.
 */
export const icsFilename = (slugOrTitle: string): string => {
  const base = slugOrTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'event'}.ics`;
};
