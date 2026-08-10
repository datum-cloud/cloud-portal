/**
 * E-GATE — the cloud-portal half of the Phase B hard gate's two-switch kill.
 *
 * OFF BY DEFAULT, and off for every value except the exact string 'true'.
 * CHATBOT_ENABLED (utils/env/env.server.ts:86-88) uses the same `=== 'true'`
 * rule; matching it exactly is deliberate.
 *
 * NOT in the validated env.server.ts schema, deliberately. This flag is read
 * from `resolveUserFraudRedirectPath`, and `routes/onboarding/layout.tsx:14`
 * imports that function into a ROUTE module. `utils/env/index.ts:88-92` throws
 * on any universal access to server env, so the safe precedent is the one
 * `fraud-redirect.ts:1` already follows: `features/onboarding/onboarding-dev-
 * bypass.ts` reads process.env directly for exactly this reason. The
 * `typeof process` guard makes a hypothetical client-side evaluation return
 * false instead of throwing — which is also the fail-safe answer, since every
 * gate decision this flag participates in is made server-side.
 *
 * Read at CALL time, never cached at module scope. Infra flips this by rolling
 * the Deployment, so caching would cost nothing in production — but it would
 * make the kill switch untestable, and an untested kill switch is not one.
 *
 * ORDERING (spec §Rollback, roadmap §6):
 *   to ENABLE  — flip THIS first, then milo's gate.
 *   to DISABLE — flip milo's FIRST, then this one.
 * Getting it backwards produces an app that loads and then fails on every
 * request (enable) or admits users its API still denies (disable).
 */
export function isEmailVerificationGateEnabled(): boolean {
  return typeof process !== 'undefined' && process.env.EMAIL_VERIFICATION_GATE === 'true';
}
