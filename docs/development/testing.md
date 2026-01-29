# Testing

This document covers the testing strategy, tools, and patterns used in the Cloud Portal.

---

## Overview

We use **Cypress** for both end-to-end (E2E) and component testing.

| Test Type       | Purpose                    | Location             |
| --------------- | -------------------------- | -------------------- |
| E2E Tests       | Full user flows            | `cypress/e2e/`       |
| Component Tests | Isolated component testing | `cypress/component/` |

---

## Running Tests

### Quick Reference

```bash
# E2E Tests
bun run test:e2e          # Run E2E tests (starts dev server)
bun run test:e2e:prod     # Run E2E tests (production build)
bun run test:e2e:debug    # Interactive E2E debugging

# Component Tests
bun run test:unit:prod    # Run component tests headless
bun run test:unit:debug   # Interactive component testing

# Cypress UI
bun run cypress:open      # Open Cypress interactive UI
bun run cypress:run       # Run all tests headless
```

### Test Modes

#### Development Mode

```bash
bun run test:e2e
```

- Starts dev server automatically
- Uses `start-server-and-test`
- Waits for `/_healthz` before running tests

#### Production Mode

```bash
bun run test:e2e:prod
```

- Builds and runs production server
- More realistic testing environment
- Used in CI/CD

#### Interactive Mode

```bash
bun run cypress:open
```

- Opens Cypress UI
- Watch mode for development
- Time-travel debugging

---

## Test Structure

```
cypress/
├── e2e/                    # End-to-end tests
│   ├── auth.cy.ts          # Authentication flows
│   ├── organizations.cy.ts # Organization management
│   ├── dns-zones.cy.ts     # DNS zone operations
│   └── ...
├── component/              # Component tests
│   ├── Badge.cy.tsx
│   ├── DataTable.cy.tsx
│   └── ...
├── fixtures/               # Test data
│   ├── organizations.json
│   └── users.json
├── support/
│   ├── commands.ts         # Custom Cypress commands
│   ├── e2e.ts              # E2E test setup
│   └── component.ts        # Component test setup
└── cypress.config.ts       # Configuration
```

---

## Writing E2E Tests

### Basic Test Structure

```typescript
// cypress/e2e/organizations.cy.ts
describe('Organizations', () => {
  beforeEach(() => {
    // Login before each test
    cy.login();
  });

  it('displays organization list', () => {
    cy.visit('/organizations');

    // Wait for data to load
    cy.get('[data-testid="org-table"]').should('exist');

    // Verify content
    cy.contains('My Organization').should('be.visible');
  });

  it('creates a new organization', () => {
    cy.visit('/organizations');

    // Click create button
    cy.get('[data-testid="create-org-btn"]').click();

    // Fill form
    cy.get('input[name="name"]').type('new-org');
    cy.get('input[name="displayName"]').type('New Organization');

    // Submit
    cy.get('button[type="submit"]').click();

    // Verify success
    cy.contains('Organization created').should('be.visible');
    cy.url().should('include', '/organizations/');
  });
});
```

### Custom Commands

```typescript
// cypress/support/commands.ts

// Login command
Cypress.Commands.add('login', (email?: string, password?: string) => {
  // Programmatic login to avoid UI
  cy.session('user-session', () => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: email ?? Cypress.env('TEST_USER_EMAIL'),
        password: password ?? Cypress.env('TEST_USER_PASSWORD'),
      },
    });
  });
});

// Usage
cy.login();
cy.login('admin@example.com', 'password');
```

### Data Test IDs

Use `data-testid` attributes for reliable element selection:

```tsx
// In component
<Button data-testid="create-org-btn">Create Organization</Button>;

// In test
cy.get('[data-testid="create-org-btn"]').click();
```

### Waiting for Data

```typescript
// Wait for API response
cy.intercept('GET', '/api/organizations').as('getOrgs');
cy.visit('/organizations');
cy.wait('@getOrgs');

// Wait for element
cy.get('[data-testid="org-table"]').should('exist');

// Wait for text
cy.contains('Loading').should('not.exist');
```

---

## Writing Component Tests

### Basic Component Test

