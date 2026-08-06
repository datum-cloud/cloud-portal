/**
 * Rejection produced by useGuardedMutation when a project-scoped write is
 * attempted while the project is read-only. Rejecting (rather than no-op'ing)
 * is deliberate: existing onError paths keep working, isError/isPending stay
 * coherent, and forms never hang in a submitting state.
 *
 * The message is the sanitized read-only reason — never the Suspended
 * condition message, operator identity, or a raw reason enum. That matters
 * beyond this file: any caller that does the common
 * `toast.error(title, { description: error.message })` still renders redacted
 * copy.
 */
export class ProjectReadOnlyError extends Error {
  public readonly code = 'PROJECT_READ_ONLY';

  constructor(reason?: string) {
    super(reason ?? 'This project is read-only — new changes are disabled.');
    this.name = 'ProjectReadOnlyError';
  }
}

export function isProjectReadOnlyError(error: unknown): error is ProjectReadOnlyError {
  return error instanceof ProjectReadOnlyError;
}
