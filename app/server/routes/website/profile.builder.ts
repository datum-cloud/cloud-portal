import { createHmac } from 'crypto';

export interface Profile {
  email?: string;
  givenName?: string;
  familyName?: string;
  org?: { name: string; displayName: string };
  /** Reserved. Populated once the billing source decision lands (spec section 11). */
  plan?: string;
  helpscout?: { signature: string };
}

/** HelpScout Beacon secure mode: hex HMAC-SHA256 of the visitor's email. */
export function helpscoutSignature(secret: string, email: string): string {
  return createHmac('sha256', secret).update(email).digest('hex');
}

export function buildProfile(input: {
  user: { email?: string; givenName?: string; familyName?: string };
  org?: { name: string; displayName: string };
  secret?: string;
}): Profile {
  const profile: Profile = {};
  if (input.user.email) profile.email = input.user.email;
  if (input.user.givenName) profile.givenName = input.user.givenName;
  if (input.user.familyName) profile.familyName = input.user.familyName;
  if (input.org) profile.org = input.org;
  if (input.secret && input.user.email) {
    profile.helpscout = { signature: helpscoutSignature(input.secret, input.user.email) };
  }
  return profile;
}
