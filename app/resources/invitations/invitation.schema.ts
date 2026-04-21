import type { ComMiloapisIamV1Alpha1UserInvitation } from '@/modules/control-plane/iam';
import { Roles } from '@/resources/roles';
import { z } from 'zod';

// Invitation state values
export const INVITATION_STATE_VALUES = ['Pending', 'Accepted', 'Declined'] as const;
export type InvitationState = (typeof INVITATION_STATE_VALUES)[number];

/**
 * Un-stringify a Conform-serialized array value so downstream schema validation
 * sees an actual array instead of a literal `"[]"` / `'["a","b"]'` string.
 * Returns a string[] when it can be parsed; otherwise passes through verbatim.
 */
function normalizeSerializedArray(val: unknown): string[] {
  const unwrap = (v: unknown): string[] | null => {
    if (typeof v === 'string' && v.startsWith('[') && v.endsWith(']')) {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        // fall through
      }
    }
    return null;
  };

  if (Array.isArray(val)) {
    return val.flatMap((item) => {
      const unwrapped = unwrap(item);
      return unwrapped ?? [String(item)];
    });
  }
  const unwrapped = unwrap(val);
  if (unwrapped) return unwrapped;
  if (typeof val === 'string' && val !== '') return [val];
  return [];
}

// Inviter user schema
export const inviterUserSchema = z.object({
  displayName: z.string(),
  avatar: z.string().optional(),
});

export type InviterUser = z.infer<typeof inviterUserSchema>;

// Organization reference schema
export const invitationOrganizationSchema = z.object({
  displayName: z.string(),
});

export type InvitationOrganization = z.infer<typeof invitationOrganizationSchema>;

// Invitation resource schema
export const invitationResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string(),
  resourceVersion: z.string(),
  createdAt: z.string().optional(),
  email: z.string(),
  expirationDate: z.string().optional(),
  familyName: z.string().optional(),
  givenName: z.string().optional(),
  invitedBy: z.string().optional(),
  organizationName: z.string(),
  role: z.string().optional(),
  roleNamespace: z.string().optional(),
  state: z.enum(INVITATION_STATE_VALUES),
  status: z.any().optional(),
  inviterUser: inviterUserSchema.optional(),
  organization: invitationOrganizationSchema.optional(),
});

export type Invitation = z.infer<typeof invitationResourceSchema>;

// Invitation list schema
export const invitationListSchema = z.object({
  items: z.array(invitationResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type InvitationList = z.infer<typeof invitationListSchema>;

// Input types for service operations
export type CreateInvitationInput = {
  email: string;
  role?: string;
  roleNamespace?: string;
};

export type UpdateInvitationStateInput = {
  state: 'Accepted' | 'Declined';
};

// Form validation schemas
export const newInvitationSchema = z.object({
  email: z.email(),
  role: z
    .enum(Object.values(Roles) as [string, ...string[]], {
      error: 'Role is required.',
    })
    .optional(),
  roleNamespace: z.string().optional(),
});

export const invitationFormSchema = z.object({
  // The package's form adapter serializes array values as JSON strings.
  // Un-stringify before validation so "[]" round-trips as [] (not a single
  // invalid "[]" email entry).
  emails: z
    .unknown()
    .transform(normalizeSerializedArray)
    .pipe(
      z
        .array(z.string())
        .min(1, { message: 'At least one email is required' })
        .superRefine((emails, ctx) => {
          const emailSchema = z.email();
          const invalid = emails.filter((e) => !emailSchema.safeParse(e).success);
          if (invalid.length > 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Invalid email${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}`,
              path: [],
            });
          }
        })
    ),
  role: z.string({ error: 'Role is required.' }),
  roleNamespace: z.string().optional(),
});

export type InvitationFormSchema = z.infer<typeof invitationFormSchema>;
export type NewInvitationSchema = z.infer<typeof newInvitationSchema>;

// Legacy interface for backward compatibility
export interface IInvitationControlResponse {
  name: string;
  createdAt?: string;
  uid: string;
  resourceVersion: string;
  namespace: string;
  email: string;
  expirationDate?: string;
  familyName?: string;
  givenName?: string;
  invitedBy?: string;
  organizationName: string;
  role?: string;
  state: InvitationState;
  status?: ComMiloapisIamV1Alpha1UserInvitation['status'];
  inviterUser?: {
    displayName: string;
    avatar?: string;
  };
  organization?: {
    displayName: string;
  };
}
