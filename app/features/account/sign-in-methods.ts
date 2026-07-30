// Pure row builder for the Security tab's Sign-in Methods card.
//
// Returns plain descriptors (never JSX) so it is unit-testable without a
// component renderer; the card maps descriptors to <IdentityItem> elements.
// URL construction lives here too — composing the /id prefix at call sites is
// what produced the /id/id/passkeys bug.
import type { Passkey, UserIdentity } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { AUTH_UI_PATH_PREFIX } from '@/utils/env/auth-ui-origin';

/** auth-ui's Linked accounts screen: link + unlink. Session-gated, takes no returnTo. */
export const AUTH_UI_SSO_PATH = `${AUTH_UI_PATH_PREFIX}/sso`;

/** auth-ui's passkey management screen. Sudo-gated (bounces via /id/reauth), honours returnTo. */
export const AUTH_UI_PASSKEYS_PATH = `${AUTH_UI_PATH_PREFIX}/passkeys`;

/**
 * Providers the portal offers to connect. There is no API listing *available*
 * IdPs, so this hardcoded set is diffed against the user's linked identities.
 *
 * KNOWN LIMITATION: because the set is static, a Connect row can advertise a
 * provider `/id/sso` does not actually offer for this org — auth-ui derives its
 * linkable list from live IdP config, this does not. The row is honest about
 * where it sends you, but it can be a dead end. Replace with a discovery
 * endpoint, or surface auth-ui's `linkable` set, if either ever lands.
 */
export const CONNECTABLE_PROVIDERS = ['google', 'github'] as const;

/**
 * Display labels keyed by lowercased `providerName`. Plain strings live here
 * rather than beside the icons so the tested builder does not pull React into
 * its test; `identity-providers.tsx` keys its icon map by the same strings.
 */
export const PROVIDER_LABELS: Record<string, string> = {
  email: 'Email',
  google: 'Google',
  github: 'GitHub',
};

export type SignInMethodRowKind = 'identity' | 'passkeys' | 'connect';

export interface SignInMethodRow {
  kind: SignInMethodRowKind;
  /** Stable React key. */
  key: string;
  /** Lowercased provider key; indexes PROVIDER_LABELS and the icon map. */
  providerKey: string;
  label: string;
  sublabel: string;
  /** Label for the right-hand action button. */
  actionLabel: string;
  /** Absolute URL the action opens. */
  href: string;
}

export interface BuildSignInMethodRowsInput {
  identities: UserIdentity[];
  /**
   * `null` means the passkey query failed. The row then says so instead of
   * asserting a count — passing `[]` on failure would render "No passkeys yet",
   * which is a confident false statement rather than an honest unknown.
   */
  passkeys: Passkey[] | null;
  /** Origin only, no trailing slash — see resolveAuthUiOrigin. */
  authUiOrigin: string;
  /** Absolute portal URL auth-ui returns to after passkey management. */
  returnTo: string;
}

export function buildSsoHref(authUiOrigin: string): string {
  return `${authUiOrigin}${AUTH_UI_SSO_PATH}`;
}

export function buildPasskeysHref(authUiOrigin: string, returnTo: string): string {
  return `${authUiOrigin}${AUTH_UI_PASSKEYS_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function buildSecurityReturnTo(appUrl: string): string {
  return `${appUrl}${paths.account.settings.security}`;
}

/**
 * Active passkeys only. An inactive credential is dead, and counting raw list
 * length would present it as working protection — the same bug auth-ui fixed in
 * its last-method guard (`passkeys.service.ts`).
 */
export function countActivePasskeys(passkeys: Passkey[]): number {
  return passkeys.filter((passkey) => passkey.state === 'Active').length;
}

/**
 * Lowercased provider key for an identity, used to index PROVIDER_LABELS and
 * the icon map. Exported so every card derives the key the same way — the two
 * cards that render identities previously disagreed on the fallback.
 */
export function providerKeyOf(identity: UserIdentity): string {
  return identity.providerName?.toLowerCase() || 'email';
}

/**
 * Display label for an identity. Single fallback chain, shared by both the
 * General tab's card and the Security tab's, so one API record can never render
 * two different strings.
 */
export function providerLabel(identity: UserIdentity): string {
  const key = providerKeyOf(identity);
  return PROVIDER_LABELS[key] ?? identity.providerName ?? PROVIDER_LABELS.email;
}

function passkeysSublabel(activeCount: number): string {
  if (activeCount === 0) return 'No passkeys yet';
  return `${activeCount} passkey${activeCount === 1 ? '' : 's'} registered`;
}

export function buildSignInMethodRows({
  identities,
  passkeys,
  authUiOrigin,
  returnTo,
}: BuildSignInMethodRowsInput): SignInMethodRow[] {
  const ssoHref = buildSsoHref(authUiOrigin);

  const identityRows: SignInMethodRow[] = identities.map((identity) => ({
    kind: 'identity',
    key: identity.name,
    providerKey: providerKeyOf(identity),
    label: providerLabel(identity),
    sublabel: identity.username ?? '',
    actionLabel: 'Manage',
    href: ssoHref,
  }));

  const activeCount = passkeys === null ? null : countActivePasskeys(passkeys);
  const passkeysRow: SignInMethodRow = {
    kind: 'passkeys',
    key: 'passkeys',
    providerKey: 'passkeys',
    label: 'Passkeys',
    sublabel: activeCount === null ? "Couldn't load your passkeys" : passkeysSublabel(activeCount),
    // Never offer "Add" on an unknown count — that implies zero.
    actionLabel: activeCount === 0 ? 'Add' : 'Manage',
    href: buildPasskeysHref(authUiOrigin, returnTo),
  };

  const linked = new Set(identityRows.map((row) => row.providerKey));
  const connectRows: SignInMethodRow[] = CONNECTABLE_PROVIDERS.filter(
    (provider) => !linked.has(provider)
  ).map((provider) => ({
    kind: 'connect',
    key: `connect-${provider}`,
    providerKey: provider,
    label: PROVIDER_LABELS[provider],
    sublabel: `Connect your ${PROVIDER_LABELS[provider]} account`,
    actionLabel: 'Connect',
    href: ssoHref,
  }));

  return [...identityRows, passkeysRow, ...connectRows];
}
