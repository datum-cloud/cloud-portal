import { LabelFormDialog, LabelFormDialogRef } from './label-form-dialog';
import { MultiSelect, MultiSelectOption } from '@/components/multi-select/multi-select';
import { LabelFormSchema } from '@/resources/schemas/metadata.schema';
import { splitOption } from '@/utils/helpers/object.helper';
import { PlusIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export const SelectLabels = ({
  defaultValue,
  onChange,
}: {
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
}) => {
  const labelFormDialogRef = useRef<LabelFormDialogRef>(null!);
  const [options, setOptions] = useState<MultiSelectOption[]>();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [activeOption, setActiveOption] = useState<string>();

  useEffect(() => {
    if (defaultValue && !options) {
      const values = Array.isArray(defaultValue) ? defaultValue : [defaultValue];
      const initialOptions = values.map((option) => {
        const { key, value } = splitOption(option);
        return {
          label: `${key}:${value}`,
          value: `${key}:${value}`,
        };
      });
      setOptions(initialOptions);
      setSelectedOptions(initialOptions.map((option) => option.value));
    } else if (defaultValue) {
      // Only update selected options without replacing all options
      const values = Array.isArray(defaultValue) ? defaultValue : [defaultValue];
      setSelectedOptions(values);
    } else {
      setSelectedOptions([]);
    }
  }, [defaultValue, options]);

  const handleSubmit = (value: LabelFormSchema) => {
    const newOption = `${value.key}:${value.value}`;
    const newOptionObj = { label: newOption, value: newOption };
    const currentOptions = options ?? [];

    // Check if the option already exists (excluding the active one when editing)
    const isDuplicate = currentOptions.some(
      (opt) => opt.value === newOption && (!activeOption || opt.value !== activeOption)
    );

    if (isDuplicate) {
      toast.error('Label already exists', {
        duration: Infinity,
      });
      return;
    }

    if (activeOption !== undefined) {
      // Update existing option
      const updatedOptions = currentOptions.map((opt) =>
        opt.value === activeOption ? newOptionObj : opt
      );

      const updatedSelectedOptions = selectedOptions.map((opt) =>
        opt === activeOption ? newOption : opt
      );

      setOptions(updatedOptions);
      handleValueChange(updatedSelectedOptions);
    } else {
      // Add new option
      setOptions([...currentOptions, newOptionObj]);
      handleValueChange([...selectedOptions, newOption]);
    }
  };

  const handleValueChange = (values: string[]) => {
    setSelectedOptions(values);
    onChange?.(values);
  };

  return (
    <>
      <MultiSelect
        clickableBadges
        defaultValue={selectedOptions}
        options={options ?? []}
        onValueChange={handleValueChange}
        placeholder="Manage labels"
        boxClassName="max-w-[300px]"
        maxCount={-1}
        showCloseButton={false}
        showClearButton={false}
        actions={[
          {
            label: 'New Label',
            icon: PlusIcon,
            className: 'text-primary cursor-pointer',
            onClick: () => {
              setActiveOption(undefined);
              labelFormDialogRef.current?.show();
            },
          },
        ]}
        onBadgeClick={(option) => {
          const { key, value } = splitOption(option.value);

          setActiveOption(option.value);
          labelFormDialogRef.current?.show({ key, value });
        }}
      />

      <LabelFormDialog
        ref={labelFormDialogRef}
        onSubmit={handleSubmit}
        onClose={() => setActiveOption(undefined)}
      />
    </>
  );
};
