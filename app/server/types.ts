// app/server/types.ts
import type { Logger } from '@/modules/logger';
import type { IAccessTokenSession } from '@/utils/auth/auth.types';

export interface Variables {
  requestId: string;
  secureHeadersNonce: string; // Set automatically by hono secureHeaders middleware
  session: IAccessTokenSession | null;
  logger: Logger;
}
