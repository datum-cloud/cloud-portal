# DNS Record Type Validation Testing

This module provides a comprehensive testing environment for DNS record validation schemas.

## Overview

The DNS Record Test Page allows developers to:

- Test all 13 DNS record types with pre-defined scenarios
- Create custom test scenarios for edge cases
- Export/import test scenarios for team sharing
- Validate forms without making API calls
- Use for Cypress component testing

## File Structure

```
app/features/edge/dns-zone/form/test/
├── README.md                      # This file
├── index.ts                       # Module exports
├── default-test-scenarios.ts      # 39 default test scenarios (3 per type)
├── preview-fields.helper.ts       # Schema-based field extraction
└── dns-record-test-card.tsx       # Individual record type card component

app/routes/test/
└── dns-record.tsx                 # Main test page

cypress/component/
└── dns-record-test-page.cy.tsx    # Comprehensive Cypress tests
```

## Usage

### Accessing the Test Page

Navigate to `/test/dns-record` in your browser to access the test page.

### Testing a Record Type

1. **Validate Default Scenario**
   - Click the "Validate" button on any card
   - View the validation status (✓ Valid or ❌ Errors)

2. **Switch Scenarios**
   - Use the dropdown to select different test scenarios
   - Each type has 3 default scenarios: valid, common use case, invalid

3. **View Details**
   - Click "Expand" to see the full form
   - Edit field values (changes are temporary)
   - Click "Validate Now" to test current form state

4. **Save Custom Scenarios**
   - Expand a card
   - Modify form values
   - Click "Save as New"
   - Enter a scenario name
   - The scenario is saved to localStorage

### Bulk Operations

- **Validate All**: Test all 13 record types at once
- **Export**: Download custom scenarios as JSON
- **Import**: Load scenarios from JSON file
- **Reset**: Clear all custom scenarios and restore defaults

## Default Test Scenarios

Each DNS record type includes 3 scenarios:

### A Record
1. **Default Valid**: Standard subdomain with valid IPv4
2. **Root Domain (@)**: Root domain configuration
3. **Invalid IP Format**: Tests IPv4 validation (256.1.1.1)

### AAAA Record
1. **Default Valid**: Standard IPv6 address
2. **Compressed IPv6**: Shortened IPv6 notation (::1)
3. **Invalid IPv6**: IPv4 address in IPv6 field

### CNAME Record
1. **Default Valid**: Standard CNAME setup
2. **Subdomain Target**: CNAME to subdomain
3. **Invalid Root (@)**: CNAME cannot point to @

### TXT Record
1. **Default Valid**: SPF record example
2. **Site Verification**: Google verification format
3. **Invalid Too Long**: Exceeds 2048 character limit

### MX Record
1. **Default Valid**: Primary mail server
2. **Backup Mail Server**: Secondary with higher priority
3. **Invalid Priority**: Exceeds 65535 limit

### SRV Record
1. **Default Valid**: HTTP service record
2. **HTTPS Service**: HTTPS on port 443
3. **Invalid Port**: Port exceeds 65535

### CAA Record
1. **Default Valid**: Let's Encrypt CA authorization
2. **Wildcard Issue**: Wildcard certificate authorization
3. **Invalid Flag**: Flag must be 0 or 128

### NS Record
1. **Default Valid**: Standard nameserver
2. **Subdomain Delegation**: NS for subdomain
3. **Invalid Domain**: Malformed domain name

### SOA Record
1. **Default Valid**: Standard SOA configuration
2. **Custom Timers**: Modified refresh/retry values
3. **Invalid Refresh**: Refresh below 1200 seconds

### PTR Record
1. **Default Valid**: IPv4 reverse DNS
2. **IPv6 Reverse**: IPv6 reverse DNS format
3. **Invalid Target**: Malformed domain

### TLSA Record
1. **Default Valid**: Standard TLSA record
2. **Full Certificate**: Full cert matching (selector 0)
3. **Invalid Hex Data**: Non-hexadecimal characters

### HTTPS Record
1. **Default Valid**: Service mode with ALPN
2. **Alias Mode**: Priority 0 (alias)
3. **Invalid Priority**: Exceeds 65535

### SVCB Record
1. **Default Valid**: Standard service binding
2. **Alias Mode**: Priority 0 configuration
3. **Invalid Target**: Malformed target domain

## Custom Scenarios

### Creating Custom Scenarios

1. Expand any record type card
2. Modify the form fields to your test case
3. Click "Save as New"
4. Enter a descriptive name
5. The scenario is now available in the dropdown

