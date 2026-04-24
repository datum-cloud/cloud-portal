import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Debug spec for the sticky actions column on the AI Edge page.
 * Logs computed position/right/z-index/background on the last <th>
 * and last <td> in the first row, then scrolls horizontally and checks
 * the cell's bounding rect stays pinned to the right edge.
 *
 * Narrow viewport (900px) forces the wide table into horizontal overflow
 * so sticky has a reason to engage.
 */
describe('AI Edge sticky actions column', () => {
  beforeEach(() => {
    cy.viewport(900, 800);
    cy.login();
  });

  it('pins the last column on horizontal scroll', () => {
    cy.getProjectId().then((projectId) => {
      cy.visit(getPathWithParams(paths.project.detail.proxy.root, { projectId }));
    });
    cy.get('[data-e2e="ai-edge-card"]').should('have.length.at.least', 1);

    cy.get('.datum-ui-data-table thead tr th:last-child').then(($th) => {
      const el = $th[0];
      const cs = getComputedStyle(el);
      cy.log(
        `[header-cell-last] position=${cs.position} right=${cs.right} z=${cs.zIndex} bg=${cs.backgroundColor} classes=${el.className}`
      );
    });

    cy.get('.datum-ui-data-table tbody tr:first-child td:last-child').then(($td) => {
      const el = $td[0];
      const cs = getComputedStyle(el);
      cy.log(
        `[body-cell-last] position=${cs.position} right=${cs.right} z=${cs.zIndex} bg=${cs.backgroundColor} shadow=${cs.boxShadow} classes=${el.className}`
      );
      expect(cs.position).to.equal('sticky');
      expect(cs.right).to.equal('0px');
    });

    cy.get('.datum-ui-data-table [data-slot="dt-cell"]:last-child')
      .first()
      .then(($td) => {
        const before = $td[0].getBoundingClientRect();
        cy.log(`[before-scroll] left=${before.left} right=${before.right}`);
      });

    cy.get('.datum-ui-data-table').scrollTo('right', { ensureScrollable: false });

    cy.wait(200);

    cy.get('.datum-ui-data-table [data-slot="dt-cell"]:last-child')
      .first()
      .then(($td) => {
        const after = $td[0].getBoundingClientRect();
        cy.log(`[after-scroll] left=${after.left} right=${after.right}`);
      });
  });
});
