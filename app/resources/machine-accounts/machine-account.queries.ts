import { createMachineAccountService, machineAccountKeys } from './machine-account.service';
import type {
  MachineAccount,
  MachineAccountKey,
  CreateMachineAccountInput,
  UpdateMachineAccountInput,
  CreateMachineAccountKeyInput,
  CreateMachineAccountKeyResponse,
} from './types';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useMachineAccounts(
  projectId: string,
  options?: Omit<UseQueryOptions<MachineAccount[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: machineAccountKeys.list(projectId),
    queryFn: () => createMachineAccountService().list(projectId),
    enabled: !!projectId,
    ...options,
  });
}

export function useMachineAccount(
  projectId: string,
  name: string,
  options?: Omit<UseQueryOptions<MachineAccount>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: machineAccountKeys.detail(projectId, name),
    queryFn: () => createMachineAccountService().get(projectId, name),
    enabled: !!projectId && !!name,
    ...options,
  });
}

export function useCreateMachineAccount(
  projectId: string,
  options?: UseMutationOptions<MachineAccount, Error, CreateMachineAccountInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMachineAccountInput) =>
      createMachineAccountService().create(projectId, input),
    ...options,
    onSuccess: (...args) => {
      const [newAccount] = args;
      queryClient.setQueryData(machineAccountKeys.detail(projectId, newAccount.name), newAccount);
      queryClient.invalidateQueries({ queryKey: machineAccountKeys.list(projectId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateMachineAccount(
  projectId: string,
  name: string,
  options?: UseMutationOptions<MachineAccount, Error, UpdateMachineAccountInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMachineAccountInput) =>
      createMachineAccountService().update(projectId, name, input),
    ...options,
    onSuccess: (...args) => {
      const [data] = args;
      queryClient.setQueryData(machineAccountKeys.detail(projectId, name), data);
      queryClient.invalidateQueries({ queryKey: machineAccountKeys.list(projectId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useToggleMachineAccount(
  projectId: string,
  options?: UseMutationOptions<
    MachineAccount,
    Error,
    { name: string; status: 'Active' | 'Disabled' }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, status }: { name: string; status: 'Active' | 'Disabled' }) =>
      createMachineAccountService().update(projectId, name, { status }),
    ...options,
    onSuccess: (...args) => {
      const [data, { name }] = args;
      queryClient.setQueryData(machineAccountKeys.detail(projectId, name), data);
      queryClient.invalidateQueries({ queryKey: machineAccountKeys.list(projectId) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteMachineAccount(
  projectId: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createMachineAccountService().delete(projectId, name),
    ...options,
    onSuccess: async (...args) => {
      const [, name] = args;
      await queryClient.cancelQueries({ queryKey: machineAccountKeys.detail(projectId, name) });
      queryClient.setQueryData<MachineAccount[]>(machineAccountKeys.list(projectId), (old) =>
        old ? old.filter((a) => a.name !== name) : old
      );
      queryClient.removeQueries({ queryKey: machineAccountKeys.detail(projectId, name) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useMachineAccountKeys(
  projectId: string,
  machineAccountName: string,
  machineAccountEmail: string,
  options?: Omit<UseQueryOptions<MachineAccountKey[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: machineAccountKeys.keyList(projectId, machineAccountName),
    queryFn: () => createMachineAccountService().listKeys(projectId, machineAccountEmail),
    enabled: !!projectId && !!machineAccountName && !!machineAccountEmail,
    ...options,
  });
}

export function useCreateMachineAccountKey(
  projectId: string,
  machineAccountName: string,
  machineAccountEmail: string,
  options?: UseMutationOptions<CreateMachineAccountKeyResponse, Error, CreateMachineAccountKeyInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMachineAccountKeyInput) =>
      createMachineAccountService().createKey(projectId, machineAccountEmail, input),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: machineAccountKeys.keyList(projectId, machineAccountName),
      });
      queryClient.invalidateQueries({
        queryKey: machineAccountKeys.detail(projectId, machineAccountName),
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function useRevokeMachineAccountKey(
  projectId: string,
  machineAccountName: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyName: string) =>
      createMachineAccountService().revokeKey(projectId, machineAccountName, keyName),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: machineAccountKeys.keyList(projectId, machineAccountName),
      });
      options?.onSuccess?.(...args);
    },
  });
}
