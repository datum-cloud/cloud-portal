import type { Member } from '@/resources/members';
import { useMembers } from '@/resources/members/member.queries';
import { Autocomplete, type AutocompleteOption } from '@datum-cloud/datum-ui/autocomplete';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useEffect, useMemo } from 'react';

export type SelectMemberOption = AutocompleteOption & Member;

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
  onSelect: (value: SelectMemberOption) => void;
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

  const options = useMemo<SelectMemberOption[]>(() => {
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
    <Autocomplete<SelectMemberOption>
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
      placeholder="Select a User"
      loading={isLoading}
    />
  );
};
