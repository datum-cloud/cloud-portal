import type { Note, SubjectRef } from './note.schema';
import { createNoteService, noteKeys } from './note.service';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

function subjectQueryKey(projectId: string, ref: SubjectRef) {
  return noteKeys.bySubject(projectId, ref.apiGroup, ref.kind, ref.name);
}

export function useNotes(
  projectId: string,
  subjectRef: SubjectRef,
  options?: Omit<UseQueryOptions<Note[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: subjectQueryKey(projectId, subjectRef),
    queryFn: () => createNoteService().list(projectId, subjectRef),
    enabled: !!projectId && !!subjectRef.name && !!subjectRef.kind,
    ...options,
  });
}

export function useCreateNote(
  projectId: string,
  subjectRef: SubjectRef,
  options?: UseMutationOptions<Note, Error, string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => createNoteService().create(projectId, subjectRef, content),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: subjectQueryKey(projectId, subjectRef) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useUpdateNote(
  projectId: string,
  subjectRef: SubjectRef,
  options?: UseMutationOptions<Note, Error, { noteName: string; content: string }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteName, content }: { noteName: string; content: string }) =>
      createNoteService().update(projectId, noteName, content),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: subjectQueryKey(projectId, subjectRef) });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteNote(
  projectId: string,
  subjectRef: SubjectRef,
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteName: string) => createNoteService().delete(projectId, noteName),
    ...options,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: subjectQueryKey(projectId, subjectRef) });
      options?.onSuccess?.(...args);
    },
  });
}
