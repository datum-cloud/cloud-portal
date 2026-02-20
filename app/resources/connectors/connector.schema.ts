import { z } from 'zod';

export const connectorCapabilityConditionSchema = z.object({
  type: z.string(),
  status: z.enum(['True', 'False', 'Unknown']),
  reason: z.string(),
  message: z.string(),
  lastTransitionTime: z.string(),
  observedGeneration: z.number().optional(),
});

export const connectorCapabilitySchema = z.object({
  type: z.string(),
  conditions: z.array(connectorCapabilityConditionSchema).optional(),
});

export const connectorConnectionDetailsSchema = z.object({
  type: z.literal('PublicKey'),
  publicKey: z
    .object({
      id: z.string().optional(),
      homeRelay: z.string(),
      discoveryMode: z.literal('DNS').optional(),
      addresses: z.array(
        z.object({
          address: z.string(),
          port: z.number(),
        })
      ),
    })
    .optional(),
});

export const connectorResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  resourceVersion: z.string(),
  createdAt: z.coerce.date(),
  connectorClassName: z.string(),
  capabilities: z
    .array(
      z.object({
        type: z.string(),
        connectTCP: z.object({ disabled: z.boolean().optional() }).optional(),
      })
    )
    .optional(),
  status: z.any().optional(),
});

export type Connector = z.infer<typeof connectorResourceSchema>;

export const connectorListSchema = z.object({
  items: z.array(connectorResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type ConnectorList = z.infer<typeof connectorListSchema>;
