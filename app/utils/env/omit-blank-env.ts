// app/utils/env/omit-blank-env.ts

/**
 * Drops keys whose value is blank, so Zod's `.default()` and `.optional()` can
 * fire on them.
 *
 * Zod treats only `undefined` as absent, but blank values reach us routinely:
 *
 *   - GitHub Actions exports an unset secret as an empty string, so
 *     `env: { FOO: ${{ secrets.FOO }} }` yields `FOO=""` when FOO isn't set.
 *   - `KEY=` in a .env file parses to an empty string the same way — including
 *     `AUTH_OIDC_POST_LOGOUT_REDIRECT_URI=` in this repo's .env.example.
 *
 * Without this, a blank value is validated as present-but-invalid and
 * env.server.ts exits(1) with a confusing `"Invalid URL"` instead of falling
 * back to the default. That took out the entire CI unit-test job — zero tests
 * reported — whenever the AUTH_OIDC_ISSUER secret was absent.
 *
 * Whitespace-only values count as blank. Values that merely *look* falsy
 * (`'0'`, `'false'`) are meaningful and preserved.
 */
export function omitBlankEnv(source: Record<string, string | undefined>): Record<string, string> {
  const present = Object.entries(source).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[1].trim() !== ''
  );

  return Object.fromEntries(present);
}
