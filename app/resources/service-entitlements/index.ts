export {
  NETWORKING_SERVICE,
  NETWORKING_SERVICE_NAME,
  NETWORKING_SERVICE_REF_NAME,
  NETWORKING_SERVICE_IDS,
  type ServiceEntitlement,
} from './service-entitlement.schema';

export {
  activeEntitlementServiceIds,
  entitlementServiceIds,
  findEntitlementForService,
  entitlementObjectName,
  toCreateServiceEntitlementPayload,
} from './service-entitlement.adapter';

export {
  createServiceEntitlementService,
  serviceEntitlementKeys,
  type ServiceEntitlementService,
} from './service-entitlement.service';

export {
  ACTIVE_SERVICE_ENTITLEMENTS_STALE_TIME,
  useActiveServiceEntitlements,
} from './service-entitlement.queries';
