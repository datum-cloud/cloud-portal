import { Field } from '@/components/field/field';
import { HttpProxySchema } from '@/resources/http-proxies';
import { isIPAddress } from '@/utils/helpers/validation.helper';
import { getInputProps, useForm } from '@conform-to/react';
import { Input } from '@datum-ui/components';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shadcn/ui/collapsible';
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
  const shouldBeExpanded = useMemo(() => {
    return isTLSRequired || isExpanded || !!fields.value;
  }, [isTLSRequired, isExpanded, fields.value]);

  return (
    <Collapsible open={shouldBeExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="text-foreground hover:text-foreground/80 flex items-center gap-2 text-sm font-medium transition-colors [&[data-state=open]>svg]:rotate-180">
        <ChevronDownIcon className="size-4 transition-transform duration-200" />
        TLS Options
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 flex flex-col gap-4 pl-6">
        <Field
          isRequired={isTLSRequired}
          label="Hostname"
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
      </CollapsibleContent>
    </Collapsible>
  );
};
