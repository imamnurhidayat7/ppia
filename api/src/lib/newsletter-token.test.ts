/**
 * Tests for newsletter unsubscribe tokens.
 *
 * The token is the only thing standing between a public GET endpoint and anybody
 * being able to unsubscribe an address they can guess, so the negative cases
 * matter more than the positive one.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

// Signing reads JWT_SECRET at call time, not at import time, so setting it here
// is enough. The tests do not load .env — they must not depend on a developer's
// local secret, or the expected tokens would differ per machine.
process.env.JWT_SECRET = 'test-secret-for-newsletter-tokens';

import { unsubscribeToken, verifyUnsubscribeToken, unsubscribeUrl } from './newsletter-token';

const EMAIL = 'member@example.com';

test('a token verifies against the address it was made for', () => {
  assert.equal(verifyUnsubscribeToken(EMAIL, unsubscribeToken(EMAIL)), true);
});

test('addresses are compared case-insensitively', () => {
  const token = unsubscribeToken(EMAIL);

  // Mail clients and users capitalise addresses inconsistently; the same person
  // must not be locked out of unsubscribing by a capital letter.
  assert.equal(verifyUnsubscribeToken('MEMBER@EXAMPLE.COM', token), true);
  assert.equal(verifyUnsubscribeToken('  member@example.com  ', token), true);
});

test('a token does not work for a different address', () => {
  const token = unsubscribeToken(EMAIL);
  assert.equal(verifyUnsubscribeToken('someone.else@example.com', token), false);
});

test('a tampered token is rejected', () => {
  const token = unsubscribeToken(EMAIL);
  const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

  assert.equal(verifyUnsubscribeToken(EMAIL, tampered), false);
});

test('a token of the wrong length is rejected without throwing', () => {
  // timingSafeEqual throws on a length mismatch, so the length check has to come
  // first — otherwise this endpoint 500s on any malformed link.
  assert.equal(verifyUnsubscribeToken(EMAIL, 'short'), false);
  assert.equal(verifyUnsubscribeToken(EMAIL, 'x'.repeat(200)), false);
});

test('missing inputs are rejected', () => {
  assert.equal(verifyUnsubscribeToken('', unsubscribeToken(EMAIL)), false);
  assert.equal(verifyUnsubscribeToken(EMAIL, ''), false);
});

test('the URL carries the normalised address and its token', () => {
  const url = new URL(unsubscribeUrl('Member@Example.com', 'https://ppiaauckland.org/'));

  assert.equal(url.pathname, '/newsletter/unsubscribe');
  assert.equal(url.searchParams.get('email'), 'member@example.com');
  assert.equal(
    verifyUnsubscribeToken('member@example.com', url.searchParams.get('token') as string),
    true
  );
  // A trailing slash on the configured base must not produce a double slash.
  assert.ok(!url.pathname.startsWith('//'));
});
