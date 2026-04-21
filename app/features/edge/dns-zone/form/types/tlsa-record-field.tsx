import { Form } from '@datum-cloud/datum-ui/form';

export const TLSARecordField = () => (
  <>
    <Form.Field name="tlsa.usage" label="Usage" required>
      <Form.Input type="number" placeholder="3" min={0} max={3} />
    </Form.Field>

    <Form.Field name="tlsa.selector" label="Selector" required>
      <Form.Input type="number" placeholder="1" min={0} max={1} />
    </Form.Field>

    <Form.Field name="tlsa.matchingType" label="Matching Type" required>
      <Form.Input type="number" placeholder="1" min={0} max={2} />
    </Form.Field>

    <Form.Field
      name="tlsa.certData"
      label="Certificate Data (Hex)"
      required
      className="col-span-full">
      <Form.Textarea
        placeholder="e.g., 0EED2700D3F228FDB..."
        className="font-mono text-xs"
        rows={3}
      />
    </Form.Field>
  </>
);
