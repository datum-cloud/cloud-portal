import type { ServiceEntitlement } from './service-entitlement.schema';

interface RawServiceEntitlement {
  metadata: { name: string; uid: string };
  status?: {
    phase?: string;
    serviceName?: string;
    origin?: string;
  };
}

export function toServiceEntitlement(raw: RawServiceEntitlement): ServiceEntitlement {
  return {
    name: raw.metadata.name,
    uid: raw.metadata.uid,
    phase: raw.status?.phase || 'Unknown',
    serviceName: raw.status?.serviceName ?? '',
    origin: raw.status?.origin,
  };
}
