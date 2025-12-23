import { FieldLabel } from '@/components/field/field-label';
import { SubjectField } from '@/features/policy-binding/form/subject-field';
import { PolicyBindingSubjectKind } from '@/resources/interfaces/policy-binding.interface';
import {
  NewPolicyBindingSchema,
  PolicyBindingSubjectSchema,
} from '@/resources/schemas/policy-binding.schema';
import { useForm, useFormMetadata } from '@conform-to/react';
import { Button } from '@datum-ui/components';
import { IconWrapper } from '@datum-ui/components/icons/icon-wrapper';
import { cn } from '@shadcn/lib/utils';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';

const defaultSubjectValue = {
  kind: PolicyBindingSubjectKind.User,
  name: undefined,
  uid: undefined,
};

export const SubjectsForm = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<NewPolicyBindingSchema>>[1];
  defaultValue?: PolicyBindingSubjectSchema[];
}) => {
  const form = useFormMetadata('policy-binding-form');
  const subjectList = fields.subjects.getFieldList();

  useEffect(() => {
    if (defaultValue && defaultValue.length > 0) {
      form.update({
        name: fields.subjects.name,
        value: defaultValue,
      });
    }
  }, [defaultValue]);

  const selectedSubjects = useMemo(() => {
    return subjectList.map((subject) => subject.getFieldset().name.value).filter(Boolean);
  }, [subjectList]);

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel label="Subjects" />

      <div className="space-y-4">
        {subjectList.map((subject, index) => {
          const subjectFields = subject.getFieldset();
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={subject.key}>
              <SubjectField
                fields={
                  subjectFields as unknown as ReturnType<
                    typeof useForm<PolicyBindingSubjectSchema>
                  >[1]
                }
                defaultValue={defaultValue?.[index]}
                exceptItems={selectedSubjects as string[]}
              />
              {subjectList.length > 1 && (
                <Button
                  type="quaternary"
                  theme="borderless"
                  size="small"
                  className={cn('text-destructive relative top-2 w-fit')}
                  onClick={() => form.remove({ name: fields.subjects.name, index })}>
                  <IconWrapper icon={TrashIcon} className="size-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Button
        type="quaternary"
        theme="outline"
        size="small"
        className="ml-1 w-fit"
        onClick={() =>
          form.insert({
            name: fields.subjects.name,
            defaultValue: defaultSubjectValue,
          })
        }>
        <IconWrapper icon={PlusIcon} className="size-4" />
        Add
      </Button>
    </div>
  );
};
