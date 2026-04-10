import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Selector Reference — Domains
 *
 * List page
 * [data-e2e="create-domain-button"]      "Add domain" button (header)
 * [data-e2e="domain-card"]               Domain row cell
 * [data-e2e="domain-name"]               Domain name text
 *
 * Create dialog
 * [data-e2e="create-domain-name-input"]  Domain name input
 *
 * Settings page
 * [data-e2e="delete-domain-button"]      Delete domain button
 *
 * Confirmation dialog (shared)
 * [data-e2e="confirmation-dialog-submit"] Confirm button
 * Note: showConfirmInput is false for domains — no text input required
 *
 * Uses shared regression resources (1 org + 1 project per shard).
 */

describe('Domains — regression', () => {
  const domainName = `e2e-${Date.now()}.example.com`;
  let projectId = '';
  let domainId = '';

  before(() => {
    cy.ensureSharedResources().then((res) => {
      projectId = res.projectId;
    });
  });

  beforeEach(() => {
    cy.login();
  });

  it('should create a domain and appear in the list', () => {
    cy.visit(getPathWithParams(paths.project.detail.domains.root, { projectId }));
    cy.url({ timeout: 10000 }).should('include', `project/${projectId}/domains`);
    cy.get('body', { timeout: 10000 }).then(($body) => {
      if ($body.find('[data-e2e="create-domain-button"]').length > 0) {
        cy.get('[data-e2e="create-domain-button"]').should('be.visible').click({ force: true });
      } else {
        cy.contains('button', /add domain/i, { timeout: 10000 })
          .should('be.visible')
          .click({ force: true });
      }
    });
    cy.get('[data-e2e="create-domain-name-input"]').type(domainName);
    cy.get('[role="dialog"]').contains('button', 'Add domain').click();

    // After creation the app navigates to the overview page — extract domain ID from URL
    cy.url()
      .should('match', /\/domains\/[a-z0-9-]+\//)
      .then((url) => {
        const match = url.match(/\/domains\/([a-z0-9-]+)\//);
        if (match) domainId = match[1];
      });
  });

  it('should show the domain on the list page', () => {
    cy.visit(getPathWithParams(paths.project.detail.domains.root, { projectId }));
    cy.contains('[data-e2e="domain-name"]', domainName, { timeout: 10000 }).should('be.visible');
  });

  it('should delete the domain', () => {
    cy.visit(
      getPathWithParams(paths.project.detail.domains.detail.settings, {
        projectId,
        domainId,
      })
    );
    cy.get('[data-e2e="delete-domain-button"]', { timeout: 10000 }).should('exist');
    cy.wait(500);
    cy.get('[data-e2e="delete-domain-button"]').scrollIntoView().click();
    cy.get('[data-e2e="confirmation-dialog-submit"]', { timeout: 10000 }).click();
    cy.url().should('include', `project/${projectId}/domains`);
    cy.contains('[data-e2e="domain-name"]', domainName).should('not.exist');
    domainId = '';
  });
});
