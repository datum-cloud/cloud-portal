// TODO: under development since issue with authenticity token.

// import { DNS_RECORD_TYPES } from '@/resources/schemas/dns-record.schema';
// import DnsRecordTestPage from '@/routes/test/dns-record/dns-record';

// describe('DNS Record Test Page', () => {
//   it('should render the page with title and description', () => {
//     cy.mount(<DnsRecordTestPage />);
//     cy.contains('DNS Record Type Validation Testing').should('be.visible');
//     cy.contains('Test validation for all 13 DNS record types').should('be.visible');
//     cy.contains('Test Mode').should('be.visible');
//   });

//   it('should display all 13 DNS record type cards', () => {
//     cy.mount(<DnsRecordTestPage />);

//     DNS_RECORD_TYPES.forEach((type) => {
//       cy.get(`[data-testid="dns-test-card-${type}"]`).should('exist').and('be.visible');
//     });
//   });

//   it('should show "Not tested" status initially for all cards', () => {
//     cy.mount(<DnsRecordTestPage />);

//     DNS_RECORD_TYPES.forEach((type) => {
//       cy.get(`[data-testid="dns-test-status-${type}"]`).should('contain', 'Not tested');
//     });
//   });

//   describe('Individual Card Validation', () => {
//     it('should validate A record with valid IP', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Click validate on A record card
//       cy.get('[data-testid="dns-test-validate-A"]').click();

//       // Should show valid status
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', '✓ Valid');
//       cy.get('[data-testid="dns-test-validation-result-A"]').should('contain', '✓ Valid');
//     });

//     it('should show error for invalid A record scenario', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Switch to invalid scenario
//       cy.get('[data-testid="dns-test-scenario-select-A"]').click();
//       cy.contains('Invalid IP Format').click();

//       // Validate
//       cy.get('[data-testid="dns-test-validate-A"]').click();

//       // Should show error status with error count
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', 'error');
//       cy.get('[data-testid="dns-test-validation-result-A"]').should('contain', 'Validation Error');
//     });

//     it('should validate AAAA record with valid IPv6', () => {
//       cy.mount(<DnsRecordTestPage />);

//       cy.get('[data-testid="dns-test-validate-AAAA"]').click();
//       cy.get('[data-testid="dns-test-status-AAAA"]').should('contain', '✓ Valid');
//     });

//     it('should show error for AAAA record with IPv4 address', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Switch to invalid scenario (IPv4 in IPv6 field)
//       cy.get('[data-testid="dns-test-scenario-select-AAAA"]').click();
//       cy.contains('Invalid IPv6 (IPv4)').click();

//       cy.get('[data-testid="dns-test-validate-AAAA"]').click();
//       cy.get('[data-testid="dns-test-status-AAAA"]').should('contain', 'error');
//     });

//     it('should validate CNAME record correctly', () => {
//       cy.mount(<DnsRecordTestPage />);

//       cy.get('[data-testid="dns-test-validate-CNAME"]').click();
//       cy.get('[data-testid="dns-test-status-CNAME"]').should('contain', '✓ Valid');
//     });

//     it('should show error for CNAME pointing to @', () => {
//       cy.mount(<DnsRecordTestPage />);

//       cy.get('[data-testid="dns-test-scenario-select-CNAME"]').click();
//       cy.contains('Invalid Root (@)').click();

//       cy.get('[data-testid="dns-test-validate-CNAME"]').click();
//       cy.get('[data-testid="dns-test-status-CNAME"]').should('contain', 'error');
//     });
//   });

//   describe('Validate All Functionality', () => {
//     it('should validate all record types at once', () => {
//       cy.mount(<DnsRecordTestPage />);

//       cy.get('[data-testid="dns-test-validate-all"]').click();

//       // All cards should have been validated
//       DNS_RECORD_TYPES.forEach((type) => {
//         cy.get(`[data-testid="dns-test-status-${type}"]`).should('not.contain', 'Not tested');
//       });

