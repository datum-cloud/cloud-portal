import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LOCATION_PROVIDERS } from '@/features/location/constants';
import { LocationProvider } from '@/resources/interfaces/location.interface';
import { FieldMetadata, getSelectProps, useInputControl } from '@conform-to/react';
import { useMemo } from 'react';

export const SelectLocationProvider = ({
  meta,
  onChange,
}: {
  meta: FieldMetadata<string>;
  onChange?: (value: string) => void;
}) => {
  const control = useInputControl(meta);

  const options = useMemo(() => {
    return Object.keys(LOCATION_PROVIDERS).map((value: string) => ({
      value,
      label: LOCATION_PROVIDERS[value as LocationProvider].label,
    }));
  }, []);

  return (
    <Select
      {...getSelectProps(meta)}
      onValueChange={(value) => {
        control.change(value);
        onChange?.(value);
      }}
      key={meta.id}
      defaultValue={meta.value?.toString()}>
      <SelectTrigger disabled>
        <SelectValue placeholder="Select a provider" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="w-[var(--radix-select-trigger-width)]">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
