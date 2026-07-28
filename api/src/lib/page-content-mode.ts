export const TEMPLATE_BLOCK_ERROR = 'Template pages must be edited through Page content';

export class TemplatePageBlocksError extends Error {}

export function assertCustomPage(page: { pageType: string }) {
  if (page.pageType !== 'custom') {
    throw new TemplatePageBlocksError(TEMPLATE_BLOCK_ERROR);
  }
}
