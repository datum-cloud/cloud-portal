import type { Group } from '@/resources/groups';
import { useGroups } from '@/resources/groups';
import { Autocomplete, type AutocompleteOption } from '@datum-cloud/datum-ui/autocomplete';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useEffect, useMemo } from 'react';

export type SelectGroupOption = AutocompleteOption & Group;

export const SelectGroup = ({
  orgId,
  defaultValue,
  className,
  onSelect,
  name,
  id,
}: {
  orgId: string;
  defaultValue?: string;
  className?: string;
  onSelect: (value: SelectGroupOption) => void;
  name?: string;
  id?: string;
}) => {
  const { data: groups = [], isLoading, error } = useGroups(orgId);

  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to load groups');
    }
  }, [error]);

  const options = useMemo<SelectGroupOption[]>(() => {
    return groups.map((group) => {
      return {
        value: group.name,
        label: group.name,
        ...group,
      };
    });
  }, [groups]);

  return (
    <Autocomplete<SelectGroupOption>
      name={name}
      id={id}
      value={defaultValue}
      className={className}
      onValueChange={(value) => {
        const option = options.find((opt) => opt.value === value);
        if (option) {
          onSelect(option);
        }
      }}
      options={options}
      placeholder="Select a Group"
      loading={isLoading}
    />
  );
};
