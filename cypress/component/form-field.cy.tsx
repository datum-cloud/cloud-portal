import { Field } from '@/components/field/field';
import { Input } from '@shadcn/ui/input';

describe('Form Field', () => {
  it('renders with correct label', () => {
    cy.mount(
      <Field label="Label">
        <Input type="text" />
      </Field>
    );
    cy.get('label').should('have.text', 'Label');
    cy.get('input').should('have.attr', 'type', 'text');
  });

  it('renders with correct description', () => {
    cy.mount(
      <Field label="Label" description="Description">
        <Input type="text" />
      </Field>
    );
    cy.get('p').should('have.text', 'Description');
  });

  it('renders with correct errors', () => {
    cy.mount(
      <Field label="Label" errors={['Error']}>
        <Input type="text" />
      </Field>
    );
    cy.get('ul').should('have.text', 'Error');
  });

  it('handles input value changes correctly', () => {
    cy.mount(
      <Field label="Test Field">
        <Input type="text" defaultValue="initial value" />
      </Field>
    );
    cy.get('input').should('have.value', 'initial value');

    cy.get('input').clear().type('new value');
    cy.get('input').should('have.value', 'new value');

    cy.get('input').clear();
    cy.get('input').should('have.value', '');
  });
});
