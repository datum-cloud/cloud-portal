import { KeyValueFieldArray } from '@/features/secret/form/key-value-field-array';
import { Form } from '@datum-cloud/datum-ui/form';
import { ConformAdapter } from '@datum-cloud/datum-ui/form/adapters/conform';
import { z } from 'zod';

// The secret dialog lays Key and Value side by side. The Value column is a
// Textarea, which datum-ui renders with `field-sizing-content` — it sizes to
// what is typed. A flex item defaults to `min-width: auto`, so without
// `min-w-0` a long value grows that column and squeezes Key down to a few
// characters. This pins the two columns to equal width with a long value in
// place, which fails on the layout that shipped before.
const schema = z.object({
  variables: z.array(z.object({ key: z.string(), value: z.string() })),
});

const LONG_VALUE =
  'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function mountFieldArray() {
  cy.mount(
    <ConformAdapter>
      <div style={{ width: 640 }}>
        <Form.Root
          schema={schema}
          defaultValues={{ variables: [{ key: '', value: '' }] }}
          onSubmit={() => {}}>
          <KeyValueFieldArray />
        </Form.Root>
      </div>
    </ConformAdapter>
  );
}

describe('KeyValueFieldArray', () => {
  it('keeps the key column its full width when the value is long', () => {
    mountFieldArray();

    cy.get('input[placeholder="e.g. username"]').then(($key) => {
      const emptyWidth = $key[0].getBoundingClientRect().width;

      cy.get('textarea[placeholder="value"]').type(LONG_VALUE, { delay: 0 });

      // Same width with a 128-character value as with an empty one.
      cy.get('input[placeholder="e.g. username"]').should(($after) => {
        expect($after[0].getBoundingClientRect().width).to.be.closeTo(emptyWidth, 1);
      });
    });
  });

  it('splits the row evenly between key and value', () => {
    mountFieldArray();

    cy.get('textarea[placeholder="value"]').type(LONG_VALUE, { delay: 0 });

    cy.get('input[placeholder="e.g. username"]').then(($key) => {
      cy.get('textarea[placeholder="value"]').should(($value) => {
        const key = $key[0].getBoundingClientRect().width;
        const value = $value[0].getBoundingClientRect().width;
        expect(key).to.be.closeTo(value, 2);
      });
    });
  });
});
