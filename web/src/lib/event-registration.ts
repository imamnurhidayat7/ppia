/**
 * Event registration form model (shared by the admin builder and the public
 * registration form).
 *
 * An event stores its form as an array of field definitions in
 * `Event.registrationFields`. When that is null (never configured), the
 * built-in defaults below apply. The defaults are profile-backed, so a
 * logged-in member sees them pre-filled — but an admin may delete or reorder
 * them like any other field.
 */

export type RegFieldType = 'short_text' | 'long_text' | 'single_choice' | 'multiple_choice';

export interface RegField {
  id: string;
  type: RegFieldType;
  label: string;
  required: boolean;
  /** Choice options (single_choice / multiple_choice only). */
  options?: string[];
  /** Built-in fields pre-fill their answer from this user-profile key. */
  prefill?: 'name' | 'university' | 'degree' | 'major';
  /** True for the seeded default fields (still deletable). */
  isDefault?: boolean;
}

export type RegAnswer = string | string[];
export type RegResponses = Record<string, RegAnswer>;

export const REG_FIELD_TYPE_LABELS: Record<RegFieldType, string> = {
  short_text: 'Short answer',
  long_text: 'Paragraph',
  single_choice: 'Single choice',
  multiple_choice: 'Multiple choice',
};

/** Prisma `Degree` enum → the label used in the education-level options. */
export const DEGREE_LABELS: Record<string, string> = {
  BACHELOR: 'Bachelor',
  MASTER: 'Master',
  DOCTORATE: 'Doctorate',
  NON_DEGREE: 'Non-degree',
};

export const EDUCATION_OPTIONS = ['Bachelor', 'Master', 'Doctorate', 'Non-degree'];

export const DEFAULT_REGISTRATION_FIELDS: RegField[] = [
  { id: 'fullName', type: 'short_text', label: 'Full name', required: true, prefill: 'name', isDefault: true },
  { id: 'university', type: 'short_text', label: 'University', required: true, prefill: 'university', isDefault: true },
  {
    id: 'educationLevel',
    type: 'single_choice',
    label: 'Education level',
    required: true,
    options: EDUCATION_OPTIONS,
    prefill: 'degree',
    isDefault: true,
  },
  { id: 'major', type: 'short_text', label: 'Major / programme', required: true, prefill: 'major', isDefault: true },
];

/** The fields an event actually uses: stored definitions, or the defaults. */
export function resolveEventFields(registrationFields: unknown): RegField[] {
  return Array.isArray(registrationFields)
    ? (registrationFields as RegField[])
    : DEFAULT_REGISTRATION_FIELDS;
}

interface PrefillProfile {
  name?: string | null;
  university?: string | null;
  degree?: string | null;
  major?: string | null;
}

/** Seed answers for a logged-in member from their profile. */
export function prefillResponses(fields: RegField[], profile: PrefillProfile | null): RegResponses {
  const res: RegResponses = {};
  if (!profile) return res;
  for (const f of fields) {
    if (!f.prefill) continue;
    let value: string | undefined;
    if (f.prefill === 'name') value = profile.name ?? undefined;
    else if (f.prefill === 'university') value = profile.university ?? undefined;
    else if (f.prefill === 'major') value = profile.major ?? undefined;
    else if (f.prefill === 'degree') value = profile.degree ? DEGREE_LABELS[profile.degree] : undefined;
    if (!value) continue;
    if (f.type === 'single_choice') {
      if (f.options?.includes(value)) res[f.id] = value;
    } else if (f.type !== 'multiple_choice') {
      res[f.id] = value;
    }
  }
  return res;
}

/** Client-side validation. Returns a map of fieldId → error message. */
export function validateResponses(fields: RegField[], responses: RegResponses): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = responses[f.id];
    const empty =
      v == null ||
      (typeof v === 'string' && v.trim() === '') ||
      (Array.isArray(v) && v.length === 0);
    if (f.required && empty) {
      errors[f.id] = 'This field is required';
      continue;
    }
    if (empty) continue;
    if (f.type === 'single_choice' && typeof v === 'string' && f.options && !f.options.includes(v)) {
      errors[f.id] = 'Please pick one of the options';
    }
    if (f.type === 'multiple_choice' && Array.isArray(v) && f.options && v.some((x) => !f.options!.includes(x))) {
      errors[f.id] = 'Please pick from the options';
    }
  }
  return errors;
}

/** A short random id for a newly-added custom field. */
export function newFieldId(): string {
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}
