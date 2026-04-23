import { Form } from '@datum-cloud/datum-ui/form';

export const SRVRecordField = () => (
  <>
    <Form.Field name="srv.target" label="Target Server" required>
      <Form.Input placeholder="e.g., server.example.com" />
    </Form.Field>

    <Form.Field name="srv.priority" label="Priority" required>
      <Form.Input type="number" placeholder="10" min={0} max={65535} />
    </Form.Field>

    <Form.Field name="srv.weight" label="Weight" required>
      <Form.Input type="number" placeholder="5" min={0} max={65535} />
    </Form.Field>

    <Form.Field name="srv.port" label="Port" required>
      <Form.Input type="number" placeholder="443" min={1} max={65535} />
    </Form.Field>
  </>
);
