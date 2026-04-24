import { Form } from '@datum-cloud/datum-ui/form';

export const SOARecordField = () => (
  <>
    <Form.Field name="soa.mname" label="Primary Nameserver (MNAME)" required>
      <Form.Input placeholder="e.g., ns1.example.com" />
    </Form.Field>

    <Form.Field name="soa.rname" label="Responsible Email (RNAME)" required>
      <Form.Input placeholder="e.g., admin.example.com" />
    </Form.Field>

    <Form.Field name="soa.serial" label="Serial">
      <Form.Input type="number" placeholder="Auto" />
    </Form.Field>

    <Form.Field name="soa.refresh" label="Refresh (seconds)">
      <Form.Input type="number" placeholder="3600" min={1200} />
    </Form.Field>

    <Form.Field name="soa.retry" label="Retry (seconds)">
      <Form.Input type="number" placeholder="600" min={600} />
    </Form.Field>

    <Form.Field name="soa.expire" label="Expire (seconds)">
      <Form.Input type="number" placeholder="604800" min={604800} />
    </Form.Field>

    <Form.Field name="soa.ttl" label="Minimum TTL (seconds)">
      <Form.Input type="number" placeholder="3600" min={60} max={86400} />
    </Form.Field>
  </>
);
