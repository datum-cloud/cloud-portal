import { z } from 'zod';

export const memberUpdateRoleSchema = z.object({
  role: z.string({ error: 'Role is required.' }),
  roleNamespace: z.string().optional(),
});

export type MemberUpdateRoleSchema = z.infer<typeof memberUpdateRoleSchema>;
