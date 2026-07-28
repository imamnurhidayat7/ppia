export interface PageDraft {
  title?: string | null;
  slug?: string | null;
  content?: unknown;
}

export interface PageValidationResult {
  valid: boolean;
  errors: { title?: string; address?: string; content?: string };
}

export function validatePageDraft(input: PageDraft): PageValidationResult {
  const errors: PageValidationResult['errors'] = {};
  if (!input.title?.trim()) errors.title = 'Title is required';
  if (!input.slug?.trim()) errors.address = 'Page address is required';
  if (input.content == null) {
    errors.content = 'Page content is required';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
