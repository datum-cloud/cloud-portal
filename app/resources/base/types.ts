import type { Logger } from '@/modules/logger';
import type { Client } from '@hey-api/client-axios';

export interface ServiceContext {
  requestId: string;
  controlPlaneClient: Client;
  userScopedClient?: Client; // User-scoped client for user-specific APIs (e.g., organization memberships)
  logger?: Logger;
}

export interface ServiceOptions {
  dryRun?: boolean;
}
