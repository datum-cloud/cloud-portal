import timezonesData from './timezones.json';
import { SelectAutocomplete } from '@/components/select-autocomplete/select-autocomplete';
import { Option } from '@/components/select-autocomplete/select-autocomplete.types';
import React, { useCallback, useMemo } from 'react';

/**
 * Timezone data structure from the JSON file
 */
export interface TimezoneData {
  label: string;
  tzCode: string;
  name: string;
  utc: string;
}

/**
 * Props for the SelectTimezone component
 */
export interface SelectTimezoneProps {
  selectedValue?: Option | string;
  onValueChange?: (value: Option) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
}

/**
 * Transform timezone data to Option format for SelectAutocomplete
 */
const transformTimezoneToOption = (timezone: TimezoneData): Option => ({
  value: timezone.tzCode,
  label: timezone.label.replace('_', ' '),
  tzCode: timezone.tzCode,
  name: timezone.name,
  utc: timezone.utc,
});

/**
 * SelectTimezone component that uses SelectAutocomplete with timezone data
 */
export const SelectTimezone = ({
  selectedValue,
  onValueChange,
  placeholder = 'Select timezone...',
  disabled = false,
  name = 'timezone',
  id = 'timezone',
}: SelectTimezoneProps) => {
  // Transform timezone data to options
  const options: Option[] = useMemo(() => {
    return timezonesData.map(transformTimezoneToOption);
  }, []);

  // Find timezone option by tzCode string
  const findTimezoneByCode = useCallback(
    (tzCode: string): Option | undefined => {
      return options.find((option) => option.tzCode === tzCode);
    },
    [options]
  );

  // Resolve the actual selected value (handle both Option and string types)
  const resolvedSelectedValue: Option | undefined = useMemo(() => {
    if (selectedValue) {
      if (typeof selectedValue === 'string') {
        return findTimezoneByCode(selectedValue);
      }
      return selectedValue;
    }
    return undefined;
  }, [selectedValue, findTimezoneByCode]);

  // Custom item preview to show timezone code and UTC offset
  const itemPreview = useCallback((option: Option) => {
    return option.label;
  }, []);

  return (
    <SelectAutocomplete
      options={options}
      triggerClassName="w-full h-auto min-h-10"
      boxClassName="h-[250px]"
      selectedValue={resolvedSelectedValue}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
      name={name}
      id={id}
      keyValue="value"
      itemPreview={itemPreview}
      itemContent={itemPreview}
      emptyContent="No timezones found"
    />
  );
};
