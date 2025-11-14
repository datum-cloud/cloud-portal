import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box';
import { IMemberControlResponse } from '@/resources/interfaces/member.interface';
import { ROUTE_PATH as MEMBERS_LIST_PATH } from '@/routes/api/members';
import { toast } from '@datum-ui/components';
import { useEffect, useMemo, useState } from 'react';
import { useFetcher } from 'react-router';

export const SelectMember = ({
  orgId,
  defaultValue,
  className,
  onSelect,
  name,
  id,
  exceptItems = [],
}: {
  orgId: string;
  defaultValue?: string;
  className?: string;
  onSelect: (value: SelectBoxOption) => void;
  name?: string;
  id?: string;
  exceptItems?: string[];
}) => {
  const fetcher = useFetcher({ key: 'member-list' });

  const [members, setMembers] = useState<IMemberControlResponse[]>([]);

  useEffect(() => {
    if (orgId) {
      fetcher.load(`${MEMBERS_LIST_PATH}?orgId=${orgId}`);
    }
  }, [orgId]);

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success, error, data } = fetcher.data;
      if (!success) {
        toast.error(error);
        return;
      }

      setMembers(data);
    }
  }, [fetcher.data, fetcher.state]);

  const options = useMemo(() => {
    return members.map((member) => {
      const id = member.user.id ?? '';
      const label = `${member?.user?.givenName ?? ''} ${member?.user?.familyName ?? ''}`.trim();
      return {
        disabled: exceptItems.includes(id),
        value: id,
        label: label ? `${label} (${member.user.email ?? ''})` : (member.user.email ?? ''),
        ...member,
      };
    });
  }, [members, exceptItems]);

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
      placeholder="Select a User"
      isLoading={fetcher.state === 'loading'}
    />
  );
};
