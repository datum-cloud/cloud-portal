/**
 * Selector Reference — Secrets
 *
 * List page
 * [data-e2e="create-secret-button"]      "Add secret" button (header)
 * [data-e2e="secret-card"]               Secret row cell
 * [data-e2e="secret-name"]               Secret name text
 *
 * Create dialog
 * input[name="name"]                     Resource name input (InputName)
 * [role="combobox"]                      Type select trigger
 * [role="option"]                        Type select option
 * input[placeholder="e.g. username"]     Key input (first variable)
 * textarea[placeholder="value"]          Value input (first variable)
 *
 * Overview page (delete lives on overview, not a dedicated settings page)
 * [data-e2e="delete-secret-button"]      Delete secret button
 *
 * Confirmation dialog (shared)
 * [data-e2e="confirmation-dialog-submit"] Confirm button
 * Note: showConfirmInput is false on the overview DangerCard path
 *
 * Uses shared regression resources (1 org + 1 project per shard).
 */

// TEST: TEMPORARILY DISABLED
// describe('Secrets — regression', () => {
//   const secretName = `e2e-secret-${Date.now()}`;
//   let projectId = '';
//   let secretId = '';

//   before(() => {
//     cy.ensureSharedResources().then((res) => {
//       projectId = res.projectId;
//     });
//   });

//   beforeEach(() => {
//     cy.login();
//   });

//   it('should create a secret and appear in the list', () => {
//     cy.visit(getPathWithParams(paths.project.detail.secrets.root, { projectId }));
//     cy.url({ timeout: 10000 }).should('include', `project/${projectId}/secrets`);
//     cy.get('body', { timeout: 10000 }).then(($body) => {
//       if ($body.find('[data-e2e="create-secret-button"]').length > 0) {
//         cy.get('[data-e2e="create-secret-button"]').should('be.visible').click();
//       } else {
//         cy.contains('button', /add secret/i, { timeout: 10000 })
//           .should('be.visible')
//           .click();
//       }
//     });

//     // Resource name — InputName renders a plain input with name="name"
//     cy.get('input[name="name"]').type(secretName);

//     // Type — Form.Select is a Radix combobox; open then pick the first option (Opaque)
//     cy.get('[role="combobox"]').first().click();
//     cy.get('[role="option"]').first().click();

//     // Variables — the form pre-populates one empty key/value row
//     cy.get('input[placeholder="e.g. username"]').first().type('api_key');
//     cy.get('textarea[placeholder="value"]').first().type('secret-value');

//     cy.contains('button', 'Create').click();

//     // After creation the app navigates to the secret detail root — extract ID from URL
//     cy.url()
//       .should('match', /\/secrets\/[a-z0-9-]+/)
//       .then((url) => {
//         const match = url.match(/\/secrets\/([a-z0-9-]+)/);
//         if (match) secretId = match[1];
//       });
//   });

//   it('should show the secret on the list page', () => {
//     cy.visit(getPathWithParams(paths.project.detail.secrets.root, { projectId }));
//     cy.contains('[data-e2e="secret-name"]', secretName, { timeout: 10000 }).should('be.visible');
//   });

//   it('should delete the secret', () => {
//     cy.visit(
//       getPathWithParams(paths.project.detail.secrets.detail.overview, {
//         projectId,
//         secretId,
//       })
//     );
//     cy.get('[data-e2e="delete-secret-button"]', { timeout: 10000 }).should('exist');
//     cy.wait(1000);
//     cy.get('[data-e2e="delete-secret-button"]')
//       .scrollIntoView()
//       .should('be.visible')
//       .click({ force: true });
//     cy.get('[data-e2e="confirmation-dialog-submit"]', { timeout: 10000 }).click();
//     cy.url().should('include', `project/${projectId}/secrets`);
//     cy.contains('[data-e2e="secret-name"]', secretName).should('not.exist');
//     secretId = '';
//   });
// });
