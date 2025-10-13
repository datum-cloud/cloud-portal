import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box';
import { useMemo } from 'react';

const iataOptions = [
  {
    value: 'DFW',
    label: 'Dallas Fort Worth Intl (DFW)',
  },
  {
    value: 'LHR',
    label: 'Heathrow (LHR)',
  },
  {
    value: 'DLS',
    label: 'Columbia Gorge Regional (DLS)',
  },
];

export const SelectIATA = ({
  defaultValue,
  className,
  onValueChange,
  placeholder = 'Select IATA',
  name,
  id,
  availableItems = [],
}: {
  defaultValue?: string;
  className?: string;
  onValueChange: (value: SelectBoxOption) => void;
  placeholder?: string;
  name?: string;
  id?: string;
  availableItems?: string[];
}) => {
  const filteredOptions = useMemo(() => {
    return availableItems.length > 0
      ? iataOptions.filter((option) => availableItems.includes(option.value))
      : iataOptions;
  }, [availableItems]);

  return (
    <SelectBox
      value={defaultValue}
      onChange={(value) => onValueChange(value)}
      options={filteredOptions}
      placeholder={placeholder}
      name={name}
      id={id}
      className={className}
    />
  );
};
