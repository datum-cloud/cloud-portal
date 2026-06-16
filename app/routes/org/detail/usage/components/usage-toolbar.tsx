import type { UsageBillingCycleOption, UsageProjectOption } from '../usage.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useSearchParams } from 'react-router';

interface UsageToolbarProps {
  projects: UsageProjectOption[];
  billingCycles: UsageBillingCycleOption[];
  isLoading?: boolean;
  /** Renders disabled selects with the same trigger chrome as the loaded toolbar. */
  isPlaceholder?: boolean;
}

const BILLING_CYCLE_TRIGGER_CLASS = 'h-9 min-h-9 w-full text-sm sm:w-[350px]';
const PROJECT_TRIGGER_CLASS = 'h-9 min-h-9 w-full text-sm sm:w-[150px]';

function ToolbarSelectPlaceholder({ className }: { className: string }) {
  return (
    <Select disabled value="__loading__">
      <SelectTrigger className={cn(className, 'pointer-events-none')} aria-hidden>
        <Skeleton className="h-4 w-32" />
      </SelectTrigger>
    </Select>
  );
}

function resolveProjectSelection(
  projectParam: string | null,
  projects: UsageProjectOption[]
): string {
  if (!projectParam || projectParam === 'all') return 'all';
  return projects.some((project) => project.name === projectParam) ? projectParam : 'all';
}

function resolveCycleSelection(
  cycleParam: string | null,
  billingCycles: UsageBillingCycleOption[]
): 'current' | 'previous' {
  const match = billingCycles.find((cycle) => cycle.value === cycleParam);
  return match?.value ?? 'current';
}

/**
 * Filter row beneath the page title. Both pickers drive URL search params
 * so React Query refetches scoped usage for the chosen project and billing
 * cycle window. Selection is read from the URL so the controls stay in
 * sync immediately, before the API round-trip completes.
 */
export function UsageToolbar({
  projects,
  billingCycles,
  isLoading = false,
  isPlaceholder = false,
}: UsageToolbarProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  if (isPlaceholder) {
    return (
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ToolbarSelectPlaceholder className={BILLING_CYCLE_TRIGGER_CLASS} />
        <ToolbarSelectPlaceholder className={PROJECT_TRIGGER_CLASS} />
      </div>
    );
  }

  const selectedProject = resolveProjectSelection(searchParams.get('project'), projects);
  const selectedBillingCycle = resolveCycleSelection(searchParams.get('cycle'), billingCycles);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null) {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      },
      { preventScrollReset: true }
    );
  };

  const handleProjectChange = (value: string) => {
    updateSearchParams({ project: value === 'all' ? null : value });
  };

  const handleBillingCycleChange = (value: string) => {
    updateSearchParams({ cycle: value === 'current' ? null : value });
  };

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center',
        isLoading && 'pointer-events-none'
      )}>
      <Select value={selectedBillingCycle} onValueChange={handleBillingCycleChange}>
        <SelectTrigger className={BILLING_CYCLE_TRIGGER_CLASS}>
          <SelectValue placeholder="Select billing cycle" />
        </SelectTrigger>
        <SelectContent>
          {billingCycles.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedProject} onValueChange={handleProjectChange}>
        <SelectTrigger className={PROJECT_TRIGGER_CLASS}>
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.name} value={project.name}>
              {project.displayName || project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
