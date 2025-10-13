import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { ROUTE_PATH as PROJECT_LIST_PATH } from '@/routes/api/projects';
import { useEffect, useMemo, useState } from 'react';
import { useFetcher } from 'react-router';
import { toast } from 'sonner';

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
  const fetcher = useFetcher({ key: 'project-list' });

  const [projects, setProjects] = useState<IProjectControlResponse[]>([]);

  useEffect(() => {
    if (orgId) {
      fetcher.load(`${PROJECT_LIST_PATH}?orgId=${orgId}`);
    }
  }, [orgId]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success, error, data } = fetcher.data;
      if (!success) {
        toast.error(error);
        return;
      }

      setProjects(data);
    }
  }, [fetcher.data, fetcher.state]);

  const options = useMemo(() => {
    return projects.map((project) => ({
      value: project.name ?? '',
      label: project.description ?? project.name ?? '',
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
      isLoading={fetcher.state === 'loading'}
      disabled={disabled}
    />
  );
};
