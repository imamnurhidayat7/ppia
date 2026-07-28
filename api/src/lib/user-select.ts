import { Prisma } from '@prisma/client';

/**
 * Field allowlist for any `User` record that leaves the API.
 *
 * Prisma's `include` only *adds* relations — it does not restrict the root
 * model's scalar fields. So a query written as
 *
 *   prisma.user.findMany({ include: { division: { select: { id: true } } } })
 *
 * returns every column on `User`, which meant `password`, `resetToken` and the
 * e-mail verification tokens were being serialised straight into API responses.
 *
 * This is an allowlist rather than a list of fields to omit: when a new
 * sensitive column is added to the schema it stays out of responses by default
 * instead of leaking until somebody remembers to exclude it.
 *
 * Deliberately excluded:
 *   password            — bcrypt hash
 *   resetToken          — grants password reset, i.e. account takeover
 *   resetTokenExpiry
 *   verificationToken   — grants e-mail verification
 *   verificationExpiry
 */
export const USER_SAFE_SELECT = {
  id: true,
  email: true,
  username: true,
  name: true,
  role: true,
  position: true,
  divisionId: true,
  avatar: true,
  personalEmail: true,
  firstName: true,
  lastName: true,
  phone: true,
  studentId: true,
  university: true,
  universityEmail: true,
  upi: true,
  degree: true,
  major: true,
  graduationDate: true,
  funding: true,
  loaCoe: true,
  consent: true,
  confirmation: true,
  createdAt: true,
  updatedAt: true,
  bio: true,
  instagram: true,
  isVerified: true,
  linkedIn: true,
  memberCardUrl: true,
  twitter: true,
  membershipStatus: true,
  approvedAt: true,
  approvedBy: true,
  rejectionReason: true,
} satisfies Prisma.UserSelect;

/** The safe field set plus the member's division, as the admin screens expect. */
export const USER_SAFE_SELECT_WITH_DIVISION = {
  ...USER_SAFE_SELECT,
  division: {
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
    },
  },
} satisfies Prisma.UserSelect;

/**
 * Field set for the member directory, which any signed-in member can read.
 *
 * This is a deliberately narrower list than `USER_SAFE_SELECT`. That one is safe
 * in the sense that it never leaks credentials, but it still carries contact and
 * identity details — e-mail addresses, phone number, student id, UPI, funding
 * source — that are fine for an administrator and not fine for the person
 * sitting next to you in a lecture.
 *
 * A member directory exists so people can find each other; it does not need to
 * hand out the means to contact them off-platform. Social links are included
 * because a member chose to publish those themselves.
 *
 * Deliberately excluded, beyond everything USER_SAFE_SELECT already omits:
 *   email, personalEmail, universityEmail  — contact details
 *   phone
 *   studentId, upi                          — institutional identifiers
 *   funding, loaCoe                         — financial and immigration data
 *   memberCardUrl                           — links to a document with the above
 *   membershipStatus, approvedBy, rejectionReason — internal moderation state
 */
export const USER_DIRECTORY_SELECT = {
  id: true,
  username: true,
  name: true,
  avatar: true,
  bio: true,
  role: true,
  position: true,
  university: true,
  major: true,
  degree: true,
  graduationDate: true,
  linkedIn: true,
  instagram: true,
  twitter: true,
  createdAt: true,
  division: {
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
    },
  },
} satisfies Prisma.UserSelect;
