import { POLICY_RESOURCES } from '@/features/policy-binding/form/constants';
import { Autocomplete } from '@datum-cloud/datum-ui/autocomplete';

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
  onValueChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
}) => {
  return (
    <Autocomplete
      value={defaultValue}
      onValueChange={(value) => onValueChange(value)}
      options={resourceOptions}
      placeholder={placeholder}
      name={name}
      id={id}
      className={className}
      disabled={disabled}
    />
  );
};
