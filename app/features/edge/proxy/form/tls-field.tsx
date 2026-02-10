import { isIPAddress } from '@/utils/helpers/validation.helper';
import { Form, useWatch } from '@datum-ui/components/new-form';
import { useMemo } from 'react';

export const ProxyTlsField = () => {
  const endpoint = useWatch<string>('endpoint');

  const isTLSRequired = useMemo(() => {
    if (!endpoint) return false;
    try {
      const url = new URL(endpoint);
      return url.protocol === 'https:' && isIPAddress(url.hostname);
    } catch {
      return false;
    }
  }, [endpoint]);

  return (
    <Form.Field
      name="tlsHostname"
      label="TLS Hostname"
      required={isTLSRequired}
      description={
        isTLSRequired
          ? 'The hostname to use for TLS certificate validation with your IP-based endpoint (required for SNI and certificate hostname matching)'
          : 'The hostname to use for TLS certificate validation (SNI and certificate hostname matching). Leave empty to use the hostname from the endpoint URL.'
      }>
      <Form.Input placeholder="e.g. secure.example.com" />
    </Form.Field>
  );
};
