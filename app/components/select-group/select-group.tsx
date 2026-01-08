import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box';
import { useGroups } from '@/resources/groups';
import { toast } from '@datum-ui/components';
import { useEffect, useMemo } from 'react';

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
  onSelect: (value: SelectBoxOption) => void;
  name?: string;
  id?: string;
}) => {
  const { data: groups = [], isLoading, error } = useGroups(orgId);

  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to load groups');
    }
  }, [error]);

  const options = useMemo(() => {
    return groups.map((group) => {
      return {
        value: group.name,
        label: group.name,
        ...group,
      };
    });
  }, [groups]);

  return (
    <SelectBox
      name={name}
      id={id}
      value={defaultValue}
      className={className}
      onChange={(value: SelectBoxOption) => {
        if (value) {
          onSelect(value);
        }
      }}
      options={options}
      placeholder="Select a Group"
      isLoading={isLoading}
    />
  );
};
