/**
 * Contract tests for the config-based storage seam.
 *
 * Moving file storage (Supabase → Hostinger VPS, a CDN, …) must be an env
 * change, never a code edit. These tests pin the two halves of that promise:
 * `resolvePublicBase` picks the right base from config alone, and
 * `storedKeyForValue` reduces stored values to stable keys without ever
 * mangling foreign URLs or site assets.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAbsoluteUrl,
  publicUrlForKey,
  resolvePublicBase,
  storedKeyForValue,
} from './storage';

test('resolvePublicBase prefers the explicit override', () => {
  assert.equal(
    resolvePublicBase({
      explicit: 'https://cdn.example.com/files/',
      driver: 'supabase',
      apiUrl: 'http://localhost:4000',
      supabaseBase: 'https://ref.supabase.co/storage/v1/object/public/uploads',
    }),
    'https://cdn.example.com/files'
  );
});

test('resolvePublicBase follows the driver when unset', () => {
  assert.equal(
    resolvePublicBase({
      explicit: '',
      driver: 'supabase',
      apiUrl: 'http://localhost:4000',
      supabaseBase: 'https://ref.supabase.co/storage/v1/object/public/uploads',
    }),
    'https://ref.supabase.co/storage/v1/object/public/uploads'
  );
  assert.equal(
    resolvePublicBase({
      explicit: '',
      driver: 'local',
      apiUrl: 'https://api.example.com',
      supabaseBase: null,
    }),
    'https://api.example.com/uploads'
  );
});

test('isAbsoluteUrl only matches fully-qualified and inline payloads', () => {
  assert.equal(isAbsoluteUrl('https://x/y.png'), true);
  assert.equal(isAbsoluteUrl('http://x/y.png'), true);
  assert.equal(isAbsoluteUrl('data:image/png;base64,AAA'), true);
  assert.equal(isAbsoluteUrl('/uploads/a.png'), false);
  assert.equal(isAbsoluteUrl('1720000000-1.png'), false);
  assert.equal(isAbsoluteUrl(null), false);
});

test('publicUrlForKey passes absolute values through', () => {
  const external = 'https://example.com/logo.svg';
  assert.equal(publicUrlForKey(external), external);
});

test('publicUrlForKey resolves bare keys under the base', () => {
  assert.ok(publicUrlForKey('1720000000-1.png').endsWith('/1720000000-1.png'));
});

test('storedKeyForValue keeps bare keys and drops site assets', () => {
  assert.equal(storedKeyForValue('1720000000-1.png', []), '1720000000-1.png');
  assert.equal(storedKeyForValue('loa-coe/1720000000-1.pdf', []), 'loa-coe/1720000000-1.pdf');
  assert.equal(storedKeyForValue('/logo.svg', []), null);
  assert.equal(storedKeyForValue(null, []), null);
});

test('storedKeyForValue strips only known prefixes', () => {
  const prefixes = [
    'https://api.example.com/uploads',
    'https://ref.supabase.co/storage/v1/object/public/uploads',
  ];
  assert.equal(
    storedKeyForValue('https://api.example.com/uploads/1720000000-1.png', prefixes),
    '1720000000-1.png'
  );
  assert.equal(
    storedKeyForValue(
      'https://ref.supabase.co/storage/v1/object/public/uploads/1720000000-1.png',
      prefixes
    ),
    '1720000000-1.png'
  );
  // Foreign hosts and lookalike paths are never mangled.
  assert.equal(storedKeyForValue('https://img.youtube.com/vi/abc/maxresdefault.jpg', prefixes), null);
  assert.equal(storedKeyForValue('https://api.example.com.evil.com/uploads/a.png', prefixes), null);
  assert.equal(storedKeyForValue('/uploads/1720000000-1.png', prefixes), '1720000000-1.png');
});
