import assert from 'node:assert/strict';
import { getPageEditorHref, isCustomPage } from './page-editor';

assert.equal(isCustomPage({ pageType: 'custom' }), true);
assert.equal(isCustomPage({ pageType: 'standard' }), false);

// Every page type resolves to the same editor: the canvas, keyed by slug.
assert.equal(
  getPageEditorHref({ id: 'page-1', slug: 'about/cabinet', pageType: 'standard' }),
  '/dashboard/admin/canvas/about/cabinet',
);
assert.equal(
  getPageEditorHref({ id: 'page-2', slug: 'campaign', pageType: 'custom' }),
  '/dashboard/admin/canvas/campaign',
);
assert.equal(
  getPageEditorHref({ id: 'page-3', slug: 'contact', pageType: 'landing' }),
  '/dashboard/admin/canvas/contact',
);
