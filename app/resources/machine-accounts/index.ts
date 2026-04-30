export {
  machineAccountCreateSchema,
  machineAccountUpdateSchema,
  machineAccountKeyCreateSchema,
  type MachineAccountCreateSchema,
  type MachineAccountUpdateSchema,
  type MachineAccountKeyCreateSchema,
} from './machine-account.schema';

export type {
  MachineAccount,
  MachineAccountKey,
  CreateMachineAccountInput,
  UpdateMachineAccountInput,
  CreateMachineAccountKeyInput,
  CreateMachineAccountKeyResponse,
  DatumCredentialsFile,
} from './types';

export {
  toMachineAccount,
  toMachineAccountKey,
  toCreateMachineAccountPayload,
  toCreateMachineAccountKeyPayload,
} from './machine-account.adapter';

export {
  createMachineAccountService,
  machineAccountKeys,
  type MachineAccountService,
} from './machine-account.service';

export {
  useMachineAccounts,
  useMachineAccount,
  useCreateMachineAccount,
  useUpdateMachineAccount,
  useToggleMachineAccount,
  useDeleteMachineAccount,
  useMachineAccountKeys,
  useCreateMachineAccountKey,
  useRevokeMachineAccountKey,
} from './machine-account.queries';

export {
  useMachineAccountEmailPoller,
  type PollerStatus,
  type PollerResult,
} from './use-machine-account-email-poller';

export { pollForEmail } from './poll-for-email';
