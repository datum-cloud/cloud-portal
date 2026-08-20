import { Form } from '@datum-cloud/datum-ui/form';

interface ProxyTlsFieldProps {
  required?: boolean;
}

export const ProxyTlsField = ({ required = false }: ProxyTlsFieldProps) => {
  return (
    <Form.Field
      name="tlsHostname"
      label="TLS Hostname (advanced)"
      required={required}
      description={
        required
          ? 'For certificate matching only — this does not add a hostname. Required for SNI and certificate hostname matching with your IP-based endpoint. Add your domain under Hostnames above.'
          : 'For certificate matching only — this does not add a hostname. Used for SNI and certificate hostname matching. Leave empty to use the hostname from the endpoint URL. Add your domain under Hostnames above.'
      }>
      <Form.Input
        placeholder="e.g. secure.example.com"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
    </Form.Field>
  );
};
