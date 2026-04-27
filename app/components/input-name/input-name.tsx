import { Field } from '../field/field';
import { FieldLabel } from '@/components/field/field-label';
import { generateId, generateRandomString } from '@/utils/helpers/text.helper';
import { Checkbox } from '@datum-cloud/datum-ui/checkbox';
import { type NormalizedFieldState } from '@datum-cloud/datum-ui/form';
import { Input } from '@datum-cloud/datum-ui/input';
import { Label } from '@datum-cloud/datum-ui/label';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import { CircleHelp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface InputNameProps {
  label?: string;
  description?: string;
  readOnly?: boolean;
  required?: boolean;
  field: NormalizedFieldState;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoGenerate?: boolean;
  baseName?: string;
  className?: string;
  labelClassName?: string;
  showTooltip?: boolean;
  disabledRandomSuffix?: boolean;
  autoFocus?: boolean;
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
  autoFocus = false,
}: InputNameProps) => {
  const [auto, setAuto] = useState(autoGenerate);

  const randomSuffix = useMemo(() => generateRandomString(6), []);

  // Auto generate name when base name is provided and auto generate is enabled
  useEffect(() => {
    if (baseName && auto) {
      field.change(
        generateId(baseName, {
          randomText: randomSuffix,
          randomLength: disabledRandomSuffix ? 0 : 6,
        })
      );
    }
  }, [baseName, auto, disabledRandomSuffix]);

  const hasErrors = field.errors && field.errors.length > 0;
  const inputProps = (field.inputProps ?? {}) as Record<string, unknown>;

  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      <div className="flex items-center gap-5">
        <FieldLabel
          label={label}
          className={cn('text-xs font-semibold', labelClassName)}
          isError={hasErrors}
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
            hidden={!showTooltip}>
            <div className="flex cursor-pointer items-center gap-0.5">
              <Checkbox
                className="size-3.5"
                id={field.id}
                checked={auto}
                onCheckedChange={(checked: boolean) => setAuto(checked)}
              />
              <Label
                htmlFor={field.id}
                className="text-foreground ml-1 cursor-pointer text-xs font-normal">
                Auto-generate
              </Label>
              {showTooltip && <CircleHelp className="text-muted-foreground size-2.5" />}
            </div>
          </Tooltip>
        )}
      </div>
      <Field isRequired={required} description={description}>
        <Input
          type="text"
          {...inputProps}
          id={field.id}
          name={field.name}
          value={(field.value ?? '') as string}
          onChange={(e) => field.change(e.target.value)}
          onBlur={() => field.blur()}
          readOnly={readOnly || auto}
          key={field.id}
          ref={inputRef}
          autoFocus={autoFocus}
          placeholder="e.g. my-name-3sd122"
        />
      </Field>
    </div>
  );
};