```typescript
// cypress/component/Badge.cy.tsx
import { Badge } from '@datum-ui/components';

describe('Badge', () => {
  it('renders with default variant', () => {
    cy.mount(<Badge>Default</Badge>);
    cy.get('.badge').should('have.text', 'Default');
  });

  it('renders success variant', () => {
    cy.mount(<Badge variant="success">Active</Badge>);
    cy.get('.badge')
      .should('have.text', 'Active')
      .and('have.class', 'bg-green');
  });

  it('handles click events', () => {
    const onClick = cy.stub().as('onClick');

    cy.mount(<Badge onClick={onClick}>Clickable</Badge>);
    cy.get('.badge').click();
    cy.get('@onClick').should('have.been.calledOnce');
  });
});
```

### Testing with Providers

```typescript
// When component needs context
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('DataTable', () => {
  const queryClient = new QueryClient();

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('renders data', () => {
    const data = [{ id: 1, name: 'Test' }];
    const columns = [{ accessorKey: 'name', header: 'Name' }];

    cy.mount(
      <DataTable data={data} columns={columns} />,
      { wrapper }
    );

    cy.contains('Test').should('be.visible');
  });
});
```

---

## Test Fixtures

### Using Fixtures

```typescript
// cypress/fixtures/organizations.json
[
  {
    id: 'org-1',
    name: 'test-org',
    displayName: 'Test Organization',
  },
];

// In test
cy.fixture('organizations').then((orgs) => {
  cy.intercept('GET', '/api/organizations', orgs);
});
```

### Intercepting API Calls

```typescript
// Mock API responses
cy.intercept('GET', '/api/organizations', {
  statusCode: 200,
  body: [{ id: '1', name: 'Test Org' }],
}).as('getOrgs');

// Mock errors
cy.intercept('POST', '/api/organizations', {
  statusCode: 500,
  body: { error: 'Server error' },
}).as('createOrgError');

// Delay response
cy.intercept('GET', '/api/organizations', {
  statusCode: 200,
  body: [],
  delay: 2000,
});
```

---

## Best Practices

### Test Organization

```typescript
describe('Feature Name', () => {
  // Setup that runs before all tests
  before(() => {
    // One-time setup
  });

  // Setup that runs before each test
  beforeEach(() => {
    cy.login();
  });

  // Cleanup after each test
  afterEach(() => {
    // Reset state if needed
  });

  describe('Sub-feature', () => {
    it('does something specific', () => {
      // Test
    });
  });
});
```

### Assertions

```typescript
// Element assertions
cy.get('.element').should('exist');
cy.get('.element').should('not.exist');
cy.get('.element').should('be.visible');
cy.get('.element').should('be.disabled');
cy.get('.element').should('have.class', 'active');
cy.get('.element').should('have.text', 'Hello');
cy.get('.element').should('contain', 'Hello');
cy.get('.element').should('have.value', 'input value');

// URL assertions
cy.url().should('include', '/organizations');
cy.url().should('eq', 'http://localhost:3000/');

// Multiple assertions
cy.get('.element').should('be.visible').and('have.class', 'active').and('contain', 'Text');
```

### Avoid Flaky Tests

```typescript
// Bad: Fixed waits
cy.wait(5000);

// Good: Wait for specific conditions
cy.get('[data-testid="loading"]').should('not.exist');
cy.get('[data-testid="data"]').should('exist');

// Good: Wait for network
cy.intercept('GET', '/api/data').as('getData');
cy.wait('@getData');
```

---

## CI/CD Integration

Tests run automatically in GitHub Actions:

```yaml
# .github/workflows/quality-checks.yml
- name: Run E2E Tests
  run: bun run test:e2e:prod

- name: Run Component Tests
  run: bun run test:unit:prod
```

### Test Artifacts

On failure, Cypress saves:

- Screenshots: `cypress/screenshots/`
- Videos: `cypress/videos/`

---

## Troubleshooting

### Tests Timing Out

```typescript
// Increase timeout for slow operations
cy.get('[data-testid="slow-element"]', { timeout: 10000 }).should('exist');
```

### Element Not Found

```typescript
// Check if element is in viewport
cy.get('.element').scrollIntoView().should('be.visible');

// Check inside shadow DOM
cy.get('.element').shadow().find('.inner');
```

### Session Issues

```bash
# Clear Cypress cache
npx cypress cache clear

# Or clear in test
beforeEach(() => {
  cy.clearCookies();
  cy.clearLocalStorage();
});
```

---

## Related Documentation

- [Code Quality](./code-quality.md) - Linting and formatting
- [Debugging Guide](../guides/debugging-guide.md) - Troubleshooting tests
