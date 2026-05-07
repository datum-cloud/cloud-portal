import { Form } from '@datum-cloud/datum-ui/form';

export const HostHeaderField = () => {
  return (
    <Form.Field name="hostHeader" label="Host header">
      <Form.Input
        placeholder="e.g. localhost or api.example.internal"
        autoComplete="off"
        spellCheck={false}
        maxLength={253}
      />
    </Form.Field>
  );
};
