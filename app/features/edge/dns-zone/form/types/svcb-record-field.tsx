import { Field } from '@/components/field/field';
import { SVCBRecordSchema } from '@/resources/schemas/dns-record.schema';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { useEffect, useState } from 'react';

export const SVCBRecordField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<SVCBRecordSchema>>[1];
  defaultValue?: SVCBRecordSchema;
}) => {
  const svcbFields = fields.svcb.getFieldset();

  // State for params string representation
  const [paramsString, setParamsString] = useState('');

  // Initialize params string from defaultValue
  useEffect(() => {
    if (defaultValue?.svcb?.params) {
      const params = defaultValue.svcb.params;
      const paramsStr = Object.entries(params)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      setParamsString(paramsStr);
    }
  }, [defaultValue]);

  if (!svcbFields) return null;

  // Parse params string into key-value object
  const parseParams = (input: string): Record<string, string> => {
    if (!input.trim()) return {};

    const params: Record<string, string> = {};
    // Match key="value" or key=value patterns
    const regex = /(\w+)=(?:"([^"]*)"|(\S+))/g;
    let match;

    while ((match = regex.exec(input)) !== null) {
      const key = match[1];
      const value = match[2] || match[3];
      params[key] = value;
    }

    return params;
  };

  return (
    <>
      <Field isRequired label="Priority" errors={svcbFields.priority.errors}>
        <Input
          {...getInputProps(svcbFields.priority, { type: 'number' })}
          key={svcbFields.priority.id}
          placeholder="1"
          min={0}
          max={65535}
        />
      </Field>

      <Field isRequired label="Target" errors={svcbFields.target.errors}>
        <Input
          {...getInputProps(svcbFields.target, { type: 'text' })}
          key={svcbFields.target.id}
          placeholder="e.g., example.com or ."
        />
      </Field>

      <Field label="Value" errors={svcbFields.params?.errors} className="col-span-2">
        <Input
          name={svcbFields.params?.name}
          key={svcbFields.params?.id}
          placeholder='E.g. alpn="h3,h2" ipv4hint="127.0.0.1" ipv6hint="::1"'
          value={paramsString}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setParamsString(value);

            // Parse and store as hidden JSON field
            const parsedParams = parseParams(value);
            const paramsInput = document.getElementById(
              `${svcbFields.params?.id}-json`
            ) as HTMLInputElement;
            if (paramsInput) {
              paramsInput.value = JSON.stringify(parsedParams);
            }
          }}
        />
        {/* Hidden field to store parsed params as JSON */}
        <input
          type="hidden"
          id={`${svcbFields.params?.id}-json`}
          name={svcbFields.params?.name}
          defaultValue="{}"
        />
      </Field>
    </>
  );
};
