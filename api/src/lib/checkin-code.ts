/**
 * Short check-in codes for event registrations.
 *
 * At the door, finding an attendee by name in a list is slow and error-prone
 * with similar names. A six-character code the member can read off their screen
 * is faster and unambiguous.
 *
 * The code is *derived* from the registration id rather than stored, so this
 * needed no schema change and no backfill: every existing registration already
 * has one.
 *
 * It is not a secret. Checking someone in still requires an authenticated
 * organiser, and the lookup is scoped to a single event — the code only removes
 * typing a name, it does not grant anything.
 */
import crypto from 'crypto';

/**
 * Alphabet without the characters people misread when copying by eye or voice:
 * no 0/O, no 1/I/L, no 8/B, no 5/S, no 2/Z.
 */
const ALPHABET = '34679ACDEFGHJKMNPQRTUVWXY';
const CODE_LENGTH = 6;

/**
 * Deterministic code for a registration id.
 *
 * Hashing rather than slicing the id keeps codes evenly spread across the
 * alphabet — cuid ids share a prefix, so a slice of the raw id would produce
 * near-identical codes for registrations created at the same time.
 */
export const checkInCodeFor = (registrationId: string): string => {
  const digest = crypto.createHash('sha256').update(registrationId).digest();

  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[digest[i] % ALPHABET.length];
  }
  return code;
};

/**
 * Characters that are not in the alphabet, mapped to the one they were most
 * likely misread from. A typist who enters `0` was almost certainly looking at
 * a `Q`, because the alphabet contains no zero.
 */
const CONFUSABLE: Record<string, string> = {
  O: 'Q',
  '0': 'Q',
  I: 'J',
  L: 'J',
  '1': 'J',
  B: '6',
  '8': '6',
  S: '6',
  '5': '6',
  Z: '7',
  '2': '7',
};

/**
 * Normalise something a person typed into a comparable code.
 *
 * Upper-cases, drops the spaces and dashes people add for readability, and
 * repairs the common misreadings above.
 */
export const normaliseCheckInCode = (input: string): string => {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');

  let normalised = '';
  for (const character of cleaned) {
    normalised += CONFUSABLE[character] ?? character;
  }

  return normalised.slice(0, CODE_LENGTH);
};

export default checkInCodeFor;
