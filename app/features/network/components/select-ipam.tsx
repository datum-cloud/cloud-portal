import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FieldMetadata, getSelectProps, useInputControl } from '@conform-to/react';

export const SelectIPAM = ({
  meta,
  onChange,
}: {
  meta: FieldMetadata<string>;
  onChange?: (value: string) => void;
}) => {
  const control = useInputControl(meta);

  const options = [
    {
      value: 'Auto',
      label: 'Auto',
    },
  ];

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
        <SelectValue placeholder="Select a IPAM" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
