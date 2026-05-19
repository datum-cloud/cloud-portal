import { Form } from '@datum-cloud/datum-ui/form';

export const HostHeaderField = () => {
  return (
    <Form.Field name="hostHeader" label="Host header">
      <Form.Input
        placeholder="e.g. inference.example.com or api.internal"
        autoComplete="off"
        spellCheck={false}
        maxLength={253}
      />
    </Form.Field>
  );
};
