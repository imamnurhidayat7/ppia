/**
 * Tests for scholarship content normalisation.
 *
 * The CMS stores this data loosely — ids as numbers or strings, list fields as
 * `string[]`, `[{ value }]` or a comma-separated string — so the point of the
 * function is to accept all of it rather than break a page over one field.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { toScholarshipContent } from './scholarship-content';

const item = {
  id: 1,
  name: 'Test',
  provider: 'Provider',
  type: 'University',
  color: '#fff',
  level: ['Masters'],
  coverage: ['Tuition'],
  amount: 'Full',
  deadline: 'Annual',
  url: 'https://example.com',
  desc: 'Description',
};

test('passes through a well-formed record', () => {
  const [result] = toScholarshipContent({ scholarships: [item] });

  assert.deepEqual(result.level, ['Masters']);
  assert.deepEqual(result.coverage, ['Tuition']);
  assert.equal(result.id, 1);
  assert.equal(result.featured, false);
});

test('accepts the legacy [{ value }] list shape', () => {
  // Previously this case asserted an empty result, which contradicted the
  // documented behaviour of `toStringArray` — the function is meant to migrate
  // this shape, not reject it.
  const [result] = toScholarshipContent({
    scholarships: [{ ...item, level: [{ value: 'Masters' }, { value: 'PhD' }] }],
  });

  assert.deepEqual(result.level, ['Masters', 'PhD']);
});

test('accepts a comma-separated string for list fields', () => {
  const [result] = toScholarshipContent({
    scholarships: [{ ...item, coverage: 'Tuition, Living costs ,  Travel' }],
  });

  assert.deepEqual(result.coverage, ['Tuition', 'Living costs', 'Travel']);
});

test('coerces a string id to a number', () => {
  const [result] = toScholarshipContent({ scholarships: [{ ...item, id: '7' }] });
  assert.equal(result.id, 7);
});

test('falls back to defaults for missing optional fields', () => {
  const [result] = toScholarshipContent({ scholarships: [{ name: 'Only a name' }] });

  assert.equal(result.name, 'Only a name');
  assert.equal(result.type, 'University');
  assert.equal(result.color, '#3B82F6');
  assert.deepEqual(result.level, []);
  assert.equal(result.desc, '');
});

test('drops records with no usable name', () => {
  const results = toScholarshipContent({
    scholarships: [item, { ...item, name: '' }, { ...item, name: undefined }, null, 'nonsense'],
  });

  assert.equal(results.length, 1);
});

test('returns an empty list for anything that is not a scholarship array', () => {
  assert.deepEqual(toScholarshipContent(null), []);
  assert.deepEqual(toScholarshipContent(undefined), []);
  assert.deepEqual(toScholarshipContent({}), []);
  assert.deepEqual(toScholarshipContent({ scholarships: 'nope' }), []);
});
