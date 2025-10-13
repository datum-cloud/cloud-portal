import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box';
import { POLICY_RESOURCES } from '@/features/policy-binding/form/constants';

const resourceOptions = Object.entries(POLICY_RESOURCES).map(([key, resource]) => ({
  value: key,
  label: resource.label,
}));

export const SelectResource = ({
  defaultValue,
  className,
  onValueChange,
  placeholder = 'Select Resource',
  name,
  id,
  disabled = false,
}: {
  defaultValue?: string;
  className?: string;
  onValueChange: (value: SelectBoxOption) => void;
  placeholder?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
}) => {
  return (
    <SelectBox
      value={defaultValue}
      onChange={(value) => onValueChange(value)}
      options={resourceOptions}
      placeholder={placeholder}
      name={name}
      id={id}
      className={className}
      disabled={disabled}
    />
  );
};
