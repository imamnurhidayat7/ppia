import assert from 'node:assert/strict';
import { assertCustomPage, TEMPLATE_BLOCK_ERROR, TemplatePageBlocksError } from './page-content-mode';

assert.doesNotThrow(() => assertCustomPage({ pageType: 'custom' }));
assert.throws(
  () => assertCustomPage({ pageType: 'standard' }),
  (error) => error instanceof TemplatePageBlocksError && error.message === TEMPLATE_BLOCK_ERROR,
);
