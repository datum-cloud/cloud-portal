import { Field } from '@/components/field/field';
import { HttpProxySchema } from '@/resources/http-proxies';
import { isIPAddress } from '@/utils/helpers/validation.helper';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ChevronDownIcon } from 'lucide-react';
import { useState, useMemo } from 'react';

export const TLSForm = ({
  fields,
  endpoint,
}: {
  fields: ReturnType<typeof useForm<HttpProxySchema>>[1]['tlsHostname'];
  endpoint?: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine if TLS hostname is required
  const isTLSRequired = useMemo(() => {
    if (!endpoint) return false;
    try {
      const url = new URL(endpoint);
      const host = url.hostname;
      return url.protocol === 'https:' && isIPAddress(host);
    } catch {
      return false;
    }
  }, [endpoint]);

  // Auto-expand if TLS is required or if tlsHostname already has a value
  const shouldBeExpanded = isTLSRequired || isExpanded || !!fields.value;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-foreground hover:text-foreground/80 flex items-center gap-2 text-sm font-medium transition-colors">
        <Icon
          icon={ChevronDownIcon}
          className={`size-4 transition-transform ${shouldBeExpanded ? 'rotate-180' : ''}`}
        />
        TLS Options
      </button>

      {shouldBeExpanded && (
        <div className="flex flex-col gap-4 pl-6">
          <Field
            isRequired={isTLSRequired}
            label={<span className={isTLSRequired ? 'text-destructive' : undefined}>Hostname</span>}
            description={
              isTLSRequired
                ? 'The hostname to use for TLS certificate validation with your IP-based endpoint (required for SNI and certificate hostname matching)'
                : 'The hostname to use for TLS certificate validation (SNI and certificate hostname matching). Leave empty to use the hostname from the endpoint URL.'
            }
            errors={fields.errors}>
            <Input
              {...getInputProps(fields, { type: 'text' })}
              key={fields.id}
              placeholder="e.g. api.example.com"
            />
          </Field>
        </div>
      )}
    </div>
  );
};
