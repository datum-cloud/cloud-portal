import { parseCatalogRates, type CatalogMeterPricing } from './usage-spend';
import type { MeterDefinition } from './usage.types';
import { client } from '@/modules/control-plane/shared/client.gen';
import { logger } from '@/modules/logger';
import { getOrgScopedBase } from '@/resources/base/utils';
import { buildOrganizationNamespace } from '@/utils/common';

const BILLING_SERVICE_CONFIGURATION_NAME = 'billing-miloapis-com';

export interface CatalogUsagePricing {
  offerName?: string;
  /** metric name (spec.metric) → pricing */
  byMetric: Map<string, CatalogMeterPricing>;
  /** meterApiName → metric name */
  meterNameByApiName: Map<string, string>;
}

function controlPlaneAxios() {
  return client.getConfig().axios;
}

function clusterApiBaseUrl(): string {
  return controlPlaneAxios()?.defaults?.baseURL ?? '';
}

async function fetchBillingDefaultOffer(): Promise<string | undefined> {
  try {
    const axios = controlPlaneAxios();
    if (!axios) return undefined;
    const url = `${clusterApiBaseUrl()}/apis/services.miloapis.com/v1alpha1/serviceconfigurations/${BILLING_SERVICE_CONFIGURATION_NAME}`;
    const resp = await axios.get<{ spec?: { defaultOffer?: string } }>(url);
    const name = resp.data?.spec?.defaultOffer?.trim();
    return name || undefined;
  } catch {
    return undefined;
  }
}

async function resolveOfferNameForAccount(
  orgId: string,
  billingAccountName: string | undefined
): Promise<string | undefined> {
  if (billingAccountName) {
    try {
      const axios = controlPlaneAxios();
      if (!axios) return fetchBillingDefaultOffer();

      const namespace = buildOrganizationNamespace(orgId);
      const url = `${getOrgScopedBase(orgId)}/apis/billing.miloapis.com/v1alpha1/namespaces/${namespace}/billingentitlements`;
      const resp = await axios.get<{
        items?: Array<{
          spec?: { billingAccountRef?: { name?: string }; offerRef?: { name?: string } };
        }>;
      }>(url);
      const entitlement = (resp.data?.items ?? []).find(
        (item) => item.spec?.billingAccountRef?.name === billingAccountName
      );
      const offerName = entitlement?.spec?.offerRef?.name?.trim();
      if (offerName) return offerName;
    } catch (error) {
      logger.warn('Failed to load BillingEntitlement for usage pricing', {
        orgId,
        billingAccountName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return fetchBillingDefaultOffer();
}

function pricingFromOfferSnapshots(
  snapshots:
    | Array<{
        name?: string;
        spec?: {
          chargeType?: string;
          metric?: string;
          pricingUnit?: string;
          currency?: string;
          rates?: Array<{
            flat?: string;
            match?: { dimension: string; value: string };
            tiered?: Array<{ upTo?: string; rate: string }>;
          }>;
        };
      }>
    | undefined
): Map<string, CatalogMeterPricing> {
  const byMetric = new Map<string, CatalogMeterPricing>();

  for (const snap of snapshots ?? []) {
    const spec = snap.spec;
    if (spec?.chargeType !== 'Usage' || !spec.metric) continue;

    const rates = parseCatalogRates(spec.rates);
    if (rates.length === 0) continue;

    byMetric.set(spec.metric, {
      metric: spec.metric,
      pricingUnit: spec.pricingUnit?.trim() || 'unit',
      currency: spec.currency?.trim() || 'USD',
      rates,
    });
  }

  return byMetric;
}

function indexMeterNames(meterDefs: MeterDefinition[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const def of meterDefs) {
    if (def.meterApiName && def.meterName) {
      map.set(def.meterApiName, def.meterName);
    }
  }
  return map;
}

/**
 * Load GA Offer pricing snapshots for the org's billing account (or platform
 * default offer) and index them by metric / meter id.
 *
 * Cluster-scoped Offer / ServiceConfiguration GETs may 403 through the
 * consumer IAM proxy. Callers must degrade: usage still renders, prices omit.
 */
export async function loadCatalogUsagePricing(
  orgId: string,
  options: {
    billingAccountName?: string;
    meterDefs: MeterDefinition[];
  }
): Promise<CatalogUsagePricing> {
  const meterNameByApiName = indexMeterNames(options.meterDefs);
  const offerName = await resolveOfferNameForAccount(orgId, options.billingAccountName);

  if (!offerName) {
    return { byMetric: new Map(), meterNameByApiName };
  }

  try {
    const axios = controlPlaneAxios();
    if (!axios) {
      return { offerName, byMetric: new Map(), meterNameByApiName };
    }

    const url = `${clusterApiBaseUrl()}/apis/billing.miloapis.com/v1alpha1/offers/${encodeURIComponent(offerName)}`;
    const resp = await axios.get<{
      spec?: {
        servicePricings?: Array<{
          name?: string;
          spec?: {
            chargeType?: string;
            metric?: string;
            pricingUnit?: string;
            currency?: string;
            rates?: Array<{
              flat?: string;
              match?: { dimension: string; value: string };
              tiered?: Array<{ upTo?: string; rate: string }>;
            }>;
          };
        }>;
      };
    }>(url);
    const snapshots = resp.data?.spec?.servicePricings ?? [];

    return {
      offerName,
      byMetric: pricingFromOfferSnapshots(snapshots),
      meterNameByApiName,
    };
  } catch (error) {
    logger.warn('Failed to load Offer for usage pricing', {
      offerName,
      error: error instanceof Error ? error.message : String(error),
    });
    return { offerName, byMetric: new Map(), meterNameByApiName };
  }
}
