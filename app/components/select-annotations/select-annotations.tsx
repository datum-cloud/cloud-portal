import { AnnotationFormDialog, AnnotationFormDialogRef } from './annotations-form-dialog';
import { MultiSelect, MultiSelectOption } from '@/components/multi-select/multi-select';
import { LabelFormSchema } from '@/resources/base';
import { splitOption } from '@/utils/helpers/object.helper';
import { toast } from '@datum-ui/components';
import { PlusIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export const SelectAnnotations = ({
  defaultValue,
  onChange,
}: {
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
}) => {
  const annotationFormDialogRef = useRef<AnnotationFormDialogRef>(null!);
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
      toast.error('Label already exists');
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
        placeholder="Manage annotations"
        boxClassName="max-w-[300px]"
        badgeClassName="max-w-[200px] text-left"
        maxCount={-1}
        showCloseButton={false}
        showClearButton={false}
        actions={[
          {
            label: 'New Annotation',
            icon: PlusIcon,
            className: 'text-primary cursor-pointer',
            onClick: () => {
              setActiveOption(undefined);
              annotationFormDialogRef.current?.show();
            },
          },
        ]}
        onBadgeClick={(option) => {
          const { key, value } = splitOption(option.value);

          setActiveOption(option.value);
          annotationFormDialogRef.current?.show({ key, value });
        }}
      />

      <AnnotationFormDialog
        ref={annotationFormDialogRef}
        onSubmit={handleSubmit}
        onClose={() => setActiveOption(undefined)}
      />
    </>
  );
};