//       // Should show summary badge
//       cy.contains(/\d+\/\d+ Valid/).should('be.visible');
//     });

//     it('should display correct counts in summary badge', () => {
//       cy.mount(<DnsRecordTestPage />);

//       cy.get('[data-testid="dns-test-validate-all"]').click();

//       // Check that the badge shows correct total count
//       cy.contains(/\/13/).should('be.visible');
//     });
//   });

//   describe('Forms Always Visible', () => {
//     it('should always show forms for all cards', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Forms should be visible for all types
//       DNS_RECORD_TYPES.forEach((type) => {
//         cy.get(`[data-testid="dns-test-form-${type}"]`).should('be.visible');
//       });
//     });

//     it('should show validation result when validated', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Validate
//       cy.get('[data-testid="dns-test-validate-A"]').click();

//       // Should show validation result
//       cy.get('[data-testid="dns-test-validation-result-A"]').should('be.visible');
//       cy.get('[data-testid="dns-test-validation-result-A"]').should('contain', '✓ Valid');
//     });
//   });

//   describe('Scenario Management', () => {
//     it('should switch between scenarios', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Check initial scenario
//       cy.get('[data-testid="dns-test-card-A"]').should('contain', 'Default Valid');

//       // Switch scenario
//       cy.get('[data-testid="dns-test-scenario-select-A"]').click();
//       cy.contains('Root Domain (@)').click();

//       // Should show new scenario
//       cy.get('[data-testid="dns-test-card-A"]').should('contain', 'Root Domain (@)');
//     });

//     it('should auto-update form when switching scenarios', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Initial validation
//       cy.get('[data-testid="dns-test-validate-A"]').click();
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', '✓ Valid');

//       // Switch to invalid scenario
//       cy.get('[data-testid="dns-test-scenario-select-A"]').click();
//       cy.contains('Invalid IP Format').click();

//       // Validate again - should now be invalid
//       cy.get('[data-testid="dns-test-validate-A"]').click();
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', 'error');
//     });
//   });

//   describe('Current Form Values Validation (Bug Fix)', () => {
//     it('should validate current form values, not original scenario data', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Switch to invalid scenario
//       cy.get('[data-testid="dns-test-scenario-select-A"]').click();
//       cy.contains('Invalid IP Format').click();

//       // Find the A record content input and change to valid IP
//       cy.get('[data-testid="dns-test-form-A"]')
//         .find('input[name="a.content"]')
//         .clear()
//         .type('192.168.1.1');

//       // Validate - should be valid now because we changed the input
//       cy.get('[data-testid="dns-test-validate-A"]').click();
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', '✓ Valid');
//     });

//     it('should show errors when form is changed to invalid', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Start with valid scenario
//       cy.get('[data-testid="dns-test-validate-A"]').click();
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', '✓ Valid');

//       // Change to invalid IP
//       cy.get('[data-testid="dns-test-form-A"]')
//         .find('input[name="a.content"]')
//         .clear()
//         .type('999.999.999.999');

//       // Validate - should now be invalid
//       cy.get('[data-testid="dns-test-validate-A"]').click();
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', 'error');
//     });
//   });

//   describe('Form Isolation Between Record Types (Bug Fix)', () => {
//     it('should not affect A type when changing CNAME scenario', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Validate A type first
//       cy.get('[data-testid="dns-test-validate-A"]').click();
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', '✓ Valid');

//       // Change CNAME scenario
//       cy.get('[data-testid="dns-test-scenario-select-CNAME"]').click();
//       cy.contains('Invalid Root (@)').click();

//       // A type validation should still be valid (unchanged)
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', '✓ Valid');
//     });

//     it('should validate CNAME with CNAME-specific errors, not A type errors', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Switch CNAME to invalid scenario
//       cy.get('[data-testid="dns-test-scenario-select-CNAME"]').click();
//       cy.contains('Invalid Root (@)').click();

