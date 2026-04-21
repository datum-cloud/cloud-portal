import { Form } from '@datum-cloud/datum-ui/form';

export const SVCBRecordField = () => (
  <>
    <Form.Field name="svcb.priority" label="Priority" required>
      <Form.Input type="number" placeholder="1" min={0} max={65535} />
    </Form.Field>

    <Form.Field name="svcb.target" label="Target" required>
      <Form.Input placeholder="e.g., example.com or ." />
    </Form.Field>

    <Form.Field name="svcb.params" label="Value" className="col-span-full sm:col-span-2">
      <Form.Input placeholder='E.g. alpn="h3,h2" ipv4hint="127.0.0.1" ipv6hint="::1"' />
    </Form.Field>
  </>
);
