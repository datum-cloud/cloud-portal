import { z } from 'zod';

export const projectIdParam = z.object({
  projectId: z.string().describe('The project k8s name (e.g. "my-project-abc123")'),
});

export const orgIdParam = z.object({
  orgId: z.string().describe('The organization k8s name'),
});

export const billingAccountParam = orgIdParam.extend({
  billingAccountName: z.string().describe('The billing account k8s name'),
});

export const paymentMethodsParam = orgIdParam.extend({
  billingAccountName: z
    .string()
    .optional()
    .describe('Filter payment methods to a specific billing account'),
});

export const usageDaysParam = projectIdParam.extend({
  days: z.number().min(1).max(90).optional().describe('Lookback window in days (default 30)'),
});

export const orgUsageDaysParam = orgIdParam.extend({
  days: z.number().min(1).max(90).optional().describe('Lookback window in days (default 30)'),
});
