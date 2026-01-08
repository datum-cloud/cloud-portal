import { Field } from '@/components/field/field';
import { InputName } from '@/components/input-name/input-name';
import { SelectAnnotations } from '@/components/select-annotations/select-annotations';
import { SelectLabels } from '@/components/select-labels/select-labels';
import { MetadataSchema } from '@/resources/base';
import { useForm, useInputControl } from '@conform-to/react';
import { useEffect, useRef } from 'react';
import { useHydrated } from 'remix-utils/use-hydrated';

export const MetadataForm = ({
  fields,
  defaultValue,
  isEdit = false,
}: {
  fields: ReturnType<typeof useForm<MetadataSchema>>[1];
  defaultValue?: MetadataSchema;
  isEdit?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isHydrated = useHydrated();
  const nameControl = useInputControl(fields.name);
  const labelsControl = useInputControl(fields.labels);
  const annotationsControl = useInputControl(fields.annotations);

  useEffect(() => {
    if (defaultValue) {
      nameControl.change(defaultValue.name);
      labelsControl.change(defaultValue.labels);
      annotationsControl.change(defaultValue.annotations);
    }
  }, [defaultValue]);

  // Focus the input when the form is hydrated
  useEffect(() => {
    isHydrated && inputRef.current?.focus();
  }, [isHydrated]);

  return (
    <div className="space-y-4">
      <InputName
        required
        description="This unique resource name will be used to identify your resource and cannot be changed."
        readOnly={isEdit}
        field={fields.name}
        autoGenerate={false}
        inputRef={isEdit ? undefined : inputRef}
      />
      <Field
        label="Labels"
        errors={fields.labels.errors}
        description="Add labels to help identify, organize, and filter your resource.">
        <SelectLabels
          defaultValue={fields.labels.value as string[]}
          onChange={(value) => {
            labelsControl.change(value);
          }}
        />
      </Field>
      <Field
        label="Annotations"
        errors={fields.annotations.errors}
        description="Add annotations to help identify, organize, and filter your resource.">
        <SelectAnnotations
          defaultValue={fields.annotations.value as string[]}
          onChange={(value) => {
            annotationsControl.change(value);
          }}
        />
      </Field>
    </div>
  );
};
