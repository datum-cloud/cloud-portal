import { metadataSchema } from '@/resources/base';
import { z } from 'zod';

// Secret types as const array for Zod validation
export const SECRET_TYPES = [
  'Opaque',
  'kubernetes.io/service-account-token',
  'kubernetes.io/dockercfg',
  'kubernetes.io/dockerconfigjson',
  'kubernetes.io/basic-auth',
  'kubernetes.io/ssh-auth',
  'kubernetes.io/tls',
  'bootstrap.kubernetes.io/token',
] as const;

// Secret type enum for runtime usage
export enum SecretType {
  OPAQUE = 'Opaque',
  SERVICE_ACCOUNT_TOKEN = 'kubernetes.io/service-account-token',
  DOCKERCFG = 'kubernetes.io/dockercfg',
  DOCKERCONFIGJSON = 'kubernetes.io/dockerconfigjson',
  BASIC_AUTH = 'kubernetes.io/basic-auth',
  SSH_AUTH = 'kubernetes.io/ssh-auth',
  TLS = 'kubernetes.io/tls',
  BOOTSTRAP_TOKEN = 'bootstrap.kubernetes.io/token',
}

// Type alias for backward compatibility
export type SecretTypeValue = (typeof SECRET_TYPES)[number];

// Label/annotation schema
export const labelSchema = z.record(z.string(), z.string());
export type Label = z.infer<typeof labelSchema>;

// Secret resource schema (from API)
export const secretResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  resourceVersion: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  data: z.array(z.string()).optional(),
  type: z.enum(SECRET_TYPES).optional(),
  labels: labelSchema.optional(),
  annotations: labelSchema.optional(),
});

export type Secret = z.infer<typeof secretResourceSchema>;

// Legacy interface for backward compatibility
export interface ISecretControlResponse {
  name?: string;
  namespace?: string;
  createdAt?: Date;
  uid?: string;
  resourceVersion?: string;
  data?: string[];
  type?: SecretType;
  labels?: Record<string, string | null>;
  annotations?: Record<string, string | null>;
}

// Secret list schema
export const secretListSchema = z.object({
  items: z.array(secretResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type SecretList = z.infer<typeof secretListSchema>;

// Secret variable for create/edit
export const secretVariableSchema = z.object({
  key: z
    .string()
    .min(1, { message: 'Key is required' })
    .max(63, { message: 'Key must be at most 63 characters long.' })
    .regex(/^[a-zA-Z0-9._-]+$/, {
      message: 'Key must only contain letters, numbers, dots, underscores, or hyphens',
    }),
  value: z.string().min(1, { message: 'Value is required' }),
});

export type SecretVariable = z.infer<typeof secretVariableSchema>;

// Input types for service operations
export type CreateSecretInput = {
  name: string;
  type: SecretType;
  variables: SecretVariable[];
  labels?: string[];
  annotations?: string[];
};

export type UpdateSecretInput = {
  data?: Record<string, string | null | undefined>;
  metadata?: {
    labels?: Record<string, string | null>;
    annotations?: Record<string, string | null>;
  };
};

// Form validation schemas
export const secretEnvSchema = z.object({
  key: z
    .string({ error: 'Key is required' })
    .min(1, { message: 'Key is required' })
    .max(63, { message: 'Key must be at most 63 characters long.' })
    .regex(/^[a-zA-Z0-9._-]+$/, {
      message: 'Key must only contain letters, numbers, dots, underscores, or hyphens',
    }),
  value: z.string({ error: 'Value is required' }).min(1, { message: 'Value is required' }),
});

export const secretVariablesSchema = z.object({
  variables: z.array(secretEnvSchema).min(1, {
    message: 'At least one secret entry is required',
  }),
});

export const secretBaseSchema = z
  .object({
    type: z.enum(Object.values(SecretType) as [string, ...string[]], {
      error: 'Type is required.',
    }),
  })
  .and(metadataSchema);

export const secretNewSchema = secretBaseSchema
  .and(secretVariablesSchema)
  .superRefine((data, ctx) => {
    const keys = new Set<string>();
    data?.variables?.forEach((variable, index) => {
      const name = variable.key?.trim();
      if (name) {
        if (keys.has(name)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Key "${name}" is already used`,
            path: ['variables', index, 'key'],
          });
        } else {
          keys.add(name);
        }
      }
    });
  });

export const secretEditSchema = z.object({
  data: z.record(z.string(), z.string().nullable().optional()).optional(),
  labels: z.array(z.string()).optional(),
  annotations: z.array(z.string()).optional(),
});

export type SecretBaseSchema = z.infer<typeof secretBaseSchema>;
export type SecretEnvSchema = z.infer<typeof secretEnvSchema>;
export type SecretVariablesSchema = z.infer<typeof secretVariablesSchema>;
export type SecretNewSchema = z.infer<typeof secretNewSchema>;
export type SecretEditSchema = z.infer<typeof secretEditSchema>;
