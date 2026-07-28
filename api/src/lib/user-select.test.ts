/**
 * Contract tests for the User field allowlists.
 *
 * These are the guard rails that stopped password hashes and reset tokens being
 * serialised into API responses. They are allowlists precisely so a new column
 * stays out of responses by default — this test is what turns that intent into
 * something that fails loudly if someone widens them by accident.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  USER_SAFE_SELECT,
  USER_SAFE_SELECT_WITH_DIVISION,
  USER_DIRECTORY_SELECT,
} from './user-select';

/** Anything that grants access to an account if it leaks. */
const CREDENTIAL_FIELDS = [
  'password',
  'resetToken',
  'resetTokenExpiry',
  'verificationToken',
  'verificationExpiry',
];

/**
 * Contact and identity details a member gave the committee for administration.
 * Fine for an admin screen, not fine for a member-to-member directory.
 */
const PRIVATE_FIELDS = [
  'email',
  'personalEmail',
  'universityEmail',
  'phone',
  'studentId',
  'upi',
  'funding',
  'loaCoe',
  'memberCardUrl',
  'membershipStatus',
  'approvedBy',
  'rejectionReason',
];

test('no credential field appears in any select', () => {
  for (const select of [
    USER_SAFE_SELECT,
    USER_SAFE_SELECT_WITH_DIVISION,
    USER_DIRECTORY_SELECT,
  ]) {
    for (const field of CREDENTIAL_FIELDS) {
      assert.ok(
        !(field in select),
        `${field} must never be selectable — it grants account access`
      );
    }
  }
});

test('the directory select carries no contact or identity details', () => {
  for (const field of PRIVATE_FIELDS) {
    assert.ok(
      !(field in USER_DIRECTORY_SELECT),
      `${field} must not reach the member directory`
    );
  }
});

test('the directory select still has what a directory needs', () => {
  for (const field of ['id', 'username', 'name', 'avatar', 'university', 'major', 'degree']) {
    assert.ok(field in USER_DIRECTORY_SELECT, `${field} is missing from the directory`);
  }
  assert.ok('division' in USER_DIRECTORY_SELECT);
});

test('the directory select is a strict subset of the safe select, plus division', () => {
  // If a field is safe enough for the directory it must also be in the broader
  // admin select; a field appearing only in the directory would mean the two
  // lists have drifted apart.
  const safeKeys = new Set(Object.keys(USER_SAFE_SELECT_WITH_DIVISION));

  for (const key of Object.keys(USER_DIRECTORY_SELECT)) {
    assert.ok(safeKeys.has(key), `${key} is in the directory but not in the safe select`);
  }
});

test('the admin select does expose contact details, on purpose', () => {
  // Recorded as an expectation rather than an oversight: the member management
  // screens need these, which is exactly why the directory has its own list.
  assert.ok('email' in USER_SAFE_SELECT);
  assert.ok('phone' in USER_SAFE_SELECT);
});

test('every selected field is set to true or is a nested select', () => {
  for (const [key, value] of Object.entries(USER_DIRECTORY_SELECT)) {
    const isScalar = value === true;
    const isRelation = typeof value === 'object' && value !== null && 'select' in value;
    assert.ok(isScalar || isRelation, `${key} has an unexpected select shape`);
  }
});
