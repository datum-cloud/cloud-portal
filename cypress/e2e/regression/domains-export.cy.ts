import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Selector Reference — Domains CSV export
 *
 * List page
 * [data-e2e="create-domain-button"]   "Add domains" button (header)
 * [data-e2e="add-domains-input"]      Domains textarea (unified add dialog)
 * [data-e2e="export-domains-button"]  "Export CSV" button (only when >= 1 domain)
 * [data-e2e="domain-name"]            Domain name text
 *
 * Export flow
 * Clicking "Export CSV" enqueues a task-queue job that builds the CSV with
 * dummy progress (~1.5–2s). On completion the task card shows a "Download CSV"
 * action (datum-ui, matched by text) which calls downloadFile() — a Blob +
 * <a download> click.
 *
 * Content correctness (headers, escaping, row mapping) is covered by the
 * component specs (csv-helper, parse-helper, domain-csv). This spec verifies
 * the UI → task → download wiring by spying on the generated Blob.
 *
 * Uses shared regression resources (1 org + 1 project per shard).
 */

describe('Domains — CSV export regression', () => {
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

  it('creates a domain so the list is non-empty', () => {
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

    cy.get('[data-e2e="add-domains-input"]').type(domainName);
    cy.get('[role="dialog"]')
      .contains('button', /add domain/i)
      .click();

    cy.url()
      .should('match', /\/domains\/[a-z0-9-]+\//)
      .then((url) => {
        const match = url.match(/\/domains\/([a-z0-9-]+)\//);
        if (match) domainId = match[1];
      });
  });

  it('exports domains to CSV via the task queue and downloads a valid file', () => {
    let capturedBlob: Blob | null = null;

    cy.visit(getPathWithParams(paths.project.detail.domains.root, { projectId }));

    // Spy on the download Blob. downloadFile() calls URL.createObjectURL(blob);
    // stubbing it lets us read exactly what the user would download without
    // touching the filesystem. Must be set up after visit (fresh window).
    cy.window().then((win) => {
      cy.stub(win.URL, 'createObjectURL').callsFake((blob: Blob) => {
        capturedBlob = blob;
        return 'blob:stubbed-export';
      });
    });

    cy.get('[data-e2e="export-domains-button"]', { timeout: 10000 }).should('be.visible').click();

    // Task card surfaces the completion action once the CSV is built.
    cy.contains('button', /download csv/i, { timeout: 15000 })
      .should('be.visible')
      .click();

    cy.then(() => {
      expect(capturedBlob, 'a CSV Blob was created for download').to.not.be.null;
      expect(capturedBlob!.type).to.contain('text/csv');
      return capturedBlob!.text();
    }).then((csv) => {
      // Header row matches the snake_case contract asserted in the unit specs.
      expect(csv).to.contain(
        'domain,registrar,dns_host,expiration_date,verification_status,resource_name'
      );
      // The domain we just created is present in the export.
      expect(csv).to.contain(domainName);
    });
  });

  after(() => {
    if (!domainId) return;
    cy.login();
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
    domainId = '';
  });
});
