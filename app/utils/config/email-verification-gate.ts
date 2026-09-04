/**
 * The portal half of the email-verification gate's two-switch kill (the other
 * switch is milo's).
 *
 * OFF BY DEFAULT, and off for every value except the exact string 'true' —
 * the same rule CHATBOT_ENABLED uses in utils/env/env.server.ts.
 *
 * NOT in the validated env.server.ts schema, deliberately. This flag is read
 * from `resolveUserFraudRedirectPath`, which `routes/onboarding/layout.tsx`
 * imports into a ROUTE module, and `utils/env/index.ts` throws on any universal
 * access to server env. So it follows the precedent already set by
 * `features/onboarding/onboarding-dev-bypass.ts`: read process.env directly.
 * The `typeof process` guard makes a hypothetical client-side evaluation return
 * false rather than throw — also the fail-safe answer, since every decision
 * this flag feeds is made server-side.
 *
 * Read at CALL time, never cached at module scope. The flag is flipped by
 * rolling the Deployment, so caching would cost nothing in production — but it
 * would make the kill switch untestable, and an untested kill switch is not one.
 *
 * ORDERING:
 *   to ENABLE  — flip THIS first, then milo's gate.
 *   to DISABLE — flip milo's FIRST, then this one.
 * Backwards produces an app that loads and then fails on every request
 * (enable), or one that admits users its API still denies (disable).
 */
export function isEmailVerificationGateEnabled(): boolean {
  return typeof process !== 'undefined' && process.env.EMAIL_VERIFICATION_GATE === 'true';
}
