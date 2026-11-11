import { UnsupportedRecordsAlert } from '@/features/edge/dns-records/import-export/components';

describe('UnsupportedRecordsAlert', () => {
  it('opens support from the keyboard with the Contact us button', () => {
    const onContactSupport = cy.stub().as('contact');
    cy.mount(
      <UnsupportedRecordsAlert
        unsupportedRecords={{ types: ['SSHFP', 'NAPTR'], totalRecords: 2 }}
        onContactSupport={onContactSupport}
      />
    );

    cy.contains('button', 'Contact us').should('have.attr', 'type', 'button').focus();
    cy.focused().should('have.text', 'Contact us');
    // A real key press, so the browser itself activates the button. Cypress
    // sends Enter without the character event Chrome uses to activate a
    // button, so Space stands in for it; a native <button> takes both.
    cy.press(Cypress.Keyboard.Keys.SPACE);

    cy.get('@contact').should('have.been.calledOnce');
  });
});
