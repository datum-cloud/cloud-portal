import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Selector Reference — Application Load Balancer (HTTP Proxies)
 *
 * List page
 * [data-e2e="create-alb-button"]        "New" button (header)
 * [data-e2e="alb-card"]                 Application Load Balancer row cell
 * [data-e2e="alb-name"]                 Application Load Balancer display name text
 *
 * Create dialog
 * [data-e2e="create-alb-name-input"]    Name input (chosenName)
 * input[placeholder*="api.example.com"]     Origin endpoint input (custom component)
 *
 * Detail page
 * [data-e2e="delete-alb-button"]        Delete Application Load Balancer button (DangerCard)
 *
 * Confirmation dialog (shared)
 * [data-e2e="confirmation-dialog-input"]    Type DELETE to confirm input
 * [data-e2e="confirmation-dialog-submit"]   Confirm button
 * Note: showConfirmInput is true for Application Load Balancer delete
 *
 * Uses shared regression resources (1 org + 1 project per shard).
 * Org + project are deleted automatically when the Cypress run finishes (`after:run`).
 */

describe('Application Load Balancer — regression', () => {
  const edgeName = `e2e-edge-${Date.now()}`;
  let projectId = '';
  let proxyId = '';

  before(() => {
    cy.ensureSharedResources().then((res) => {
      projectId = res.projectId;
    });
  });

  beforeEach(() => {
    cy.login();
  });

  it('should create an Application Load Balancer and appear in the list', () => {
    cy.visit(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    cy.url({ timeout: 10000 }).should('include', `project/${projectId}/alb`);
    // On an empty list the Table hides the toolbar actions (incl. the header
    // create button) and surfaces only the empty-state CTA. Click whichever
    // create affordance is present and wait for it to be ENABLED first — the
    // create-permission check renders the action disabled (with a tooltip)
    // until it resolves, and clicking it while disabled opens no dialog.
    cy.get('body', { timeout: 15000 }).then(($body) => {
      if ($body.find('[data-e2e="create-alb-button"]').length > 0) {
        cy.get('[data-e2e="create-alb-button"]', { timeout: 15000 })
          .should('be.visible')
          .and('not.be.disabled')
          .click();
      } else {
        cy.contains('button', /^new$/i, { timeout: 15000 })
          .should('be.visible')
          .and('not.be.disabled')
          .click();
      }
    });

    cy.get('[data-e2e="create-alb-name-input"]').type(edgeName);
    cy.get('input[placeholder*="api.example.com"]').type('api.example.com');

    cy.contains('button', 'Create').click();

    // After creation the app navigates to the proxy detail page — extract ID from URL
    cy.url()
      .should('match', /\/alb\/[a-z0-9-]+/)
      .then((url) => {
        const match = url.match(/\/alb\/([a-z0-9-]+)/);
        if (match) proxyId = match[1];
      });
  });

  it('should show the Application Load Balancer on the list page', () => {
    cy.visit(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    cy.contains('[data-e2e="alb-name"]', edgeName, { timeout: 10000 }).should('be.visible');
  });

  it('should delete the Application Load Balancer', () => {
    cy.visit(
      getPathWithParams(paths.project.detail.proxy.detail.root, {
        projectId,
        proxyId,
      })
    );
    cy.get('[data-e2e="delete-alb-button"]', { timeout: 10000 }).should('exist');
    cy.wait(500);
    cy.get('[data-e2e="delete-alb-button"]').scrollIntoView().click();
    cy.get('[data-e2e="confirmation-dialog-input"]', { timeout: 10000 }).type('DELETE');
    cy.get('[data-e2e="confirmation-dialog-submit"]').click();
    cy.url().should('include', `project/${projectId}/alb`);
    cy.contains('[data-e2e="alb-name"]', edgeName).should('not.exist');
    proxyId = '';
  });
});
