import { useProjects } from '@/resources/projects/project.queries';
import type { Project } from '@/resources/projects/project.schema';
import { Autocomplete, type AutocompleteOption } from '@datum-cloud/datum-ui/autocomplete';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useEffect, useMemo } from 'react';

export type SelectProjectOption = AutocompleteOption & Project;

export const SelectProject = ({
  orgId,
  defaultValue,
  className,
  onSelect,
  name,
  id,
  disabled = false,
}: {
  orgId: string;
  defaultValue?: string;
  className?: string;
  onSelect: (value: SelectProjectOption) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
}) => {
  const { data, isLoading, error } = useProjects(orgId);
  const projects = data?.items ?? [];

  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to load projects');
    }
  }, [error]);

  const options = useMemo<SelectProjectOption[]>(() => {
    return projects.map((project) => ({
      value: project.name,
      label: project.displayName,
      ...project,
    }));
  }, [projects]);

  return (
    <Autocomplete<SelectProjectOption>
      value={defaultValue}
      name={name}
      id={id}
      className={className}
      onValueChange={(value) => {
        const option = options.find((opt) => opt.value === value);
        if (option) {
          onSelect(option);
        }
      }}
      options={options}
      placeholder="Select a Project"
      loading={isLoading}
      disabled={disabled}
    />
  );
};
