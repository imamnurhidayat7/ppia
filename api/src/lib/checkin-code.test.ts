/**
 * Tests for event check-in codes.
 *
 * The code is derived rather than stored, so determinism is a correctness
 * requirement: if the derivation ever changed, every code already shown to a
 * member or printed on a confirmation e-mail would stop working.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { checkInCodeFor, normaliseCheckInCode } from './checkin-code';

const SAMPLE_ID = 'cms4js8p300032rgnpkjb8jja';

test('the same id always produces the same code', () => {
  assert.equal(checkInCodeFor(SAMPLE_ID), checkInCodeFor(SAMPLE_ID));
});

test('different ids produce different codes', () => {
  assert.notEqual(checkInCodeFor('a'), checkInCodeFor('b'));
});

test('codes are six characters from the unambiguous alphabet', () => {
  // No 0/O, 1/I/L, 8/B, 5/S or 2/Z, so a code cannot be misread aloud.
  const alphabet = /^[34679ACDEFGHJKMNPQRTUVWXY]{6}$/;

  for (let i = 0; i < 200; i += 1) {
    assert.match(checkInCodeFor(`registration-${i}`), alphabet);
  }
});

test('ids sharing a prefix still get well-spread codes', () => {
  // cuid values created in the same moment share a long prefix; slicing the raw
  // id would give near-identical codes. Hashing is what avoids that.
  const codes = new Set(
    Array.from({ length: 50 }, (_, i) => checkInCodeFor(`cms4js8p3000${i}2rgnpkjb8jja`))
  );
  assert.equal(codes.size, 50, 'codes collided for similar ids');
});

test('normalisation accepts what a person actually types', () => {
  const code = checkInCodeFor(SAMPLE_ID);

  assert.equal(normaliseCheckInCode(code.toLowerCase()), code);
  assert.equal(normaliseCheckInCode(code.split('').join(' ')), code);
  assert.equal(normaliseCheckInCode(`${code.slice(0, 3)}-${code.slice(3)}`), code);
});

test('normalisation repairs commonly misread characters', () => {
  // These are not in the alphabet, so seeing one means the reader mistook the
  // character next to it in the map.
  assert.equal(normaliseCheckInCode('OOOOOO'), 'QQQQQQ');
  assert.equal(normaliseCheckInCode('000000'), 'QQQQQQ');
  assert.equal(normaliseCheckInCode('IIILLL'), 'JJJJJJ');
  assert.equal(normaliseCheckInCode('111111'), 'JJJJJJ');
  assert.equal(normaliseCheckInCode('BBB888'), '666666');
  assert.equal(normaliseCheckInCode('ZZZ222'), '777777');
});

test('normalisation caps the length at six characters', () => {
  assert.equal(normaliseCheckInCode('ABCDEFGHIJ').length, 6);
});

test('normalisation of a short input stays short so callers can reject it', () => {
  // The controller relies on this to answer "codes are six characters".
  assert.equal(normaliseCheckInCode('AB').length, 2);
  assert.equal(normaliseCheckInCode('').length, 0);
});
