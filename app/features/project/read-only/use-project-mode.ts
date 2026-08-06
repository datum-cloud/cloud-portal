import { deriveSuspensionVerdict } from '@/features/project/suspension/derive-suspension-verdict';
import { SUSPENDED_TOOLTIP } from '@/features/project/suspension/suspension-copy';
import { useOptionalProjectContext } from '@/providers/project.provider';
import { useMemo } from 'react';

export interface ProjectMode {
  /** True only when the project is definitively in a write-blocked state. */
  isReadOnly: boolean;
  /** Sanitized, consumer-facing explanation. Undefined when not read-only. */
  reason?: string;
}

const WRITABLE: ProjectMode = { isReadOnly: false };

/**
 * Pure derivation, split out the same way `deriveSuspensionVerdict` is split
 * from `useProjectSuspension`: a caller that has ALREADY read the project
 * context (useGuardedMutation needs the project name from it anyway) derives
 * the mode from that one read instead of triggering a second context read via
 * the hook.
 *
 * Read-only TODAY only when suspended; a future read-only source is added here
 * and every consumer picks it up untouched.
 */
export function deriveProjectMode(status: unknown): ProjectMode {
  return deriveSuspensionVerdict(status).isSuspended
    ? { isReadOnly: true, reason: SUSPENDED_TOOLTIP }
    : WRITABLE;
}

/**
 * The one question call sites ask: "is this project read-only, and why?" —
 * never "is it suspended?". No registry, no config, no speculative states.
 *
 * Must not throw outside ProjectProvider: org-scoped pages share the same
 * resource hooks, so it reads the context optionally and reports WRITABLE when
 * there is no ambient project.
 */
export function useProjectMode(): ProjectMode {
  const status = useOptionalProjectContext()?.project?.status;
  return useMemo(() => deriveProjectMode(status), [status]);
}
