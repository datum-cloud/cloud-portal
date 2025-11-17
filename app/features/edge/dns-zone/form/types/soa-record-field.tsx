import { Field } from '@/components/field/field';
import { SOARecordSchema } from '@/resources/schemas/dns-record.schema';
import { getInputProps, useForm, useInputControl } from '@conform-to/react';
import { Input } from '@shadcn/ui/input';
import { useEffect } from 'react';

export const SOARecordField = ({
  fields,
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<SOARecordSchema>>[1];
  defaultValue?: SOARecordSchema;
}) => {
  const soaFields = fields.soa.getFieldset();
  const mnameControl = useInputControl(soaFields.mname);
  const rnameControl = useInputControl(soaFields.rname);
  const serialControl = useInputControl(soaFields.serial);
  const refreshControl = useInputControl(soaFields.refresh);
  const retryControl = useInputControl(soaFields.retry);
  const expireControl = useInputControl(soaFields.expire);
  const ttlControl = useInputControl(soaFields.ttl);

  useEffect(() => {
    if (defaultValue?.soa) {
      if (defaultValue.soa.mname && !soaFields.mname.value) {
        mnameControl.change(defaultValue.soa.mname);
      }
      if (defaultValue.soa.rname && !soaFields.rname.value) {
        rnameControl.change(defaultValue.soa.rname);
      }
      if (defaultValue.soa.serial && !soaFields.serial.value) {
        serialControl.change(defaultValue.soa.serial.toString());
      }
      if (defaultValue.soa.refresh && !soaFields.refresh.value) {
        refreshControl.change(defaultValue.soa.refresh.toString());
      }
      if (defaultValue.soa.retry && !soaFields.retry.value) {
        retryControl.change(defaultValue.soa.retry.toString());
      }
      if (defaultValue.soa.expire && !soaFields.expire.value) {
        expireControl.change(defaultValue.soa.expire.toString());
      }
      if (defaultValue.soa.ttl && !soaFields.ttl.value) {
        ttlControl.change(defaultValue.soa.ttl.toString());
      }
    }
  }, [defaultValue]);

  return (
    <div className="flex w-full flex-col gap-4">
      <Field
        isRequired
        label="Primary Nameserver (MNAME)"
        errors={soaFields.mname.errors}
        className="w-full"
        tooltipInfo="The primary authoritative nameserver for this zone">
        <Input
          {...getInputProps(soaFields.mname, { type: 'text' })}
          key={soaFields.mname.id}
          placeholder="e.g., ns1.example.com"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            mnameControl.change(e.target.value);
          }}
        />
      </Field>

      <Field
        isRequired
        label="Responsible Email (RNAME)"
        errors={soaFields.rname.errors}
        className="w-full"
        tooltipInfo="Email of the zone administrator (use dot instead of @, e.g., admin.example.com)">
        <Input
          {...getInputProps(soaFields.rname, { type: 'text' })}
          key={soaFields.rname.id}
          placeholder="e.g., admin.example.com"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            rnameControl.change(e.target.value);
          }}
        />
      </Field>

      <div className="flex gap-2">
        <Field
          label="Serial"
          errors={soaFields.serial.errors}
          className="flex-1"
          tooltipInfo="Zone file version number (auto-incremented if not specified)">
          <Input
            {...getInputProps(soaFields.serial, { type: 'number' })}
            key={soaFields.serial.id}
            placeholder="Auto"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              serialControl.change(e.target.value);
            }}
          />
        </Field>

        <Field
          label="Refresh (seconds)"
          errors={soaFields.refresh.errors}
          className="flex-1"
          tooltipInfo="Time secondary servers wait before checking for updates">
          <Input
            {...getInputProps(soaFields.refresh, { type: 'number' })}
            key={soaFields.refresh.id}
            placeholder="3600"
            min={1200}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              refreshControl.change(e.target.value);
            }}
          />
        </Field>
      </div>

      <div className="flex gap-2">
        <Field
          label="Retry (seconds)"
          errors={soaFields.retry.errors}
          className="flex-1"
          tooltipInfo="Time to wait before retrying a failed refresh">
          <Input
            {...getInputProps(soaFields.retry, { type: 'number' })}
            key={soaFields.retry.id}
            placeholder="600"
            min={600}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              retryControl.change(e.target.value);
            }}
          />
        </Field>

        <Field
          label="Expire (seconds)"
          errors={soaFields.expire.errors}
          className="flex-1"
          tooltipInfo="Time secondary servers wait before considering data stale">
          <Input
            {...getInputProps(soaFields.expire, { type: 'number' })}
            key={soaFields.expire.id}
            placeholder="604800"
            min={604800}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              expireControl.change(e.target.value);
            }}
          />
        </Field>

        <Field
          label="Minimum TTL (seconds)"
          errors={soaFields.ttl.errors}
          className="flex-1"
          tooltipInfo="Minimum time to cache negative responses">
          <Input
            {...getInputProps(soaFields.ttl, { type: 'number' })}
            key={soaFields.ttl.id}
            placeholder="3600"
            min={60}
            max={86400}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              ttlControl.change(e.target.value);
            }}
          />
        </Field>
      </div>
    </div>
  );
};
