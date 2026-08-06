import { deriveSuspensionVerdict, type SuspensionVerdict } from './derive-suspension-verdict';
import { useProjectContext } from '@/providers/project.provider';
import { useMemo } from 'react';

/**
 * Project-layout-scoped suspension verdict. Throws outside ProjectProvider
 * (same contract as useProjectContext). Live-updates with the existing
 * project query — no fetch of its own.
 */
export function useProjectSuspension(): SuspensionVerdict {
  const { project } = useProjectContext();
  return useMemo(() => deriveSuspensionVerdict(project?.status), [project?.status]);
}
