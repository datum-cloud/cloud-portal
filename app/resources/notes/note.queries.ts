import type { Note, CreateNoteInput } from './note.schema';
import { createNoteService, noteKeys } from './note.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useNotes(
  projectId: string,
  domainName: string,
  options?: Omit<UseQueryOptions<Note[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: noteKeys.byDomain(projectId, domainName),
    queryFn: () => createNoteService().listByDomain(projectId, domainName),
    enabled: !!projectId && !!domainName,
    ...options,
  });
}

export function useCreateNote(
  projectId: string,
  domainName: string,
  options?: UseMutationOptions<Note, Error, CreateNoteInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateNoteInput) => createNoteService().create(projectId, input),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.byDomain(projectId, domainName) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteNote(
  projectId: string,
  domainName: string,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteName: string) => createNoteService().delete(projectId, noteName),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.byDomain(projectId, domainName) });
      options?.onSuccess?.(...args);
    },
  });
}
