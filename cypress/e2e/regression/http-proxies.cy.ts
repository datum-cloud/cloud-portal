import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Selector Reference — AI Edge (HTTP Proxies)
 *
 * List page
 * [data-e2e="create-ai-edge-button"]        "New" button (header)
 * [data-e2e="ai-edge-card"]                 AI Edge row cell
 * [data-e2e="ai-edge-name"]                 AI Edge display name text
 *
 * Create dialog
 * [data-e2e="create-ai-edge-name-input"]    Name input (chosenName)
 * input[placeholder*="api.example.com"]     Origin endpoint input (custom component)
 *
 * Detail page
 * [data-e2e="delete-ai-edge-button"]        Delete AI Edge button (DangerCard)
 *
 * Confirmation dialog (shared)
 * [data-e2e="confirmation-dialog-input"]    Type DELETE to confirm input
 * [data-e2e="confirmation-dialog-submit"]   Confirm button
 * Note: showConfirmInput is true for AI Edge delete
 *
 * Uses shared regression resources (1 org + 1 project per shard).
 */

describe('AI Edge — regression', () => {
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

  it('should create an AI Edge and appear in the list', () => {
    cy.visit(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    cy.url({ timeout: 10000 }).should('include', `project/${projectId}/edge`);
    cy.get('body', { timeout: 10000 }).then(($body) => {
      if ($body.find('[data-e2e="create-ai-edge-button"]').length > 0) {
        cy.get('[data-e2e="create-ai-edge-button"]').should('be.visible').click();
      } else {
        cy.contains('button', /^new$/i, { timeout: 10000 }).should('be.visible').click();
      }
    });

    cy.get('[data-e2e="create-ai-edge-name-input"]').type(edgeName);
    cy.get('input[placeholder*="api.example.com"]').type('api.example.com');

    cy.contains('button', 'Create').click();

    // After creation the app navigates to the proxy detail page — extract ID from URL
    cy.url()
      .should('match', /\/edge\/[a-z0-9-]+/)
      .then((url) => {
        const match = url.match(/\/edge\/([a-z0-9-]+)/);
        if (match) proxyId = match[1];
      });
  });

  it('should show the AI Edge on the list page', () => {
    cy.visit(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    cy.contains('[data-e2e="ai-edge-name"]', edgeName, { timeout: 10000 }).should('be.visible');
  });

  it('should delete the AI Edge', () => {
    cy.visit(
      getPathWithParams(paths.project.detail.proxy.detail.root, {
        projectId,
        proxyId,
      })
    );
    cy.get('[data-e2e="delete-ai-edge-button"]', { timeout: 10000 }).should('exist');
    cy.wait(500);
    cy.get('[data-e2e="delete-ai-edge-button"]').scrollIntoView().click();
    cy.get('[data-e2e="confirmation-dialog-input"]', { timeout: 10000 }).type('DELETE');
    cy.get('[data-e2e="confirmation-dialog-submit"]').click();
    cy.url().should('include', `project/${projectId}/edge`);
    cy.contains('[data-e2e="ai-edge-name"]', edgeName).should('not.exist');
    proxyId = '';
  });
});