//       // Validate CNAME
//       cy.get('[data-testid="dns-test-validate-CNAME"]').click();

//       // Should show CNAME-specific error (not A type errors)
//       cy.get('[data-testid="dns-test-validation-result-CNAME"]').should('be.visible');
//       cy.get('[data-testid="dns-test-validation-result-CNAME"]').should('contain', 'cname');
//       cy.get('[data-testid="dns-test-validation-result-CNAME"]').should('not.contain', 'a.content');
//     });

//     it('should have unique form IDs for each record type', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Verify each form has a unique ID
//       DNS_RECORD_TYPES.forEach((type) => {
//         cy.get(`[data-testid="dns-test-form-${type}"]`)
//           .find('form')
//           .should('have.attr', 'id', `dns-record-form-${type}`);
//       });
//     });
//   });

//   describe('Discriminated Union Validation (Bug Fix)', () => {
//     it('should validate AAAA record without requiring A field', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Validate AAAA with default valid data
//       cy.get('[data-testid="dns-test-validate-AAAA"]').click();

//       // Should be valid without any errors about missing A field
//       cy.get('[data-testid="dns-test-status-AAAA"]').should('contain', '✓ Valid');
//       cy.get('[data-testid="dns-test-validation-result-AAAA"]').should('not.contain', 'a');
//     });

//     it('should validate CNAME record without requiring A field', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Validate CNAME with default valid data
//       cy.get('[data-testid="dns-test-validate-CNAME"]').click();

//       // Should be valid without any errors about missing A field
//       cy.get('[data-testid="dns-test-status-CNAME"]').should('contain', '✓ Valid');
//       cy.get('[data-testid="dns-test-validation-result-CNAME"]').should('not.contain', 'a');
//     });

//     it('should validate MX record with MX-specific fields only', () => {
//       cy.mount(<DnsRecordTestPage />);

//       cy.get('[data-testid="dns-test-validate-MX"]').click();
//       cy.get('[data-testid="dns-test-status-MX"]').should('contain', '✓ Valid');
//     });
//   });

//   describe('Download/Import Functionality', () => {
//     it('should download scenarios', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Click download (stub the download)
//       cy.window().then((win) => {
//         cy.stub(win, 'open').as('download');
//       });
//       cy.get('[data-testid="dns-test-download-sample"]').click();

//       // Should show success toast
//       cy.contains('Scenarios downloaded').should('be.visible');
//     });

//     it('should import scenarios and replace existing ones', () => {
//       cy.mount(<DnsRecordTestPage />);

//       const mockScenarios = [
//         {
//           id: 'imported-test-1',
//           name: 'Imported Scenario A',
//           recordType: 'A',
//           data: {
//             recordType: 'A',
//             name: 'imported',
//             ttl: 300,
//             a: { content: '1.2.3.4' },
//           },
//         },
//         {
//           id: 'imported-test-2',
//           name: 'Imported Scenario AAAA',
//           recordType: 'AAAA',
//           data: {
//             recordType: 'AAAA',
//             name: 'imported',
//             ttl: 300,
//             aaaa: { content: '2001:db8::1' },
//           },
//         },
//       ];

//       cy.get('[data-testid="dns-test-import-input"]').selectFile(
//         {
//           contents: Cypress.Buffer.from(JSON.stringify(mockScenarios)),
//           fileName: 'scenarios.json',
//           mimeType: 'application/json',
//         },
//         { force: true }
//       );

//       // Should show success toast
//       cy.contains('Imported').should('be.visible');

//       // Should replace scenarios (old ones should be gone)
//       cy.get('[data-testid="dns-test-scenario-select-A"]').click();
//       cy.contains('Default Valid').should('not.exist');
//       cy.contains('Imported Scenario A').should('exist');
//     });

//     it('should clear validation results after import', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Validate A type first
//       cy.get('[data-testid="dns-test-validate-A"]').click();
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', '✓ Valid');

