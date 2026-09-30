import { Transform } from 'class-transformer';

// Limits shared by the account DTOs. The web forms mirror these
// (frontend/src/validation/validation-schema.ts) so users see the problem next
// to the field instead of as a server error - keep the two in step.
export const NAME_MAX = 50;
export const EMAIL_MAX = 254;
export const PASSWORD_MIN = 8;
// bcrypt ignores everything after 72 bytes, so a longer password would be
// silently truncated; refuse it instead.
export const PASSWORD_MAX = 72;

// 7-15 digits, optionally with a leading +, spaces, dashes and parentheses:
// "012 345 678", "+855 12 345 678", "(023) 123-456".
export const PHONE_PATTERN = /^(?=(?:\D*\d){7,15}\D*$)\+?[0-9(][0-9 ()-]*[0-9]$/;

// Surrounding spaces are never meaningful in names/emails/phones (they mostly
// come from copy-paste); trimming here means "a@b.com " and "a@b.com" match.
export const Trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
