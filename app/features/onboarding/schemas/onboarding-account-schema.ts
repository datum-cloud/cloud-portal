import { z } from 'zod';

export const onboardingAccountSchema = z.object({
  country: z
    .string({ error: 'Pick a country' })
    .min(1, 'Pick a country')
    .regex(/^[A-Z]{2}$/, 'Pick a country from the list'),
});

export type OnboardingAccountValues = z.infer<typeof onboardingAccountSchema>;
