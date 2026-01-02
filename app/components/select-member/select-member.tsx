import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box';
import { useMembers } from '@/resources/members/member.queries';
import { toast } from '@datum-ui/components';
import { useEffect, useMemo } from 'react';

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
  const { data: members = [], isLoading, error } = useMembers(orgId);

  useEffect(() => {
    if (error) {
      toast.error(error.message || 'Failed to load members');
    }
  }, [error]);

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
      isLoading={isLoading}
    />
  );
};
