import { z } from 'zod';

export const serviceEntitlementSchema = z.object({
  name: z.string(),
  uid: z.string(),
  phase: z.string(),
  serviceName: z.string(),
  origin: z.string().optional(),
});

export type ServiceEntitlement = z.infer<typeof serviceEntitlementSchema>;
