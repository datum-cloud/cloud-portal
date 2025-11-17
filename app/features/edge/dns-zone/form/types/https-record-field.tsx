import { Field } from '@/components/field/field';
import { HTTPSRecordSchema } from '@/resources/schemas/dns-record.schema';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { useEffect, useState } from 'react';

export const HTTPSRecordField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<HTTPSRecordSchema>>[1];
  defaultValue?: HTTPSRecordSchema;
}) => {
  // Always use the first (and only) item in the array
  const httpsList = fields.https.getFieldList();
  const httpsFields = httpsList[0]?.getFieldset();

  // State for params string representation
  const [paramsString, setParamsString] = useState('');

  // Initialize params string from defaultValue
  useEffect(() => {
    if (defaultValue?.https?.[0]?.params) {
      const params = defaultValue.https[0].params;
      const paramsStr = Object.entries(params)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      setParamsString(paramsStr);
    }
  }, [defaultValue]);

  if (!httpsFields) return null;

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
      <Field isRequired label="Priority" errors={httpsFields.priority.errors}>
        <Input
          {...getInputProps(httpsFields.priority, { type: 'number' })}
          key={httpsFields.priority.id}
          placeholder="1"
          min={0}
          max={65535}
        />
      </Field>

      <Field isRequired label="Target" errors={httpsFields.target.errors}>
        <Input
          {...getInputProps(httpsFields.target, { type: 'text' })}
          key={httpsFields.target.id}
          placeholder="e.g., example.com or ."
        />
      </Field>

      <Field label="Value" errors={httpsFields.params?.errors} className="col-span-2">
        <Input
          name={httpsFields.params?.name}
          key={httpsFields.params?.id}
          placeholder='e.g., alpn="h3,h2" ipv4hint="127.0.0.1" ipv6hint="::1"'
          value={paramsString}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setParamsString(value);

            // Parse and store as hidden JSON field
            const parsedParams = parseParams(value);
            const paramsInput = document.getElementById(
              `${httpsFields.params?.id}-json`
            ) as HTMLInputElement;
            if (paramsInput) {
              paramsInput.value = JSON.stringify(parsedParams);
            }
          }}
        />
        {/* Hidden field to store parsed params as JSON */}
        <input
          type="hidden"
          id={`${httpsFields.params?.id}-json`}
          name={httpsFields.params?.name}
          defaultValue="{}"
        />
      </Field>
    </>
  );
};
