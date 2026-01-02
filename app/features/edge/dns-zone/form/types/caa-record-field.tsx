import { Field } from '@/components/field/field';
import { CAARecordSchema } from '@/resources/dns-records';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/ui/select';

const CAA_TAGS = [
  { value: 'issue', label: 'issue - Authorization to issue certificates' },
  { value: 'issuewild', label: 'issuewild - Authorization to issue wildcard certificates' },
  { value: 'iodef', label: 'iodef - URL for incident reporting' },
];

export const CAARecordField = ({
  fields,
}: {
  fields: ReturnType<typeof useForm<CAARecordSchema>>[1];
  defaultValue?: CAARecordSchema;
}) => {
  const caaFields = fields.caa.getFieldset();

  return (
    <>
      <Field isRequired label="Flag" errors={caaFields.flag.errors}>
        <Input
          {...getInputProps(caaFields.flag, { type: 'number' })}
          key={caaFields.flag.id}
          placeholder="0"
          min={0}
          max={255}
        />
      </Field>

      <Field isRequired label="Tag" errors={caaFields.tag.errors} className="col-span-2">
        <Select key={caaFields.tag.id} name={caaFields.tag.name} defaultValue="issue">
          <SelectTrigger>
            <SelectValue placeholder="Select tag" />
          </SelectTrigger>
          <SelectContent>
            {CAA_TAGS.map((tag) => (
              <SelectItem key={tag.value} value={tag.value}>
                {tag.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field isRequired label="Value" errors={caaFields.value.errors}>
        <Input
          {...getInputProps(caaFields.value, { type: 'text' })}
          key={caaFields.value.id}
          placeholder="e.g., letsencrypt.org"
        />
      </Field>
    </>
  );
};
