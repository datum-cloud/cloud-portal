import {
  listNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy,
  readNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy,
  createNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy,
  patchNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy,
  deleteNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy,
  type ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy,
} from '@/modules/control-plane/networking';
import { logger } from '@/modules/logger';
import { getProjectScopedBase } from '@/resources/base/utils';
// File-level imports: the http-proxies index re-exports the proxy service,
// which composes this one, so importing the index here would be circular.
import {
  toTrafficProtectionPolicyPayload,
  toTrafficProtectionPolicySpecPatch,
  getTrafficProtectionMode,
  getParanoiaLevels,
  getRuleExclusions,
  toTrafficProtectionModeMap,
  toParanoiaLevelsMap,
} from '@/resources/http-proxies/http-proxy.adapter';
import type {
  TrafficProtectionMode,
  WafRuleExclusions,
} from '@/resources/http-proxies/http-proxy.schema';
import {
  policyAttachesToProxy,
  selectPolicyForProxy,
} from '@/resources/http-proxies/http-proxy.waf-attach';
import {
  getTrafficProtectionProgrammedMessage,
  getTrafficProtectionProgrammedReason,
  isTrafficProtectionProgrammed,
} from '@/resources/http-proxies/http-proxy.waf-status';
import {
  getRelatedResourceErrorStatus,
  resolveRelatedResource,
} from '@/resources/http-proxies/related-resource';
import { mapApiError } from '@/utils/errors/error-mapper';

/**
 * WAF (TrafficProtectionPolicy) is fetched separately from the proxy so the
 * request can be gated behind `trafficprotectionpolicies` view permission.
 * The keys stay under the `http-proxies` prefix they had while this lived in
 * the proxy service, so invalidating `httpProxyKeys.all` still reaches them.
 */
const WAF_KEY_ROOT = ['http-proxies', 'waf'] as const;

export const trafficProtectionPolicyKeys = {
  all: WAF_KEY_ROOT,
  list: (projectId: string) => [...WAF_KEY_ROOT, 'list', projectId] as const,
  /** `proxyName` is the owning proxy, not necessarily the policy object name. */
  detail: (projectId: string, proxyName: string) =>
    [...WAF_KEY_ROOT, 'detail', projectId, proxyName] as const,
};

/** WAF (TrafficProtectionPolicy) view data, keyed by proxy name for list merges. */
export interface TrafficProtectionView {
  mode?: TrafficProtectionMode;
  paranoiaLevels?: { blocking?: number; detection?: number };
  ruleExclusions?: WafRuleExclusions;
  /** Actual policy object name when it differs from the proxy name. */
  policyName?: string;
  /** True when the WAF read was denied (403) — render an insufficient-permissions state. */
  forbidden?: boolean;
  /** True when every Accepted ancestor reports Programmed=True. */
  programmed?: boolean;
  /** Programmed condition message while converging (e.g. M/N edges). */
  programmedMessage?: string;
  /** Programmed condition reason while not True (Pending / PartialFailure). */
  programmedReason?: string;
}

export interface TrafficProtectionMaps {
  modeByName: Map<string, TrafficProtectionMode>;
  paranoiaByName: Map<string, { blocking?: number; detection?: number }>;
  /** True when the WAF list was denied (403) — render an insufficient-permissions state. */
  forbidden?: boolean;
}

const SERVICE_NAME = 'TrafficProtectionPolicyService';

