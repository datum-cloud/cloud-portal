import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Selector Reference — Domains
 *
 * List page
 * [data-e2e="create-domain-button"]      "Add domains" button (header)
 * [data-e2e="export-domains-button"]     "Export CSV" button (only when >= 1 domain)
 * [data-e2e="domain-card"]               Domain row cell
 * [data-e2e="domain-name"]               Domain name text
 *
 * Add dialog (unified single + bulk)
 * [data-e2e="add-domains-input"]         Domains textarea (one or many)
 *
 * Duplicate notice (single add, domain already in a sibling project of the org)
 * [data-e2e="add-domains-duplicate-notice"] Notice wrapper
 * [data-e2e="add-domains-open-existing"]    "Open in <project>" / per-row "Open"
 * [data-e2e="add-domains-add-anyway"]       "Add here anyway"
 * [data-e2e="add-domains-cancel"]           "Cancel"
 *
 * Export flow
 * "Export CSV" enqueues a task-queue job that builds the CSV with dummy
 * progress (~1.5–2s); on completion the task card shows a "Download CSV"
 * action (datum-ui, matched by text) which calls downloadFile() — a Blob +
 * <a download> click. CSV content (headers, escaping, row mapping) is covered
 * by the component specs; here we only verify the UI → task → download wiring.
 *
 * Settings page
 * [data-e2e="delete-domain-button"]      Delete domain button
 *
 * Confirmation dialog (shared)
 * [data-e2e="confirmation-dialog-submit"] Confirm button
 * Note: showConfirmInput is false for domains — no text input required
 *
 * Uses shared regression resources (1 org + 1 project per shard).
 * Org + project are deleted automatically when the Cypress run finishes (`after:run`).
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
    // On an empty list the Table hides the toolbar actions (incl. the header
    // create button) and surfaces only the empty-state CTA. Click whichever
    // create affordance is present and wait for it to be ENABLED first — the
    // create-permission check renders the action disabled (with a tooltip)
    // until it resolves, and clicking it while disabled opens no dialog.
    cy.get('body', { timeout: 15000 }).then(($body) => {
      if ($body.find('[data-e2e="create-domain-button"]').length > 0) {
        cy.get('[data-e2e="create-domain-button"]', { timeout: 15000 })
          .should('be.visible')
          .and('not.be.disabled')
          .click();
      } else {
        cy.contains('button', /add domains/i, { timeout: 15000 })
          .should('be.visible')
          .and('not.be.disabled')
          .click();
      }
    });
    cy.get('[data-e2e="add-domains-input"]').type(domainName);

    submitAddDomainAndExpectSuccess();

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

  it('should export the domains to a CSV file', () => {
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
      // The domain created above is present in the export.
      expect(csv).to.contain(domainName);
    });
  });

  // No retries: this test removes the resource the earlier tests set up, and
  // cypress replays only the failed test, never before(). A second attempt
  // would look for something the first attempt already deleted and report a
  // missing element instead of the assertion that actually failed.
  it('should delete the domain', { retries: 0 }, () => {
    cy.visit(
      getPathWithParams(paths.project.detail.domains.detail.overview, {
        projectId,
        domainId,
      })
    );
    cy.get('[data-e2e="delete-domain-button"]', { timeout: 10000 }).should('exist');
    cy.wait(500);
    cy.get('[data-e2e="delete-domain-button"]').click();
    cy.get('[data-e2e="confirmation-dialog-submit"]', { timeout: 10000 }).click();
    cy.url().should('include', `project/${projectId}/domains`);
    cy.contains('[data-e2e="domain-name"]', domainName).should('not.exist');
    domainId = '';
  });
});

const SIBLING_ID = 'e2e-sibling';
const SIBLING_NAME = 'E2E Sibling';
const SIBLING_DOMAIN_ID = 'e2e-sibling-domain';

/**
 * The shared fixture is one org + one project, so the sibling project and its
 * domain are stubbed. The lookup lists the org's projects, then each sibling's
 * domains, both from the browser.
 */
