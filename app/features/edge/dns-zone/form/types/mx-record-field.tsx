import { Form } from '@datum-cloud/datum-ui/form';

export const MXRecordField = () => (
  <>
    <Form.Field name="mx.exchange" label="Mail Server" required>
      <Form.Input placeholder="e.g., mail.example.com" />
    </Form.Field>

    <Form.Field name="mx.preference" label="Priority" required>
      <Form.Input type="number" placeholder="10" min={0} max={65535} />
    </Form.Field>
  </>
);
