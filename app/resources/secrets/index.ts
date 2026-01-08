// Schema exports
export {
  SECRET_TYPES,
  SecretType,
  type SecretTypeValue,
  labelSchema,
  type Label,
  secretResourceSchema,
  type Secret,
  type ISecretControlResponse,
  secretListSchema,
  type SecretList,
  secretVariableSchema,
  type SecretVariable,
  type CreateSecretInput,
  type UpdateSecretInput,
  // Re-exported validation schemas
  secretEnvSchema,
  secretVariablesSchema,
  secretBaseSchema,
  secretNewSchema,
  secretEditSchema,
  type SecretBaseSchema,
  type SecretEnvSchema,
  type SecretVariablesSchema,
  type SecretNewSchema,
  type SecretEditSchema,
} from './secret.schema';

// Adapter exports
export {
  toSecret,
  toSecretList,
  toCreateSecretPayload,
  toUpdateSecretPayload,
} from './secret.adapter';

// Service exports
export { createSecretService, secretKeys, type SecretService } from './secret.service';

// Query hooks exports
export {
  useSecrets,
  useSecret,
  useCreateSecret,
  useUpdateSecret,
  useDeleteSecret,
  useHydrateSecrets,
  useHydrateSecret,
} from './secret.queries';

// Watch hooks exports
export * from './secret.watch';
