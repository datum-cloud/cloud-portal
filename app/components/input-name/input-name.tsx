import { Field } from '../field/field';
import { FieldLabel } from '@/components/field/field-label';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
import { FieldMetadata, useInputControl } from '@conform-to/react';
import { getInputProps } from '@conform-to/react';
import { Tooltip } from '@datum-ui/components';
import { Checkbox, Input, Label } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { CircleHelp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface InputNameProps {
  label?: string;
  description?: string;
  readOnly?: boolean;
  required?: boolean;
  field: FieldMetadata;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoGenerate?: boolean;
  baseName?: string;
  className?: string;
  labelClassName?: string;
  showTooltip?: boolean;
  disabledRandomSuffix?: boolean;
}

export const InputName = ({
  label = 'Resource Name',
  description = 'This unique resource name will be used to identify your resource and cannot be changed.',
  readOnly = false,
  required = true,
  inputRef,
  field,
  autoGenerate = true,
  baseName,
  className,
  labelClassName,
  showTooltip = true,
  disabledRandomSuffix = false,
}: InputNameProps) => {
  const nameControl = useInputControl({
    key: field.id,
    name: field.name,
    formId: field.formId,
    initialValue: field.initialValue as string,
  });

  const [auto, setAuto] = useState(autoGenerate);

  const randomSuffix = useMemo(() => generateRandomString(6), []);

  // Auto generate name when base name is provided and auto generate is enabled
  useEffect(() => {
    if (baseName && auto) {
      nameControl.change(
        generateId(baseName, {
          randomText: randomSuffix,
          randomLength: disabledRandomSuffix ? 0 : 6,
        })
      );
    }
  }, [baseName, auto, disabledRandomSuffix]);

  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      <div className="flex items-center gap-4">
        <FieldLabel
          label={label}
          className={labelClassName}
          isError={!!field.errors}
          isRequired={required}
          tooltipInfo={
            autoGenerate
              ? undefined
              : 'Uses Kubernetes generateName to automatically create a unique resource name.'
          }
        />
        {autoGenerate && (
          <Tooltip
            message="Uses Kubernetes generateName to automatically create a unique resource name."
            open={showTooltip}>
            <div className="flex cursor-pointer items-center gap-0.5">
              <Checkbox
                className="size-3.5"
                id={field.id}
                checked={auto}
                onCheckedChange={(checked: boolean) => setAuto(checked)}
              />
              <Label
                htmlFor={field.id}
                className="text-muted-foreground ml-1 cursor-pointer text-xs">
                Auto-generate
              </Label>
              {showTooltip && <CircleHelp className="text-muted-foreground size-2.5" />}
            </div>
          </Tooltip>
        )}
      </div>
      <Field isRequired={required} description={description}>
        <Input
          {...getInputProps(field, { type: 'text' })}
          readOnly={readOnly || auto}
          key={field.id}
          ref={inputRef}
          placeholder="e.g. my-name-3sd122"
        />
      </Field>
    </div>
  );
};
