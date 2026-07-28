/**
 * Tests for HTML sanitisation.
 *
 * Every long-form field on this site is authored as HTML and rendered through
 * `dangerouslySetInnerHTML`, so this module is the only thing between stored
 * content and script execution on the public site. The negative cases below are
 * the point of the file.
 *
 * Run with: npm test  (node --import tsx --test)
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeHtml, safeJsonLd, toPlainText } from './sanitize-html';

test('keeps the formatting the editor can produce', () => {
  const html =
    '<h2>Heading</h2><p><strong>Bold</strong> and <em>italic</em> and <u>underlined</u></p>' +
    '<ul><li>One</li><li>Two</li></ul><blockquote>Quoted</blockquote>';

  const clean = sanitizeHtml(html);

  assert.match(clean, /<h2>Heading<\/h2>/);
  assert.match(clean, /<strong>Bold<\/strong>/);
  assert.match(clean, /<em>italic<\/em>/);
  assert.match(clean, /<u>underlined<\/u>/);
  assert.match(clean, /<li>One<\/li>/);
  assert.match(clean, /<blockquote>Quoted<\/blockquote>/);
});

test('removes script elements but keeps the surrounding text', () => {
  const clean = sanitizeHtml('<p>Before</p><script>alert(1)</script><p>After</p>');

  assert.doesNotMatch(clean, /<script/i);
  assert.doesNotMatch(clean, /alert\(1\)/);
  assert.match(clean, /Before/);
  assert.match(clean, /After/);
});

test('strips inline event handlers', () => {
  const clean = sanitizeHtml('<p onclick="steal()">Click</p><img src=x onerror="steal()">');

  assert.doesNotMatch(clean, /onclick/i);
  assert.doesNotMatch(clean, /onerror/i);
  assert.doesNotMatch(clean, /steal/);
});

test('drops javascript: URLs from links', () => {
  const clean = sanitizeHtml('<a href="javascript:alert(1)">Tap</a>');

  assert.doesNotMatch(clean, /javascript:/i);
  // The link text survives; only the destination is removed.
  assert.match(clean, /Tap/);
});

test('keeps ordinary link destinations', () => {
  for (const href of ['https://example.com/x', 'mailto:hi@example.com', 'tel:+6491234567']) {
    assert.match(sanitizeHtml(`<a href="${href}">link</a>`), new RegExp(href.replace(/[+]/g, '\\+')));
  }
});

test('adds noopener noreferrer to links that open a new tab', () => {
  // Without noopener the opened page can navigate the tab it came from.
  const clean = sanitizeHtml('<a href="https://example.com" target="_blank">out</a>');

  assert.match(clean, /rel="noopener noreferrer"/);
});

test('removes tags the editor cannot produce', () => {
  const clean = sanitizeHtml(
    '<iframe src="https://evil.example"></iframe><form><input name="pw"></form><p>Text</p>'
  );

  assert.doesNotMatch(clean, /<iframe/i);
  assert.doesNotMatch(clean, /<form/i);
  assert.doesNotMatch(clean, /<input/i);
  assert.match(clean, /Text/);
});

test('survives markup that tries to break out of an attribute', () => {
  const clean = sanitizeHtml('<p title="a&quot;><script>alert(1)</script>">x</p>');

  assert.doesNotMatch(clean, /<script/i);
});

test('non-string input yields an empty string instead of throwing', () => {
  // These values come from a JSON column and are null on older rows.
  assert.equal(sanitizeHtml(null), '');
  assert.equal(sanitizeHtml(undefined), '');
  assert.equal(sanitizeHtml(42), '');
  assert.equal(sanitizeHtml({}), '');
  assert.equal(sanitizeHtml(''), '');
});

test('safeJsonLd escapes the characters that can end a script element', () => {
  const json = safeJsonLd({ name: '</script><script>alert(1)</script>' });

  // JSON.stringify alone leaves `<` intact, which would close the element early.
  assert.doesNotMatch(json, /<\/script>/);
  assert.doesNotMatch(json, /</);
  assert.doesNotMatch(json, />/);
  assert.match(json, /\\u003c/);

  // Still valid JSON with the original value intact.
  assert.equal(JSON.parse(json).name, '</script><script>alert(1)</script>');
});

test('safeJsonLd escapes ampersands', () => {
  const json = safeJsonLd({ name: 'Fish & Chips' });

  assert.doesNotMatch(json, /&/);
  assert.equal(JSON.parse(json).name, 'Fish & Chips');
});

test('toPlainText removes markup and decodes entities', () => {
  assert.equal(
    toPlainText('<p style="text-align: justify;">Rony &amp; Friends</p>'),
    'Rony & Friends'
  );
  assert.equal(toPlainText('<p>Line one</p><p>Line two</p>'), 'Line one Line two');
  assert.equal(toPlainText('a<br>b'), 'a b');
});

test('toPlainText does not glue words together across block tags', () => {
  // The whole reason block tags become a space rather than nothing.
  assert.equal(toPlainText('<li>alpha</li><li>beta</li>'), 'alpha beta');
});

test('toPlainText collapses whitespace and trims', () => {
  assert.equal(toPlainText('<p>  spaced   out  </p>'), 'spaced out');
});

test('toPlainText handles non-string input', () => {
  assert.equal(toPlainText(null), '');
  assert.equal(toPlainText(undefined), '');
  assert.equal(toPlainText(123), '');
});