function stubSibling(dupDomain: string, domainsReply: 'verified' | 'error'): void {
  // toProject reads the display name from this annotation (see project.adapter.ts).
  const siblingProject = {
    metadata: {
      name: SIBLING_ID,
      uid: SIBLING_ID,
      annotations: { 'kubernetes.io/display-name': SIBLING_NAME },
    },
    spec: { ownerRef: { name: 'e2e-org' } },
    status: { conditions: [{ type: 'Ready', status: 'True' }] },
  };

  cy.intercept('GET', '**/organizations/*/control-plane/**/projects*', (req) => {
    req.continue((res) => {
      res.body.items = [...(res.body.items ?? []), siblingProject];
    });
  });

  cy.intercept('GET', `**/projects/${SIBLING_ID}/control-plane/**/domains*`, (req) => {
    if (domainsReply === 'error') {
      req.reply({ statusCode: 500, body: { message: 'boom' } });
      return;
    }
    req.reply({
      statusCode: 200,
      body: {
        apiVersion: 'networking.datumapis.com/v1alpha',
        kind: 'DomainList',
        metadata: {},
        items: [
          {
            metadata: {
              name: SIBLING_DOMAIN_ID,
              uid: SIBLING_DOMAIN_ID,
              namespace: 'default',
              creationTimestamp: '2026-01-01T00:00:00Z',
            },
            spec: { domainName: dupDomain },
            status: { conditions: [{ type: 'Ready', status: 'True' }] },
          },
        ],
      },
    });
  });
}

function openAddDomainsDialog(projectId: string): void {
  cy.visit(getPathWithParams(paths.project.detail.domains.root, { projectId }));
  cy.get('body', { timeout: 15000 }).then(($body) => {
    if ($body.find('[data-e2e="create-domain-button"]').length > 0) {
      cy.get('[data-e2e="create-domain-button"]', { timeout: 15000 })
        .should('be.visible')
        .and('not.be.disabled')
        .click();
    } else {
      cy.contains('button', /add domains/i, { timeout: 15000 })
        .should('be.visible')
        .and('not.be.disabled')
        .click();
    }
  });
}

function submitAddDomain(): void {
  cy.get('[role="dialog"]')
    .contains('button', /add domain/i)
    .click();
}

