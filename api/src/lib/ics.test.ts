/**
 * Tests for the iCalendar serialiser.
 *
 * These cover the parts of RFC 5545 that silently break an import when they are
 * wrong — line endings, folding measured in octets, and TEXT escaping. A visual
 * check of the output does not catch any of them.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIcsCalendar, icsFilename } from './ics';

const baseEvent = {
  id: 'evt_1',
  title: 'Weekly meetup',
  description: null,
  location: null,
  startDate: new Date('2026-02-14T21:00:00.000Z'),
  endDate: new Date('2026-02-14T23:00:00.000Z'),
};

test('every line ends with CRLF, including the last', () => {
  const ics = buildIcsCalendar([baseEvent]);

  assert.ok(ics.endsWith('\r\n'), 'document must end with a line break');

  const carriageReturns = (ics.match(/\r/g) || []).length;
  const lineFeeds = (ics.match(/\n/g) || []).length;
  assert.equal(carriageReturns, lineFeeds, 'no bare LF or bare CR may appear');
});

test('wraps the required VCALENDAR envelope around each VEVENT', () => {
  const ics = buildIcsCalendar([baseEvent, { ...baseEvent, id: 'evt_2' }]);

  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.equal((ics.match(/END:VEVENT/g) || []).length, 2);
  assert.match(ics, /VERSION:2\.0/);
});

test('timestamps are emitted as UTC with no separators', () => {
  const ics = buildIcsCalendar([baseEvent]);

  assert.match(ics, /DTSTART:20260214T210000Z/);
  assert.match(ics, /DTEND:20260214T230000Z/);
});

test('an event without an end time gets a two hour block', () => {
  const ics = buildIcsCalendar([{ ...baseEvent, endDate: null }]);

  assert.match(ics, /DTSTART:20260214T210000Z/);
  assert.match(ics, /DTEND:20260214T230000Z/);
});

test('the UID is stable for the same event id', () => {
  const first = buildIcsCalendar([baseEvent]);
  const second = buildIcsCalendar([baseEvent]);

  const uidOf = (ics: string) => ics.match(/UID:(.+)\r\n/)?.[1];
  assert.equal(uidOf(first), uidOf(second));
  assert.equal(uidOf(first), 'evt_1@ppiaauckland.org');
});

test('escapes the characters RFC 5545 reserves in TEXT values', () => {
  const ics = buildIcsCalendar([
    {
      ...baseEvent,
      title: 'Talk: risks, rewards; and a back\\slash',
      location: 'Room 1, Level 2',
    },
  ]);

  // Commas and semicolons must be backslash-escaped, and an existing backslash
  // must be doubled — otherwise a reader treats them as field separators.
  assert.match(ics, /SUMMARY:Talk: risks\\, rewards\\; and a back\\\\slash/);
  assert.match(ics, /LOCATION:Room 1\\, Level 2/);
});

test('newlines in a description become the literal \\n escape', () => {
  const ics = buildIcsCalendar([
    { ...baseEvent, description: 'First line\nSecond line' },
  ]);

  assert.match(ics, /DESCRIPTION:First line\\nSecond line/);
  // A real line break inside the value would end the property early.
  assert.doesNotMatch(ics, /DESCRIPTION:First line\r\nSecond/);
});

test('strips HTML out of descriptions', () => {
  const ics = buildIcsCalendar([
    { ...baseEvent, description: '<p>Bring a <strong>friend</strong></p>' },
  ]);

  assert.match(ics, /DESCRIPTION:Bring a friend/);
  assert.doesNotMatch(ics, /<strong>/);
});

test('folds long lines to 75 octets with a leading space on continuations', () => {
  const ics = buildIcsCalendar([{ ...baseEvent, title: 'A'.repeat(300) }]);

  for (const line of ics.split('\r\n')) {
    assert.ok(
      Buffer.byteLength(line, 'utf8') <= 75,
      `line exceeds 75 octets: ${line.length} chars`
    );
  }
  assert.match(ics, /\r\n /, 'a folded line must continue with a space');
});

test('folding never splits a multi-byte character', () => {
  // Emoji are four octets each, so a naive character-count fold lands mid-glyph.
  const title = `${'x'.repeat(70)}${'🎓'.repeat(20)}`;
  const ics = buildIcsCalendar([{ ...baseEvent, title }]);

  for (const line of ics.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
    // U+FFFD is what a broken UTF-8 sequence decodes to.
    assert.ok(!line.includes('\uFFFD'), 'a character was cut in half');
  }

  // Unfolding must reproduce the original text exactly.
  const unfolded = ics.replace(/\r\n /g, '');
  assert.ok(unfolded.includes(title));
});

test('calendar name is included when given', () => {
  const ics = buildIcsCalendar([baseEvent], { calendarName: 'PPIA Auckland Events' });
  assert.match(ics, /X-WR-CALNAME:PPIA Auckland Events/);
});

test('icsFilename produces a safe, bounded filename', () => {
  assert.equal(icsFilename('Hello World!'), 'hello-world.ics');
  assert.equal(icsFilename('--weird--slug--'), 'weird-slug.ics');
  assert.equal(icsFilename(''), 'event.ics');
  // Quotes and semicolons would break out of a Content-Disposition header.
  assert.doesNotMatch(icsFilename('a"b;c'), /["';]/);
  assert.ok(icsFilename('x'.repeat(200)).length <= 64);
});
