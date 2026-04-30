export {
  serviceAccountCreateSchema,
  serviceAccountUpdateSchema,
  serviceAccountKeyCreateSchema,
  type ServiceAccountCreateSchema,
  type ServiceAccountUpdateSchema,
  type ServiceAccountKeyCreateSchema,
} from './service-account.schema';

export type {
  ServiceAccount,
  ServiceAccountKey,
  CreateServiceAccountInput,
  UpdateServiceAccountInput,
  CreateServiceAccountKeyInput,
  CreateServiceAccountKeyResponse,
  DatumCredentialsFile,
} from './types';

export {
  toServiceAccount,
  toServiceAccountKey,
  toCreateServiceAccountPayload,
  toCreateServiceAccountKeyPayload,
} from './service-account.adapter';

export {
  createServiceAccountService,
  serviceAccountKeys,
  type ServiceAccountService,
} from './service-account.service';

export {
  useServiceAccounts,
  useServiceAccount,
  useCreateServiceAccount,
  useUpdateServiceAccount,
  useToggleServiceAccount,
  useDeleteServiceAccount,
  useServiceAccountKeys,
  useCreateServiceAccountKey,
  useRevokeServiceAccountKey,
} from './service-account.queries';

export {
  useServiceAccountEmailPoller,
  type PollerStatus,
  type PollerResult,
} from './use-service-account-email-poller';

export { pollForEmail } from './poll-for-email';
