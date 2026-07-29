/**
 * Server-side model + validation for event registration forms.
 *
 * Mirrors web/src/lib/event-registration.ts. The admin submits field
 * definitions with the event; the public submits answers when registering.
 * Both are untrusted input, so field defs are sanitised on write and answers
 * are validated against the event's own fields on registration.
 */

export type RegFieldType = 'short_text' | 'long_text' | 'single_choice' | 'multiple_choice';

export interface RegField {
  id: string;
  type: RegFieldType;
  label: string;
  required: boolean;
  options?: string[];
  prefill?: string;
  isDefault?: boolean;
}

const FIELD_TYPES: RegFieldType[] = ['short_text', 'long_text', 'single_choice', 'multiple_choice'];

export const DEFAULT_REGISTRATION_FIELDS: RegField[] = [
  { id: 'fullName', type: 'short_text', label: 'Full name', required: true, prefill: 'name', isDefault: true },
  { id: 'university', type: 'short_text', label: 'University', required: true, prefill: 'university', isDefault: true },
  {
    id: 'educationLevel',
    type: 'single_choice',
    label: 'Education level',
    required: true,
    options: ['Bachelor', 'Master', 'Doctorate', 'Non-degree'],
    prefill: 'degree',
    isDefault: true,
  },
  { id: 'major', type: 'short_text', label: 'Major / programme', required: true, prefill: 'major', isDefault: true },
];

/**
 * Clean admin-submitted field definitions. Returns `undefined` when the input
 * is absent (leave the column untouched), or a sanitised array otherwise —
 * including an empty array, which is a deliberate "no fields" configuration.
 */
export function sanitizeRegistrationFields(input: unknown): RegField[] | undefined {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) return undefined;

  const seen = new Set<string>();
  const out: RegField[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const f = raw as Record<string, unknown>;
    const id = typeof f.id === 'string' ? f.id : '';
    const label = typeof f.label === 'string' ? f.label.trim().slice(0, 200) : '';
    const type = f.type as RegFieldType;
    if (!id || !label || !FIELD_TYPES.includes(type) || seen.has(id)) continue;
    seen.add(id);

    const field: RegField = { id, type, label, required: Boolean(f.required) };
    if (type === 'single_choice' || type === 'multiple_choice') {
      field.options = Array.isArray(f.options)
        ? f.options
            .filter((o): o is string => typeof o === 'string' && o.trim() !== '')
            .map((o) => o.trim().slice(0, 200))
        : [];
    }
    if (typeof f.prefill === 'string') field.prefill = f.prefill;
    if (f.isDefault) field.isDefault = true;
    out.push(field);
  }
  return out;
}

/** The fields an event uses for validation: its stored defs, or the defaults. */
export function fieldsForEvent(registrationFields: unknown): RegField[] {
  return Array.isArray(registrationFields)
    ? (registrationFields as RegField[])
    : DEFAULT_REGISTRATION_FIELDS;
}

type ValidateResult =
  | { ok: true; responses: Record<string, string | string[]> }
  | { ok: false; error: string };

/** Validate + normalise submitted answers against an event's fields. */
export function validateResponses(fields: RegField[], input: unknown): ValidateResult {
  const src = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const responses: Record<string, string | string[]> = {};

  for (const f of fields) {
    const raw = src[f.id];

    if (f.type === 'multiple_choice') {
      const arr = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
      const valid = arr.filter((x) => !f.options || f.options.includes(x)).map((x) => x.slice(0, 500));
      if (f.required && valid.length === 0) return { ok: false, error: `"${f.label}" is required` };
      if (valid.length) responses[f.id] = valid;
      continue;
    }

    const val = typeof raw === 'string' ? raw.trim() : '';
    if (f.required && val === '') return { ok: false, error: `"${f.label}" is required` };
    if (f.type === 'single_choice' && val !== '' && f.options && !f.options.includes(val)) {
      return { ok: false, error: `Invalid choice for "${f.label}"` };
    }
    if (val !== '') responses[f.id] = val.slice(0, 5000);
  }

  return { ok: true, responses };
}
