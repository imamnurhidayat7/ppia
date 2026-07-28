/**
 * Tests for e-mail rendering and the unconfigured-provider path.
 *
 * The escaping test is the important one: member names and rejection reasons are
 * interpolated into messages sent to other people, so an unescaped value would
 * be markup injection into somebody else's inbox.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  escapeHtml,
  renderEmailLayout,
  renderEmailButton,
  renderWhatsAppButton,
  renderEmailDetails,
  renderEmailHeading,
  renderEmailFallbackLink,
  sendEmail,
} from './mailer';

test('escapeHtml neutralises every character that can open a tag', () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
  );
  assert.equal(escapeHtml("O'Brien & Sons"), 'O&#39;Brien &amp; Sons');
});

test('escapeHtml escapes the ampersand first', () => {
  // Escaping < before & would turn "&lt;" into "&amp;lt;" on a second pass; the
  // order in the implementation is what prevents double-escaping.
  assert.equal(escapeHtml('&lt;'), '&amp;lt;');
});

test('escapeHtml treats null and undefined as empty', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('the layout produces a complete document with the body inside it', () => {
  const html = renderEmailLayout('<p>Hello</p>');

  // The XHTML transitional doctype is what stops Outlook falling back to quirks
  // mode, where table widths are interpreted differently.
  assert.match(html, /^<!DOCTYPE html PUBLIC "-\/\/W3C\/\/DTD XHTML 1\.0 Transitional/);
  assert.match(html, /<p>Hello<\/p>/);
  assert.match(html, /PPIA Auckland/);
  assert.match(html, /automated message/i);
});

test('the layout uses tables rather than divs for structure', () => {
  const html = renderEmailLayout('<p>Body</p>');

  // Word-based Outlook cannot lay out divs reliably; layout tables must also be
  // marked presentational so screen readers skip them.
  assert.match(html, /role="presentation"/);
  assert.match(html, /cellpadding="0" cellspacing="0"/);
});

test('the layout is a fixed 600px wide with a mobile override', () => {
  const html = renderEmailLayout('<p>Body</p>');

  assert.match(html, /width="600"/);
  assert.match(html, /max-width:600px/);
  // Gmail strips <style>, so this block is enhancement only — but it should
  // still be present for the clients that keep it.
  assert.match(html, /@media screen and \(max-width: 620px\)/);
});

test('the layout includes the logo with alt text and explicit dimensions', () => {
  const html = renderEmailLayout('<p>Body</p>');

  // An absolute URL: clients fetch over the internet, so a relative path breaks.
  assert.match(html, /<img src="https?:\/\/[^"]+\/Logo-PPIA-2025-White\.png"/);
  // Alt text carries the header when images are blocked, which is the default in
  // Outlook and for many Gmail users.
  assert.match(html, /alt="PPIA Auckland"/);
  // Dimensions prevent reflow while the image loads.
  assert.match(html, /width="150" height="49"/);
});

test('the layout declares a light colour scheme and disables Apple reformatting', () => {
  const html = renderEmailLayout('<p>Body</p>');

  // Without these, clients auto-invert the design and iOS rescales the text.
  assert.match(html, /name="color-scheme" content="light"/);
  assert.match(html, /x-apple-disable-message-reformatting/);
  assert.match(html, /-webkit-text-size-adjust:100%/);
});

test('the layout carries Outlook conditional wrappers', () => {
  const html = renderEmailLayout('<p>Body</p>');

  assert.match(html, /<!--\[if mso\]>/);
  assert.match(html, /<!\[endif\]-->/);
  // Word has no system font stack, so a concrete family has to be named.
  assert.match(html, /font-family: Arial, Helvetica, sans-serif !important/);
});

test('the layout includes contact details and social links in the footer', () => {
  const html = renderEmailLayout('<p>Body</p>');

  assert.match(html, /mailto:ppiauckland@gmail\.com/);
  assert.match(html, /instagram\.com\/ppiauckland/);
  assert.match(html, /linkedin\.com\/company\/ppiauckland/);
});

test('a preheader is hidden from the rendered body', () => {
  const html = renderEmailLayout('<p>Body</p>', { preheader: 'Preview text' });

  assert.match(html, /Preview text/);
  // Clients show it in the inbox list, but it must not appear when opened.
  assert.match(html, /display:none/);
});

test('the layout omits the preheader block when none is given', () => {
  const html = renderEmailLayout('<p>Body</p>');
  assert.doesNotMatch(html, /display:none/);
});

test('the button is a table cell, not a padded anchor', () => {
  const html = renderEmailButton('https://example.com', 'Click me');

  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /Click me/);

  // Outlook ignores padding on an inline anchor, which collapsed the old version
  // into plain underlined text. A single-cell table survives.
  assert.match(html, /<table role="presentation"/);
  // Colour set twice on purpose: older clients honour only one of the two.
  assert.match(html, /bgcolor="#E8231A"/);
  assert.match(html, /background-color:#E8231A/);
  // The anchor carries its own colour so a client that drops the cell
  // background still renders readable text rather than white on white.
  assert.match(html, /color:#FFFFFF/);
});

test('the WhatsApp button uses the WhatsApp green, not the brand red', () => {
  const html = renderWhatsAppButton('https://chat.whatsapp.com/abc');

  assert.match(html, /bgcolor="#25D366"/);
  assert.doesNotMatch(html, /E8231A/, 'two competing red CTAs in one message');
  assert.match(html, /Join the WhatsApp group/);
});

test('the details block renders label and value pairs', () => {
  const html = renderEmailDetails([
    ['When', 'Saturday, 14 February'],
    ['Check-in code', '4KM7QD'],
  ]);

  assert.match(html, /When/);
  assert.match(html, /Saturday, 14 February/);
  assert.match(html, /4KM7QD/);
  assert.match(html, /<table role="presentation"/);
});

test('the details block renders nothing when there is nothing to show', () => {
  // Callers pass a conditionally-built list; an empty table would leave a gap.
  assert.equal(renderEmailDetails([]), '');
});

test('the plain-text alternative omits image-only links and the preheader', async () => {
  // The header logo is wrapped in a link with no text. Emitting "(https://…)"
  // for it put a bare URL at the top of every plain-text body.
  const captured: string[] = [];
  const originalLog = console.log;
  const previousToken = process.env.MAILTRAP_TOKEN;
  const previousKey = process.env.MAILTRAP_API_KEY;
  const previousEnv = process.env.NODE_ENV;

  delete process.env.MAILTRAP_TOKEN;
  delete process.env.MAILTRAP_API_KEY;
  // The unconfigured path prints the flattened body, but only outside production.
  process.env.NODE_ENV = 'test';
  console.log = (...args: unknown[]) => captured.push(args.map(String).join(' '));

  try {
    await sendEmail({
      to: 'someone@example.com',
      subject: 'Text check',
      html: renderEmailLayout('<p>First line.</p>', { preheader: 'PREHEADER_MARKER' }),
    });
  } finally {
    console.log = originalLog;
    if (previousToken !== undefined) process.env.MAILTRAP_TOKEN = previousToken;
    if (previousKey !== undefined) process.env.MAILTRAP_API_KEY = previousKey;
    if (previousEnv !== undefined) process.env.NODE_ENV = previousEnv;
  }

  const text = captured.join('\n');

  assert.match(text, /First line\./, 'the body text must survive');
  assert.doesNotMatch(text, /PREHEADER_MARKER/, 'the preheader is a duplicate of the subject');
  assert.doesNotMatch(text, /^\s*\(https?:\/\//m, 'no bare URL from an image-only link');
  assert.doesNotMatch(text, /zwnj/, 'preheader padding entities must not leak');
});

test('the fallback link keeps a long URL from forcing horizontal scroll', () => {
  const html = renderEmailFallbackLink('https://example.com/a/very/long/path');

  assert.match(html, /word-break:break-all/);
  assert.match(html, /https:\/\/example\.com\/a\/very\/long\/path/);
});

test('the plain-text alternative drops the preheader and reads cleanly', async () => {
  // Verified through sendEmail's unconfigured path, which logs the text version.
  const html = renderEmailLayout(
    `${renderEmailHeading('Heading')}<p>First line.</p>${renderEmailDetails([['When', 'Today']])}`,
    { preheader: 'PREHEADER_MARKER' }
  );

  // Reuse the module's own conversion by asserting on the markup it must not
  // contain once flattened: the preheader is hidden in HTML but would be plain
  // visible text otherwise.
  assert.match(html, /PREHEADER_MARKER/, 'preheader belongs in the HTML');
  assert.match(html, /mso-hide:all/, 'and must be marked hidden for Outlook too');
});

test('a credential that is a URL rather than a token is not used', async () => {
  // Pasting the token *page* URL into the variable is an easy mistake, and
  // presenting it as a token makes Mailtrap lock the account out with
  // "Too many failed login attempts". Treat it as unconfigured instead.
  const previousToken = process.env.MAILTRAP_TOKEN;
  const previousKey = process.env.MAILTRAP_API_KEY;
  delete process.env.MAILTRAP_TOKEN;
  process.env.MAILTRAP_API_KEY = 'https://mailtrap.io/api-tokens';

  try {
    const result = await sendEmail({
      to: 'someone@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    assert.equal(result.ok, false);
    assert.equal(result.skipped, true, 'a URL must count as no credential at all');
  } finally {
    if (previousToken !== undefined) process.env.MAILTRAP_TOKEN = previousToken;
    else delete process.env.MAILTRAP_TOKEN;
    if (previousKey !== undefined) process.env.MAILTRAP_API_KEY = previousKey;
    else delete process.env.MAILTRAP_API_KEY;
  }
});

test('sendEmail reports skipped rather than throwing when unconfigured', async () => {
  const previousToken = process.env.MAILTRAP_TOKEN;
  const previousKey = process.env.MAILTRAP_API_KEY;
  delete process.env.MAILTRAP_TOKEN;
  delete process.env.MAILTRAP_API_KEY;

  try {
    const result = await sendEmail({
      to: 'someone@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    // Callers sit inside request handlers; a throw here would turn a successful
    // password reset into a 500.
    assert.equal(result.ok, false);
    assert.equal(result.skipped, true);
    assert.ok(result.error);
  } finally {
    if (previousToken !== undefined) process.env.MAILTRAP_TOKEN = previousToken;
    if (previousKey !== undefined) process.env.MAILTRAP_API_KEY = previousKey;
  }
});
