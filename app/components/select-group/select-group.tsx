import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box';
import { IGroupControlResponse } from '@/resources/interfaces/group.interface';
import { ROUTE_PATH as GROUPS_LIST_PATH } from '@/routes/api/groups';
import { useEffect, useMemo, useState } from 'react';
import { useFetcher } from 'react-router';
import { toast } from 'sonner';

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
  const fetcher = useFetcher({ key: 'group-list' });

  const [groups, setGroups] = useState<IGroupControlResponse[]>([]);

  useEffect(() => {
    if (orgId) {
      fetcher.load(`${GROUPS_LIST_PATH}?orgId=${orgId}`);
    }
  }, [orgId]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success, error, data } = fetcher.data;
      if (!success) {
        toast.error(error);
        return;
      }

      setGroups(data);
    }
  }, [fetcher.data, fetcher.state]);

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
      isLoading={fetcher.state === 'loading'}
    />
  );
};
