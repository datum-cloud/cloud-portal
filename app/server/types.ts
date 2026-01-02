// app/server/types.ts
import type { ControlPlaneClient } from '@/modules/control-plane/control-plane.factory';
import type { Logger } from '@/modules/logger';
import type { IAccessTokenSession } from '@/utils/auth/auth.types';

export interface Variables {
  requestId: string;
  secureHeadersNonce: string; // Set automatically by hono secureHeaders middleware
  session: IAccessTokenSession | null;
  controlPlaneClient: ControlPlaneClient;
  userScopedClient: ControlPlaneClient; // User-scoped client for user-specific APIs
  logger: Logger;
}