describe('Domains — duplicate warning', () => {
  const dupDomain = `e2e-dup-${Date.now()}.example.com`;
  let projectId = '';
  const createdDomainIds: string[] = [];

  before(() => {
    cy.ensureSharedResources().then((res) => {
      projectId = res.projectId;
    });
  });

  beforeEach(() => {
    cy.login();
    cy.intercept('POST', '**/control-plane/**/domains').as('createDomain');
  });

  // Keep the shared project reusable: remove any domain a test created.
  afterEach(() => {
    createdDomainIds.splice(0).forEach((domainId) => {
      cy.visit(
        getPathWithParams(paths.project.detail.domains.detail.overview, { projectId, domainId })
      );
      cy.get('[data-e2e="delete-domain-button"]', { timeout: 10000 }).should('exist');
      cy.wait(500);
      cy.get('[data-e2e="delete-domain-button"]').click();
      cy.get('[data-e2e="confirmation-dialog-submit"]', { timeout: 10000 }).click();
      cy.url().should('include', `project/${projectId}/domains`);
    });
  });

  const rememberCreatedDomain = () =>
    cy.url().then((url) => {
      const match = url.match(/\/domains\/([a-z0-9-]+)\//);
      if (match) createdDomainIds.push(match[1]);
    });

  it('warns when the domain already exists in another project and does not create it', () => {
    stubSibling(dupDomain, 'verified');
    openAddDomainsDialog(projectId);
    cy.get('[data-e2e="add-domains-input"]').type(dupDomain);
    submitAddDomain();

    cy.get('[data-e2e="add-domains-duplicate-notice"]', { timeout: 15000 })
      .should('be.visible')
      .and('contain.text', SIBLING_NAME)
      .and('contain.text', "It's verified there");
    cy.get('@createDomain.all').should('have.length', 0);
  });

  it('opens the existing domain in the other project', () => {
    stubSibling(dupDomain, 'verified');
    openAddDomainsDialog(projectId);
    cy.get('[data-e2e="add-domains-input"]').type(dupDomain);
    submitAddDomain();

    cy.get('[data-e2e="add-domains-open-existing"]', { timeout: 15000 }).first().click();
    cy.url().should('include', `/project/${SIBLING_ID}/domains/`);
  });

  it('adds the domain anyway when asked', () => {
    stubSibling(dupDomain, 'verified');
    openAddDomainsDialog(projectId);
    cy.get('[data-e2e="add-domains-input"]').type(dupDomain);
    submitAddDomain();

    cy.get('[data-e2e="add-domains-add-anyway"]', { timeout: 15000 }).click();
    cy.wait('@createDomain', { timeout: 30_000 });
    cy.url().should('include', `/project/${projectId}/domains/`);
    rememberCreatedDomain();
  });

  it('creates straight through when the lookup fails', () => {
    stubSibling(dupDomain, 'error');
    openAddDomainsDialog(projectId);
    cy.get('[data-e2e="add-domains-input"]').type(`e2e-fresh-${Date.now()}.example.com`);
    submitAddDomain();

    cy.wait('@createDomain', { timeout: 30_000 });
    cy.get('[data-e2e="add-domains-duplicate-notice"]').should('not.exist');
    cy.url().should('match', /\/domains\/[a-z0-9-]+\//);
    rememberCreatedDomain();
  });
});

const MAX_QUOTA_RETRIES = 3;
const QUOTA_RETRY_WAIT_MS = 20_000;

/**
 * Submit the "Add domains" dialog and assert success. Retries on a 403 whose
 * body mentions quota.
 *
 * A project's networking ResourceGrant (covers domains, httpproxies, etc.)
 * is supposed to be provisioned automatically when the project is created.
 * That provisioning has been observed missing entirely for e2e-created
 * projects, not merely delayed — this retry is a mitigation and a
 * diagnostic improvement, not a confirmed fix. If the grant never arrives,
 * this still fails, but with a specific error instead of the confusing
 * downstream timeouts the other three specs in this file produced when
 * domain creation failed silently.
 */
function submitAddDomainAndExpectSuccess(attempt = 1): void {
  cy.intercept('POST', '**/control-plane/**/domains').as(`createDomainReq${attempt}`);
  cy.get('[role="dialog"]')
    .contains('button', /add domain/i)
    .click();
  cy.wait(`@createDomainReq${attempt}`, { timeout: 30_000 }).then((intercept) => {
    const status = intercept.response?.statusCode;
    if (status === 200 || status === 201) return;

    const isQuotaError =
      status === 403 &&
      JSON.stringify(intercept.response?.body ?? '')
        .toLowerCase()
        .includes('quota');

    if (!isQuotaError) {
      throw new Error(`should create a domain: POST failed with ${status}`);
    }

    if (attempt >= MAX_QUOTA_RETRIES) {
      throw new Error(
        `should create a domain: still hitting quota after ${MAX_QUOTA_RETRIES} attempts — ` +
          `the project's networking ResourceGrant likely never provisioned, not just delayed`
      );
    }

    cy.log(
      `should create a domain: got 403 quota error — waiting ${QUOTA_RETRY_WAIT_MS / 1000}s for grant provisioning, then retrying (attempt ${attempt + 1}/${MAX_QUOTA_RETRIES})`
    );
    cy.wait(QUOTA_RETRY_WAIT_MS, { log: false });
    // Dialog stays open with the domain name still filled in on error (see
    // add-domains-dialog.tsx's catch block) — just resubmit, no re-typing.
    submitAddDomainAndExpectSuccess(attempt + 1);
  });
}
