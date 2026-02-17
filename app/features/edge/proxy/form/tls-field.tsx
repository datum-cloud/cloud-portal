import { isIPAddress } from '@/utils/helpers/validation.helper';
import { Form, useWatch } from '@datum-ui/components/new-form';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shadcn/ui/collapsible';
import { ChevronDownIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

export const ProxyTlsField = () => {
  const endpoint = useWatch<string>('endpoint');
  const tlsHostname = useWatch<string>('tlsHostname');
  const [isExpanded, setIsExpanded] = useState(false);

  const isTLSRequired = useMemo(() => {
    if (!endpoint) return false;
    try {
      const url = new URL(endpoint);
      return url.protocol === 'https:' && isIPAddress(url.hostname);
    } catch {
      return false;
    }
  }, [endpoint]);

  const shouldBeExpanded = useMemo(() => {
    return isTLSRequired || isExpanded || !!tlsHostname;
  }, [isTLSRequired, isExpanded, tlsHostname]);

  return (
    <Collapsible open={shouldBeExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="text-foreground hover:text-foreground/80 flex items-center gap-2 text-sm font-medium transition-colors [&[data-state=open]>svg]:rotate-180">
        <ChevronDownIcon className="size-4 transition-transform duration-200" />
        TLS Options
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 flex flex-col gap-4 pl-6">
        <Form.Field
          name="tlsHostname"
          label="Hostname"
          required={isTLSRequired}
          description={
            isTLSRequired
              ? 'The hostname to use for TLS certificate validation with your IP-based endpoint (required for SNI and certificate hostname matching)'
              : 'The hostname to use for TLS certificate validation (SNI and certificate hostname matching). Leave empty to use the hostname from the endpoint URL.'
          }>
          <Form.Input placeholder="e.g. api.example.com" />
        </Form.Field>
      </CollapsibleContent>
    </Collapsible>
  );
};
