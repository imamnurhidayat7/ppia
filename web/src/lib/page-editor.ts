export type EditablePage = {
  id: string;
  slug: string;
  pageType: string;
};

export const isCustomPage = (page: Pick<EditablePage, 'pageType'>) =>
  page.pageType === 'custom';

/**
 * Single entry point for editing any CMS page.
 *
 * There used to be two editors — Page Builder for standard pages and Canvas for
 * custom ones — which meant the same task looked different depending on a field
 * most editors never see. Canvas is now the only editor; Page Builder redirects
 * here for old bookmarks.
 */
export const getPageEditorHref = (page: EditablePage) =>
  `/dashboard/admin/canvas/${page.slug}`;
