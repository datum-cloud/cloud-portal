import { isProjectReadOnlyError, ProjectReadOnlyError } from './project-read-only-error';
import { showProjectReadOnlyToast } from './read-only-toast';
import { deriveProjectMode } from './use-project-mode';
import { useOptionalProjectContext } from '@/providers/project.provider';
import {
  useMutation,
  type DefaultError,
  type MutationFunction,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * `'write'` — create/update/patch. Blocked while the project is read-only.
 * `'delete'` — always passes through. The platform permits deletes during
 * suspension (offboarding); the UI must not invent a restriction the API does
 * not have. Declaring the operation is mandatory so the safe default is
 * "blocked" and a new hook cannot be silently ungated.
 */
export type GuardedMutationOperation = 'write' | 'delete';

/**
 * Drop-in replacement for TanStack `useMutation` in project-scoped resource
 * hooks. A `'write'` attempted while `useProjectMode().isReadOnly` never
 * reaches the network: it rejects with a typed ProjectReadOnlyError and this
 * hook fires the sanitized suspension toast.
 *
 * The caller's own `onError` still runs for that error — it is where optimistic
 * cache rollback lives, and TanStack has already applied `onMutate` by the time
 * the gate rejects. Duplicate messaging is handled at the toast layer instead:
 * the read-only toast is idempotent (stable toast id) and
 * `showMutationErrorToast` routes ProjectReadOnlyError to it, so the shared
 * error paths collapse onto a single toast. Call sites that hand-roll
 * `toast.error(title, { description: error.message })` still render their own
 * copy — sanitized, since ProjectReadOnlyError.message is the redacted reason.
 *
 * The gate is evaluated inside `mutationFn`, i.e. at mutate() time, not at
 * render time. TanStack re-applies the options object on every render, so the
 * closure always sees the current mode.
 */
export function useGuardedMutation<
  TData = unknown,
  TError = DefaultError,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    operation: GuardedMutationOperation;
  }
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { operation, mutationFn, ...rest } = options;
  // One context read for both the mode and the project name. useProjectMode()
  // would read the very same context a second time, and this hook is mounted
  // once per project-scoped mutation hook across the app.
  const project = useOptionalProjectContext()?.project;
  const { isReadOnly, reason } = useMemo(
    () => deriveProjectMode(project?.status),
    [project?.status]
  );
  const projectName = project?.name;

  return useMutation<TData, TError, TVariables, TContext>({
    ...rest,
    // Rest args, not `(variables)`: TanStack v5 passes a second
    // MutationFunctionContext argument, and the caller's mutationFn is typed to
    // receive it. Forwarding the whole list keeps the wrapper transparent.
    mutationFn: (...args: Parameters<MutationFunction<TData, TVariables>>) => {
      if (operation === 'write' && isReadOnly) {
        return Promise.reject(new ProjectReadOnlyError(reason));
      }
      if (!mutationFn) {
        return Promise.reject(new Error('useGuardedMutation requires a mutationFn'));
      }
      return Promise.resolve(mutationFn(...args));
    },
    onError: (...args) => {
      const [error] = args;
      if (isProjectReadOnlyError(error)) {
        showProjectReadOnlyToast({ projectName });
      }
      // Always forward, gated errors included. TanStack awaits `onMutate`
      // BEFORE the retryer invokes `mutationFn` (query-core mutation.js), so a
      // blocked write has already applied its optimistic cache write by the
      // time the gate rejects. Short-circuiting here would strand
      // never-persisted values in the query cache — e.g. useUpdateHttpProxy
      // rolls back exclusively from its own `onError` and declares no
      // `onSettled`, so its edits would render as saved until the next refetch.
      return rest.onError?.(...args);
    },
  });
}
