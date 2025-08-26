import { z } from 'zod';

export const userSchema = z.object({
  firstName: z.string({ required_error: 'First name is required.' }).min(3).max(50),
  lastName: z.string({ required_error: 'Last name is required.' }).min(3).max(50),
  email: z.string({ required_error: 'Email is required.' }).email(),
});

export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  timezone: z.string().optional(),
  newsletter: z.boolean().optional(),
});

export type UserSchema = z.infer<typeof userSchema>;
export type UserPreferencesSchema = z.infer<typeof userPreferencesSchema>;
