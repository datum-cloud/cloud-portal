// app/modules/usage/billing-context.ts
//
// Soft pre-emit gate for the durable usage pipeline.
//
// Looks up the project's BillingAccountBinding via the control-plane
// billing API and returns a status the route uses to decide whether to
// hand events to the Ingestion Gateway.
//
// The Gateway is the source of truth for attribution (per the v0
// usage-pipeline design: "Attribution is binding-aware: events from a
// project hit a single canonical attribution lookup that resolves the
// BillingAccountBinding by (projectRef, event.timestamp)"). This module
// is purely a courtesy: it converts cases the portal can already prove
// will be quarantined — no binding, non-Active binding — from operator
// pages into structured `usage.emit.skipped` log lines. Every uncertain
// branch (no orgName, RBAC denial, network blip) fails OPEN: we emit
// anyway and let the Gateway adjudicate.
import {
  listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding,
  type ComMiloapisBillingV1Alpha1BillingAccountBinding,
  type ComMiloapisBillingV1Alpha1BillingAccountBindingList,
} from '@/modules/control-plane/billing';
import { getOrgScopedBase } from '@/resources/base/utils';
import { buildOrganizationNamespace } from '@/utils/common';

// Intentionally no `@/modules/logger` import — that module pulls in
// `env.server`, and the Cypress component-test bundle now follows the
// `@/` alias all the way through, which exits the test runner on
// `process.exit(1)` from server-only validation. The route logs the
// lookup-error case via `BillingContext.errorMessage`; keeping this
// resolver browser-safe lets the test import it directly.

export type BillingContextStatus =
  /** Active binding for the project — emit. */
  | 'ready'
  /** No orgName supplied; cannot scope the lookup — fail open and emit. */
  | 'no-org'
  /** No BillingAccountBinding references this project — skip emit. */
  | 'no-binding'
  /** Binding(s) exist but none have phase=Active — skip emit. */
  | 'inactive'
  /** API call failed (network, RBAC, etc.) — fail open and emit. */
  | 'lookup-error';

export interface BillingContext {
  status: BillingContextStatus;
  /** spec.billingAccountRef.name when an Active binding was found. */
  accountName?: string;
  /** metadata.name of the binding (Active when 'ready', otherwise first match). */
  bindingName?: string;
  /** Error message captured when status === 'lookup-error'. The route logs it. */
  errorMessage?: string;
}

/**
 * Returns true when the portal should drop the events client-side.
 * Only the cases the portal can prove are unbillable count: 'no-binding'
 * and 'inactive'. Every other status — including 'lookup-error' and
 * 'no-org' — falls through to the Gateway, which is the authority on
 * attribution and quarantine.
 */
export function shouldSkipEmit(ctx: BillingContext): boolean {
  return ctx.status === 'no-binding' || ctx.status === 'inactive';
}

export interface ResolveBillingContextInput {
  /**
   * Organization slug for scoping the binding list. When absent the
   * resolver returns 'no-org' and the route emits anyway — the Gateway
   * will route attribution by projectRef.
   */
  orgName?: string;
  /** Project slug used as the binding's spec.projectRef.name match key. */
  projectName: string;
}

/**
 * Optional dependency injection for tests. Production callers should not
 * supply `listBindings`; the default uses the generated control-plane
 * SDK against the org-scoped base URL.
 */
export interface ResolveBillingContextDeps {
  listBindings?: (orgName: string) => Promise<ComMiloapisBillingV1Alpha1BillingAccountBinding[]>;
}

export async function resolveBillingContext(
  input: ResolveBillingContextInput,
  deps: ResolveBillingContextDeps = {}
): Promise<BillingContext> {
  const { orgName, projectName } = input;

  if (!orgName) return { status: 'no-org' };

  const lister = deps.listBindings ?? defaultListBindings;

  let bindings: ComMiloapisBillingV1Alpha1BillingAccountBinding[];
  try {
    bindings = await lister(orgName);
  } catch (err) {
    return {
      status: 'lookup-error',
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }

  const projectBindings = bindings.filter((b) => b.spec?.projectRef?.name === projectName);

  if (projectBindings.length === 0) {
    return { status: 'no-binding' };
  }

  const active = projectBindings.find((b) => b.status?.phase === 'Active');
  if (!active) {
    return {
      status: 'inactive',
      bindingName: projectBindings[0]?.metadata?.name,
    };
  }

  return {
    status: 'ready',
    accountName: active.spec?.billingAccountRef?.name,
    bindingName: active.metadata?.name,
  };
}

async function defaultListBindings(
  orgName: string
): Promise<ComMiloapisBillingV1Alpha1BillingAccountBinding[]> {
  const response = await listBillingMiloapisComV1Alpha1NamespacedBillingAccountBinding({
    baseURL: getOrgScopedBase(orgName),
    path: { namespace: buildOrganizationNamespace(orgName) },
  });
  const data = response.data as ComMiloapisBillingV1Alpha1BillingAccountBindingList;
  return data?.items ?? [];
}
