import { SelectBox } from '@/components/select-box/select-box';
import { RoleLabels, Roles } from '@/resources/interfaces/role.interface';

// Generate options dynamically from enum
const options = Object.values(Roles).map((role) => ({
  value: role,
  label: RoleLabels[role],
}));

export const SelectRole = ({
  defaultValue,
  className,
  onChange,
  disabled,
  id,
  name,
  key,
}: {
  defaultValue?: string;
  className?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  key?: string;
}) => {
  return (
    <SelectBox
      value={defaultValue}
      className={className}
      onChange={(value) => onChange(value.value)}
      options={options}
      placeholder="Select a role"
      disabled={disabled}
      name={name}
      id={id}
      key={key}
    />
  );
};