export function createTrafficProtectionPolicyService() {
  return {
    /**
     * List WAF (TrafficProtectionPolicy) modes for a project, keyed by proxy name.
     * Decoupled from the proxy list so it can be gated behind view permission.
     * 404 degrades to empty maps ("no WAF policies"); 403 degrades to empty maps
     * with `forbidden` set so callers render an insufficient-permissions state.
     * Unexpected errors are surfaced so callers can distinguish "couldn't read
     * WAF" (show "—") from "no WAF policy" (show "Disabled"). The decoupled
     * query isolates this failure from the proxy list (#1378).
     */
    async list(projectId: string): Promise<TrafficProtectionMaps> {
      try {
        const baseURL = getProjectScopedBase(projectId);
        const result = await resolveRelatedResource(async () => {
          const response = await listNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy(
            {
              baseURL,
              path: { namespace: 'default' },
            }
          );
          return response.data;
        });
        if (result.state === 'forbidden') {
          return { modeByName: new Map(), paranoiaByName: new Map(), forbidden: true };
        }
        return {
          modeByName: toTrafficProtectionModeMap(result.data),
          paranoiaByName: toParanoiaLevelsMap(result.data),
        };
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * List TrafficProtectionPolicies in the project namespace.
     */
    async listItems(
      projectId: string
    ): Promise<ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy[]> {
      const baseURL = getProjectScopedBase(projectId);
      const response = await listNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({
        baseURL,
        path: { namespace: 'default' },
      });
      return response.data?.items ?? [];
    },

    /**
     * Resolve the TrafficProtectionPolicy attached to a proxy via targetRefs
     * (Gateway or HTTPRoute named like the proxy). Same-name GET is only a fast
     * path when that object actually attaches.
     */
    async findForProxy(
      projectId: string,
      proxyName: string
    ): Promise<ComDatumapisNetworkingV1AlphaTrafficProtectionPolicy | undefined> {
      const baseURL = getProjectScopedBase(projectId);
      try {
        const response = await readNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({
          baseURL,
          path: { namespace: 'default', name: proxyName },
        });
        if (response.data && policyAttachesToProxy(response.data, proxyName)) {
          return response.data;
        }
      } catch (error) {
        if (getRelatedResourceErrorStatus(error) !== 404) {
          throw error;
        }
      }

      const items = await this.listItems(projectId);
      return selectPolicyForProxy(items, proxyName);
    },

    /**
     * Read a single proxy's WAF (TrafficProtectionPolicy) view. Decoupled from the
     * proxy fetch so it can be gated behind view permission. A genuine miss (no
     * attaching policy, or a 404 on the read) resolves to an empty view; 403
     * resolves to an empty view with `forbidden` set so callers render an
     * insufficient-permissions state. Unexpected errors are surfaced so callers
     * can distinguish "couldn't read WAF" (show "—") from "no WAF policy" (#1378).
     */
    async getForProxy(projectId: string, proxyName: string): Promise<TrafficProtectionView> {
      const result = await resolveRelatedResource(() =>
        this.findForProxy(projectId, proxyName)
      ).catch((error: unknown) => {
        logger.error(`${SERVICE_NAME}.getForProxy failed`, error as Error);
        throw mapApiError(error);
      });
      if (result.state === 'forbidden') {
        return { mode: undefined, paranoiaLevels: undefined, forbidden: true };
      }
      const policy = result.data ?? undefined;
      if (!policy) {
        return { mode: undefined, paranoiaLevels: undefined };
      }
      return {
        mode: getTrafficProtectionMode(policy),
        paranoiaLevels: getParanoiaLevels(policy),
        ruleExclusions: getRuleExclusions(policy),
        policyName: policy.metadata?.name,
        programmed: isTrafficProtectionProgrammed(policy.status),
        programmedMessage: getTrafficProtectionProgrammedMessage(policy.status),
        programmedReason: getTrafficProtectionProgrammedReason(policy.status),
      };
    },

    async createForProxy(
      projectId: string,
      proxyName: string,
      mode: 'Observe' | 'Enforce' | 'Disabled' = 'Enforce',
      paranoiaLevels?: { blocking?: number; detection?: number },
      ruleExclusions?: WafRuleExclusions
    ): Promise<void> {
      const baseURL = getProjectScopedBase(projectId);
      const tryCreate = async (policyName: string) => {
        const body = toTrafficProtectionPolicyPayload(
          proxyName,
          mode,
          paranoiaLevels,
          policyName,
          ruleExclusions
        );
        await createNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({
          baseURL,
          path: { namespace: 'default' },
          body,
        });
      };

      const candidates = [
        proxyName,
        `${proxyName}-protection`,
        `${proxyName}-protection-${Date.now().toString(36)}`,
      ];
      let lastError: unknown;
      for (const policyName of candidates) {
        try {
          await tryCreate(policyName);
          return;
        } catch (error) {
          lastError = error;
          // Same name may already exist for a different targetRef; don't steal it.
          if (getRelatedResourceErrorStatus(error) === 409) {
            continue;
          }
          throw error;
        }
      }
      throw lastError;
    },

    /** Delete the policy attached to a proxy; a missing policy is a no-op. */
    async deleteForProxy(projectId: string, proxyName: string): Promise<void> {
      const policy = await this.findForProxy(projectId, proxyName);
      const policyName = policy?.metadata?.name;
      if (!policyName) return;

      try {
        await deleteNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name: policyName },
        });
      } catch (error: unknown) {
        if (getRelatedResourceErrorStatus(error) !== 404) throw error;
      }
    },

    /** Patch the attached policy's spec, creating the policy when none attaches. */
    async updateForProxy(
      projectId: string,
      proxyName: string,
      mode?: TrafficProtectionMode,
      paranoiaLevels?: { blocking?: number; detection?: number },
      ruleExclusions?: WafRuleExclusions | null
    ): Promise<void> {
      const baseURL = getProjectScopedBase(projectId);
      const existing = await this.findForProxy(projectId, proxyName);
      const specBody = toTrafficProtectionPolicySpecPatch(existing, {
        mode,
        paranoiaLevels,
        ruleExclusions,
      });
      const nextMode = mode ?? getTrafficProtectionMode(existing) ?? 'Enforce';

      if (!existing?.metadata?.name) {
        await this.createForProxy(
          projectId,
          proxyName,
          nextMode,
          paranoiaLevels,
          ruleExclusions ?? undefined
        );
        return;
      }

      try {
        await patchNetworkingDatumapisComV1AlphaNamespacedTrafficProtectionPolicy({
          baseURL,
          path: { namespace: 'default', name: existing.metadata.name },
          body: { spec: specBody },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });
      } catch (error: unknown) {
        // Race: policy disappeared between find and patch — recreate.
        if (getRelatedResourceErrorStatus(error) === 404) {
          await this.createForProxy(
            projectId,
            proxyName,
            nextMode,
            paranoiaLevels,
            ruleExclusions ?? undefined
          );
          return;
        }
        throw error;
      }
    },
  };
}

export type TrafficProtectionPolicyService = ReturnType<
  typeof createTrafficProtectionPolicyService
>;
