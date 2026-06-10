/**
 * Naming helpers for billing-domain resources (slug/name generators).
 *
 * All three delegate to the shared `generateId` helper, which kebab-slugs
 * the input, caps the length, and validates the result — so a long or
 * punctuation-heavy display name can't slip through and produce a
 * `metadata.name` the API server rejects. `maxLength` is bumped to 63
 * (the RFC1123 label limit `generateId` validates against) so billing
 * names get the full room a control-plane resource name allows.
 *
 * The org-namespace mapping (`buildOrganizationNamespace` /
 * `orgIdFromNamespace`) lives in `@/utils/common` so the
 * `organization-<id>` prefix has a single source of truth shared with
 * the IAM/team surfaces — see the rbac-namespace-from-scope convention.
 */
import { generateId } from '@/utils/helpers/text.helper';

/**
 * Best-effort slug from the user-supplied display / business name.
 * Deterministic enough that the URL fragment after navigate() matches
 * what the controller persists; the 6-char random suffix avoids
 * collisions when two accounts share a name.
 */
export const slugifyBillingAccountName = (raw: string): string =>
  generateId(raw, { prefix: 'ba', randomLength: 6, maxLength: 63 });

/**
 * Bindings are immutable so the name needs to be unique per
 * (project, account, attempt). The project ref plus a base36 timestamp
 * suffix keeps retries against the same pair from colliding.
 */
export const newBindingName = (projectName: string): string =>
  generateId(projectName, {
    prefix: 'bab',
    randomLength: 0,
    includeTimestamp: true,
    maxLength: 63,
  });

/**
 * Build a unique PaymentMethod name. The K8s name is opaque to the
 * UI — the dialog renders `spec.displayName` — but we still want
 * something predictable for logs / debugging. Mirrors the slug
 * convention used by the create-billing-account flow.
 */
export const newPaymentMethodName = (displayName: string | undefined): string =>
  generateId(displayName ?? 'card', { prefix: 'pm', randomLength: 6, maxLength: 63 });
