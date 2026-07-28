import assert from 'node:assert/strict';
import { validatePageDraft } from './page-editor-validation';

assert.deepEqual(validatePageDraft({ title: '', slug: '', content: null }), {
  valid: false,
  errors: {
    title: 'Title is required',
    address: 'Page address is required',
    content: 'Page content is required',
  },
});
assert.equal(validatePageDraft({ title: 'About', slug: 'about', content: {} }).valid, true);
