/**
 * Tests for stored-file URL resolution.
 *
 * Database rows keep stable object KEYS; getImageUrl turns them into
 * browser-loadable URLs via NEXT_PUBLIC_FILES_BASE_URL. Absolute legacy URLs,
 * pasted external URLs and `/…` site-asset paths must resolve exactly as
 * before, so this file pins all three shapes.
 *
 * Run with: npm test  (node --import tsx --test)
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { getImageUrl } from './utils';
import { API_ORIGIN, FILES_BASE_URL } from './api-base';

test('absolute and inline URLs pass through untouched', () => {
  assert.equal(getImageUrl('https://ref.supabase.co/storage/v1/object/public/uploads/a.png'), 'https://ref.supabase.co/storage/v1/object/public/uploads/a.png');
  assert.equal(getImageUrl('http://api.example.com/uploads/a.png'), 'http://api.example.com/uploads/a.png');
  assert.equal(getImageUrl('data:image/png;base64,AAA'), 'data:image/png;base64,AAA');
  assert.equal(getImageUrl(null), undefined);
  assert.equal(getImageUrl(undefined), undefined);
});

test('/-paths resolve against the API origin (legacy behaviour)', () => {
  assert.equal(getImageUrl('/uploads/a.png'), `${API_ORIGIN}/uploads/a.png`);
  assert.equal(getImageUrl('/logo.svg'), `${API_ORIGIN}/logo.svg`);
});

test('bare storage keys resolve against the files base', () => {
  assert.equal(getImageUrl('1720000000-1.png'), `${FILES_BASE_URL}/1720000000-1.png`);
  assert.equal(getImageUrl('loa-coe/1720000000-1.pdf'), `${FILES_BASE_URL}/loa-coe/1720000000-1.pdf`);
});
