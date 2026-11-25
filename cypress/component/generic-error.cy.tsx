import { GenericError } from '@/components/error/generic';
import { PERMISSION_DENIED_MESSAGE } from '@/utils/errors/authorization-message';
import { rbacDenial } from '@/utils/errors/rbac-denial.fixture';

const RAW = rbacDenial({
  verb: 'list',
  resource: 'dnsrecordsets',
  group: 'dns.networking.miloapis.com',
});
const PLAIN = PERMISSION_DENIED_MESSAGE;

describe('GenericError', () => {
  it('names the product area and shows the raw denial for a 403', () => {
    cy.mount(
      <GenericError
        message={PLAIN}
        status={403}
        error={{ status: 403, message: PLAIN, originalMessage: RAW }}
      />
    );

    cy.get('[data-e2e=error-page-title]').should('have.text', 'Permission denied to view DNS.');
    cy.contains('Error details').should('be.visible');
    cy.get('[data-e2e=error-page-message]').should('have.text', RAW);
  });

  it('keeps a long raw denial inside the card on a phone', () => {
    cy.viewport(320, 640);
    cy.mount(
      <GenericError
        message={PLAIN}
        status={403}
        error={{ status: 403, message: PLAIN, originalMessage: RAW }}
      />
    );

    cy.get('[data-e2e=error-page]').then(($card) => {
      const card = $card[0].getBoundingClientRect();
      cy.get('[data-e2e=error-page-message]').should(($box) => {
        const box = $box[0].getBoundingClientRect();
        expect(box.left, 'box left edge').to.be.at.least(card.left);
        expect(box.right, 'box right edge').to.be.at.most(card.right);
      });
    });
  });

  it('keeps the plain 403 page when there is no error body', () => {
    cy.mount(<GenericError message={PLAIN} status={403} />);

    cy.get('[data-e2e=error-page-title]').should('have.text', "You don't have access to this.");
    cy.get('[data-e2e=error-page-message]').should('have.text', PLAIN);
    cy.contains('Error details').should('not.exist');
  });

  it('leaves the 404 page as it was', () => {
    const message = "Project 'x' not found";
    cy.mount(<GenericError message={message} status={404} error={{ status: 404, message }} />);

    cy.get('[data-e2e=error-page-title]').should('have.text', "We couldn't find that page.");
    cy.get('[data-e2e=error-page-primary-action]').should('contain.text', 'Projects');
    cy.get('[data-e2e=error-page-message]').should('have.text', message);
    cy.contains('Error details').should('not.exist');
  });

  it('keeps the expired page as it was', () => {
    cy.mount(<GenericError message="Gone" status={410} />);

    cy.get('[data-e2e=error-page-title]').should('have.text', 'This page has expired.');
    cy.contains('The data you were viewing expired').should('be.visible');
    cy.contains('button', 'Reload page').should('be.visible');
  });

  it('keeps the generic error page as it was', () => {
    cy.mount(<GenericError message="boom" status={500} />);

    cy.get('[data-e2e=error-page-title]').should('have.text', 'Whoops! Something went wrong.');
    cy.contains('Something went wrong on our end.').should('be.visible');
    cy.get('[data-e2e=error-page-primary-action]').should('contain.text', 'Organization');
    cy.contains('button', 'Refresh Page').should('be.visible');
    cy.get('[data-e2e=error-page-message]').should('have.text', 'boom');
  });

  it('sends a missing organization back to the organizations list', () => {
    cy.mount(<GenericError message="Organization 'x' not found" status={404} />);

    cy.get('[data-e2e=error-page-primary-action]').should('contain.text', 'Organizations');
  });
});