### Sharing Scenarios

**Export:**
```
1. Create custom scenarios
2. Click "Export Custom Scenarios"
3. JSON file downloads with all custom scenarios
```

**Import:**
```
1. Click "Import Scenarios"
2. Select a JSON file
3. Scenarios are merged with existing ones
4. Duplicates (by ID) are skipped
```

### JSON Format

```json
[
  {
    "id": "a-custom-1234567890",
    "name": "My Custom Test",
    "recordType": "A",
    "data": {
      "recordType": "A",
      "name": "test",
      "ttl": 300,
      "a": { "content": "1.2.3.4" }
    },
    "isDefault": false
  }
]
```

## Cypress Testing

The test page is fully covered by Cypress component tests.

### Running Tests

```bash
# Open Cypress
npm run cypress:open

# Run component tests
npm run cypress:run --component
```

### Test Coverage

- ✅ Card rendering for all 13 types
- ✅ Individual validation tests
- ✅ Bulk validation
- ✅ Scenario switching
- ✅ Custom scenario creation/deletion
- ✅ Export/import functionality
- ✅ LocalStorage persistence
- ✅ Card expansion/collapse
- ✅ Preview field display

### Data Test IDs

All components include `data-testid` attributes for testing:

```typescript
// Cards
dns-test-card-{recordType}          // e.g., dns-test-card-A
dns-test-status-{recordType}        // Status badge
dns-test-validate-{recordType}      // Validate button
dns-test-scenario-select-{recordType} // Scenario dropdown
dns-test-form-{recordType}          // Form container (when expanded)

// Bulk actions
dns-test-validate-all               // Validate all button
dns-test-export                     // Export button
dns-test-import-input               // Import file input
dns-test-reset-all                  // Reset button

// Scenario management
dns-test-scenario-name-input-{recordType} // Custom scenario name input
dns-test-validation-result-{recordType}   // Validation result display
```

## Implementation Details

### Form Integration

The test page reuses the actual `DnsRecordForm` component:

```typescript
<DnsRecordForm
  style="inline"
  mode="create"
  defaultValue={scenario.data}
  projectId="test-project-123"
  dnsZoneId="test-zone-456"
  dnsZoneName="example.com"
  onClose={() => {}}
  onSuccess={() => {}} // No-op, no API calls
  isPending={false}
/>
```

### Validation Logic

Validation uses the same Zod schemas as production:

```typescript
import { parseWithZod } from '@conform-to/zod/v4';
import { createDnsRecordSchema } from '@/resources/schemas/dns-record.schema';

const result = parseWithZod(formData, { schema: createDnsRecordSchema });
// result.status === 'success' | 'error'
// result.error contains field-level errors
```

### LocalStorage Schema

```typescript
// Key: dns-record-test-scenarios
// Value: TestScenario[]

interface TestScenario {
  id: string;              // Unique identifier
  name: string;            // Display name
  recordType: DNSRecordType; // A, AAAA, CNAME, etc.
  data: CreateDnsRecordSchema; // Form data
  isDefault: boolean;      // Cannot be deleted if true
}
```

## Benefits

### For Developers
- Quick validation testing without API setup
- Visual feedback on schema rules
- Experiment with edge cases
- Debug validation issues

### For QA/Testing
- Comprehensive test scenarios
- Export/import for test case management
- Cypress integration for automation
- No database or API dependencies

### For Documentation
- Living examples of valid/invalid data
- Schema validation rules demonstrated
- Reference for all record types

## Limitations

1. **No API Integration**: This is purely client-side validation testing
2. **No Server-Side Validation**: Tests only Zod schemas, not backend logic
3. **Form State**: Changes are not persisted to the actual form component (by design)
4. **Custom Scenarios**: Stored in localStorage, cleared on browser data reset

## Future Enhancements

Potential improvements:

- [ ] Visual diff between scenarios
- [ ] Batch scenario import/export
- [ ] Scenario tags/categories
- [ ] Validation performance metrics
- [ ] Integration with Storybook
- [ ] Screenshot comparison testing
- [ ] Accessibility testing integration

## Related Files

- [dns-record.schema.ts](../../../resources/schemas/dns-record.schema.ts) - Validation schemas
- [dns-record-form.tsx](../dns-record-form.tsx) - Form component
- [Type-specific field components](../types/) - Individual record type fields

## Support

For issues or questions:
1. Check the Cypress test file for usage examples
2. Review default scenarios for valid data formats
3. Inspect schema files for validation rules
4. Create an issue in the project repository
