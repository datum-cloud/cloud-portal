import type { UsageBillingCycleOption, UsageProjectOption } from '../usage.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { useSearchParams } from 'react-router';

interface UsageToolbarProps {
  projects: UsageProjectOption[];
  selectedProject: string;
  billingCycles: UsageBillingCycleOption[];
  selectedBillingCycle: 'current' | 'previous';
}

/**
 * Filter row beneath the page title. Both pickers drive URL search params
 * so the loader refetches scoped usage for the chosen project and billing
 * cycle window.
 */
export function UsageToolbar({
  projects,
  selectedProject,
  billingCycles,
  selectedBillingCycle,
}: UsageToolbarProps) {
  const [, setSearchParams] = useSearchParams();

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
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Select value={selectedBillingCycle} onValueChange={handleBillingCycleChange}>
        <SelectTrigger className="h-9 w-full text-sm sm:w-[350px]">
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
        <SelectTrigger className="h-9 w-full text-sm sm:w-[150px]">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.name} value={project.name}>
              {project.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
