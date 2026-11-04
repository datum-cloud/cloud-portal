import { z } from 'zod';

const conditionSchema = z.object({
  status: z.enum(['True', 'False', 'Unknown']),
  reason: z.string().optional(),
  message: z.string().optional(),
});

export type PrivateDnsCondition = z.infer<typeof conditionSchema>;

/** A link that lets one VPC's DNS context resolve a private zone. */
export const dnsZoneAssociationSchema = z.object({
  name: z.string(),
  zoneName: z.string(),
  contextName: z.string(),
  accepted: conditionSchema.optional(),
  deleting: z.boolean(),
});

export type DnsZoneAssociation = z.infer<typeof dnsZoneAssociationSchema>;

/** The DNS side of one VPC: created by the platform, never by users. */
export const dnsResolverContextSchema = z.object({
  name: z.string(),
  /** Network name from the well-known label; absent on contexts created before it existed. */
  networkName: z.string().optional(),
  networkUid: z.string().optional(),
  description: z.string().optional(),
  /** The VPC's default private zone (`datum.internal`). */
  managedZoneName: z.string().optional(),
  deleting: z.boolean(),
});

export type DnsResolverContext = z.infer<typeof dnsResolverContextSchema>;

export type PrivateZoneLinkState = 'linked' | 'linking' | 'failed';

/** One VPC that can resolve a private zone, and whether that link works yet. */
export interface PrivateZoneVpcLink {
  /** Association name, or the context name for a VPC's default zone (which has no association). */
  key: string;
  contextName: string;
  networkName?: string;
  /** What to call the VPC: its network name when known. */
  label: string;
  /** True for the VPC that owns its default zone; that link can't be removed. */
  isOwner: boolean;
  state: PrivateZoneLinkState;
  reason?: string;
  message?: string;
}

export type PrivateZoneState = 'ready' | 'preparing' | 'failed' | 'unlinked';
