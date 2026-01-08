import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box';
import { useProjects } from '@/resources/projects/project.queries';
import { toast } from '@datum-ui/components';
import { useEffect, useMemo } from 'react';

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
  onSelect: (value: SelectBoxOption) => void;
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

  const options = useMemo(() => {
    return projects.map((project) => ({
      value: project.name,
      label: project.displayName,
      ...project,
    }));
  }, [projects]);

  return (
    <SelectBox
      value={defaultValue}
      name={name}
      id={id}
      className={className}
      onChange={(value: SelectBoxOption) => {
        if (value) {
          onSelect(value);
        }
      }}
      options={options}
      placeholder="Select a Project"
      isLoading={isLoading}
      disabled={disabled}
    />
  );
};