//       // Import scenarios
//       const mockScenarios = [
//         {
//           id: 'imported-1',
//           name: 'Imported A',
//           recordType: 'A',
//           data: {
//             recordType: 'A',
//             name: 'test',
//             ttl: 300,
//             a: { content: '1.1.1.1' },
//           },
//         },
//       ];

//       cy.get('[data-testid="dns-test-import-input"]').selectFile(
//         {
//           contents: Cypress.Buffer.from(JSON.stringify(mockScenarios)),
//           fileName: 'scenarios.json',
//           mimeType: 'application/json',
//         },
//         { force: true }
//       );

//       // Validation status should reset to "Not tested"
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', 'Not tested');
//     });
//   });

//   describe('Reset Functionality', () => {
//     it('should reset imported scenarios to defaults', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Import custom scenarios first
//       const mockScenarios = [
//         {
//           id: 'custom-test-1',
//           name: 'Custom Scenario',
//           recordType: 'A',
//           data: {
//             recordType: 'A',
//             name: 'custom',
//             ttl: 300,
//             a: { content: '1.2.3.4' },
//           },
//         },
//       ];

//       cy.get('[data-testid="dns-test-import-input"]').selectFile(
//         {
//           contents: Cypress.Buffer.from(JSON.stringify(mockScenarios)),
//           fileName: 'scenarios.json',
//           mimeType: 'application/json',
//         },
//         { force: true }
//       );

//       // Verify custom scenario is loaded
//       cy.get('[data-testid="dns-test-card-A"]').should('contain', 'Custom Scenario');

//       // Reset
//       cy.window().then((win) => {
//         cy.stub(win, 'confirm').returns(true);
//       });
//       cy.get('[data-testid="dns-test-reset-all"]').click();

//       // Should be back to defaults
//       cy.get('[data-testid="dns-test-card-A"]').should('contain', 'Default Valid');
//       cy.get('[data-testid="dns-test-scenario-select-A"]').click();
//       cy.contains('Custom Scenario').should('not.exist');
//     });

//     it('should clear validation results after reset', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Validate A type
//       cy.get('[data-testid="dns-test-validate-A"]').click();
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', '✓ Valid');

//       // Reset
//       cy.window().then((win) => {
//         cy.stub(win, 'confirm').returns(true);
//       });
//       cy.get('[data-testid="dns-test-reset-all"]').click();

//       // Validation status should reset
//       cy.get('[data-testid="dns-test-status-A"]').should('contain', 'Not tested');
//     });
//   });

//   describe('Type Selector Disabled in Test Mode', () => {
//     it('should disable type selector in all forms', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Check that type selector is disabled for a few record types
//       ['A', 'AAAA', 'CNAME'].forEach((type) => {
//         cy.get(`[data-testid="dns-test-form-${type}"]`)
//           .find('button')
//           .first() // The Type field selector
//           .should('be.disabled');
//       });
//     });
//   });

//   describe('Error Display Format', () => {
//     it('should show error count in badge', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Switch to invalid scenario
//       cy.get('[data-testid="dns-test-scenario-select-A"]').click();
//       cy.contains('Invalid IP Format').click();

//       cy.get('[data-testid="dns-test-validate-A"]').click();

//       // Badge should show error count
//       cy.get('[data-testid="dns-test-status-A"]').should('match', /\d+ error/);
//     });

//     it('should display error details in validation result', () => {
//       cy.mount(<DnsRecordTestPage />);

//       // Switch to invalid scenario
//       cy.get('[data-testid="dns-test-scenario-select-A"]').click();
//       cy.contains('Invalid IP Format').click();

//       cy.get('[data-testid="dns-test-validate-A"]').click();

//       // Should show detailed error list
//       cy.get('[data-testid="dns-test-validation-result-A"]')
//         .find('ul li')
//         .should('have.length.at.least', 1);
//     });
//   });
// });
