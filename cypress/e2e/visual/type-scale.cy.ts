import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Before/after screenshots for the type scale migration.
 *
 * Not part of any suite — the default specPattern excludes this folder. Run it
 * once per build, pointing the two runs at different folders:
 *
 *   npx cypress run --spec cypress/e2e/visual/type-scale.cy.ts \
 *     --config "specPattern=cypress/e2e/visual/**\/*.cy.ts,retries=0,video=false,\
 *   screenshotsFolder=cypress/screenshots/before"
 *
 * Restart the dev server between the two runs: the scale lives in CSS, which
 * Vite compiles once at boot.
 *
 * Desktop stays at 1280, the headless browser's own window width. A larger
 * viewport is scaled to fit and the capture comes back 1280 wide anyway, which
 * would make the two runs hard to compare.
 */

const WIDTHS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

/** Resolved once — each lookup navigates and races the loading skeletons. */
let orgId = '';
let projectId = '';

/** Let fonts load, data arrive and skeletons resolve before capturing. */
function settle() {
  cy.document().its('fonts.status').should('equal', 'loaded');
  cy.get('[data-slot="skeleton"]').should('not.exist');
  // Absence of skeletons is not presence of content: a route whose data is
  // still in flight renders an empty content column, and a capture of that
  // says nothing about type. Wait for the column to hold a heading.
  cy.get('body').then(($body) => {
    if ($body.find('[data-slot="sidebar-inset"]').length) {
      cy.get('[data-slot="sidebar-inset"]', { timeout: 30000 }).should(($inset) => {
        expect($inset.text().trim().length, 'content column has painted').to.be.greaterThan(80);
      });
    }
  });
  // Settling pause: the assertions above cover data and fonts, not the last
  // paint after a layout shift, and a capture taken mid-shift is useless for
  // comparing two builds.
  cy.wait(400);
}

function shoot(name: string) {
  settle();
  cy.screenshot(name, { capture: 'fullPage', overwrite: true });
}

describe('type scale', () => {
  before(() => {
    cy.login();
    // getPersonalOrgId / getProjectId allow 10s, which this environment's API
    // can exceed on a cold list. Wait for each list to paint first, so the
    // helper finds its target immediately instead of racing the skeletons.
    cy.visit(paths.account.organizations.root);
    cy.get('[data-e2e="organization-card-id-copy"]', { timeout: 60000 }).should('exist');
    cy.getPersonalOrgId().then((id) => {
      orgId = id;
      cy.visit(getPathWithParams(paths.org.detail.projects.root, { orgId: id }));
      cy.get('[data-e2e="project-card"]', { timeout: 60000 }).should('exist');
      cy.getProjectId(id).then((pid) => {
        projectId = pid;
      });
    });
  });

  beforeEach(() => {
    cy.login();
  });

  WIDTHS.forEach(({ name: size, width, height }) => {
    describe(size, () => {
      beforeEach(() => {
        cy.viewport(width, height);
      });

      it('captures the component gallery', () => {
        cy.visit('/test/demo');
        shoot(`${size}-01-demo-gallery`);
      });

      it('captures the project surfaces', () => {
        cy.visit(getPathWithParams(paths.project.detail.dnsZones.root, { projectId }));
        shoot(`${size}-02-dns-zones`);

        cy.visit(getPathWithParams(paths.project.detail.home, { projectId }));
        shoot(`${size}-03-project-home`);

        cy.visit(getPathWithParams(paths.project.detail.settings.general, { projectId }));
        shoot(`${size}-04-project-settings`);

        cy.visit(getPathWithParams(paths.project.detail.usage, { projectId }));
        shoot(`${size}-05-project-usage`);
      });

      it('captures the org surfaces', () => {
        cy.visit(getPathWithParams(paths.org.detail.projects.root, { orgId }));
        shoot(`${size}-06-org-projects`);

        cy.visit(getPathWithParams(paths.org.detail.team.root, { orgId }));
        shoot(`${size}-07-org-team`);
      });

      it('captures the account surfaces', () => {
        cy.visit(paths.account.root);
        shoot(`${size}-08-account`);
      });
    });
  });
});
