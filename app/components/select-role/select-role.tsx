import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box';
import { IRoleControlResponse } from '@/resources/interfaces/role.interface';
import { ROUTE_PATH as ROLES_LIST_PATH } from '@/routes/api/roles';
import { useEffect, useMemo, useState } from 'react';
import { useFetcher } from 'react-router';
import { toast } from 'sonner';

export const SelectRole = ({
  defaultValue,
  className,
  onSelect,
  name,
  id,
  disabled,
}: {
  defaultValue?: string;
  className?: string;
  onSelect: (value: SelectBoxOption) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
}) => {
  const fetcher = useFetcher({ key: 'role-list' });

  const [roles, setRoles] = useState<IRoleControlResponse[]>([]);

  useEffect(() => {
    fetcher.load(`${ROLES_LIST_PATH}`);
  }, []);

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success, error, data } = fetcher.data;
      if (!success) {
        toast.error(error);
        return;
      }

      setRoles(data);
    }
  }, [fetcher.data, fetcher.state]);

  const options = useMemo(() => {
    // Create options from API-fetched roles
    const apiRoleOptions = roles.map((role) => {
      return {
        value: role.name,
        label: role.displayName ?? role.name,
        ...role,
      };
    });

    return apiRoleOptions;
  }, [roles]);

  return (
    <SelectBox
      disabled={disabled}
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
      placeholder="Select a Role"
      isLoading={fetcher.state === 'loading'}
    />
  );
};
