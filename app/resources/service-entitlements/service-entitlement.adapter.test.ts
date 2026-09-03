import {
  entitlementObjectName,
  entitlementServiceIds,
  findEntitlementForService,
  toCreateServiceEntitlementPayload,
} from './service-entitlement.adapter';
import {
  NETWORKING_SERVICE_IDS,
  NETWORKING_SERVICE_NAME,
  NETWORKING_SERVICE_REF_NAME,
  type ServiceEntitlement,
} from './service-entitlement.schema';
import { describe, expect, it } from 'bun:test';

function entitlement(partial: ServiceEntitlement): ServiceEntitlement {
  return partial;
}

describe('entitlementServiceIds', () => {
  it('prefers canonical status.serviceName and includes a distinct serviceRef', () => {
    expect(
      entitlementServiceIds(
        entitlement({
          spec: { serviceRef: { name: NETWORKING_SERVICE_REF_NAME } },
          status: { serviceName: NETWORKING_SERVICE_NAME },
        })
      )
    ).toEqual([NETWORKING_SERVICE_NAME, NETWORKING_SERVICE_REF_NAME]);
  });

  it('does not duplicate when ref and canonical match', () => {
    expect(
      entitlementServiceIds(
        entitlement({
          spec: { serviceRef: { name: NETWORKING_SERVICE_NAME } },
          status: { serviceName: NETWORKING_SERVICE_NAME },
        })
      )
    ).toEqual([NETWORKING_SERVICE_NAME]);
  });
});

describe('findEntitlementForService', () => {
  it('matches an existing entitlement by canonical status.serviceName', () => {
    const existing = entitlement({
      metadata: { name: 'other-name' },
      status: { serviceName: NETWORKING_SERVICE_NAME, phase: 'Active' },
    });
    expect(findEntitlementForService([existing], NETWORKING_SERVICE_IDS)).toBe(existing);
  });

  it('matches by spec.serviceRef.name when status is not stamped yet', () => {
    const pending = entitlement({
      spec: { serviceRef: { name: NETWORKING_SERVICE_REF_NAME } },
      status: { phase: 'PendingApproval' },
    });
    expect(findEntitlementForService([pending], NETWORKING_SERVICE_IDS)).toBe(pending);
  });

  it('returns undefined when the project has no matching entitlement', () => {
    expect(
      findEntitlementForService(
        [
          entitlement({
            spec: { serviceRef: { name: 'compute.datumapis.com' } },
            status: { serviceName: 'compute.datumapis.com' },
          }),
        ],
        NETWORKING_SERVICE_NAME
      )
    ).toBeUndefined();
  });
});

describe('entitlementObjectName', () => {
  it('uses the catalog {project}--{service-slug} convention', () => {
    expect(entitlementObjectName('acme-web', NETWORKING_SERVICE_REF_NAME)).toBe(
      'acme-web--networking-datumapis-com'
    );
  });
});

describe('toCreateServiceEntitlementPayload', () => {
  it('writes the Service object name in serviceRef', () => {
    expect(toCreateServiceEntitlementPayload('acme-web', NETWORKING_SERVICE_REF_NAME)).toEqual({
      apiVersion: 'services.miloapis.com/v1alpha1',
      kind: 'ServiceEntitlement',
      metadata: { name: 'acme-web--networking-datumapis-com' },
      spec: { serviceRef: { name: NETWORKING_SERVICE_REF_NAME } },
    });
  });
});
