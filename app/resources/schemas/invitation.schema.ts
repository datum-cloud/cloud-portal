import { Roles } from '@/resources/interfaces/role.interface';
import { z } from 'zod';

export const newInvitationSchema = z.object({
  email: z.email(),
  inviterFamilyName: z.string().optional(),
  inviterGivenName: z.string().optional(),
  role: z
    .enum(Object.values(Roles) as [string, ...string[]], {
      error: 'Role is required.',
    })
    .optional(),
  roleNamespace: z.string().optional(),
});

export const invitationFormSchema = z.object({
  emails: z.array(z.email()).min(1, { message: 'At least one email is required' }),
  role: z.string({ error: 'Role is required.' }),
  roleNamespace: z.string().optional(),
});

export type InvitationFormSchema = z.infer<typeof invitationFormSchema>;
export type NewInvitationSchema = z.infer<typeof newInvitationSchema>;
