import { Form } from '@datum-cloud/datum-ui/form';

interface ProxyTlsFieldProps {
  required?: boolean;
}

export const ProxyTlsField = ({ required = false }: ProxyTlsFieldProps) => {
  return (
    <Form.Field
      name="tlsHostname"
      label="TLS Hostname"
      required={required}
      description={
        required
          ? 'The hostname to use for TLS certificate validation with your IP-based endpoint (required for SNI and certificate hostname matching)'
          : 'The hostname to use for TLS certificate validation (SNI and certificate hostname matching). Leave empty to use the hostname from the endpoint URL.'
      }>
      <Form.Input placeholder="e.g. secure.example.com" />
    </Form.Field>
  );
};
