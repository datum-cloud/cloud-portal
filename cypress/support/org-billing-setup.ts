/**
 * Helpers for the org billing setup dialog (contact info + Stripe payment).
 * Used by `cy.createStandardOrg` and available as standalone commands.
 *
 * Stripe Elements live on js.stripe.com inside iframes — parent-page DOM
 * queries cannot reach them. Requires `chromeWebSecurity: false` in cypress.config.
 *
 * Structure of the fields we fill (both are DIRECT children of a js.stripe.com
 * iframe document — no double nesting; only hCaptcha is nested deeper):
 *   - PaymentElement iframe → input[name="number" | "expiry" | "cvc"]
 *   - AddressElement iframe → input[name="name" | "addressLine1" | "locality" |
 *     "postalCode"], select[name="country"]
 * @see https://tryzerocheck.com/guides/test-stripe-checkout/
 */

const STRIPE_CARD = {
  number: '4242424242424242',
  /** Digits only — the PaymentElement expiry mask inserts the "/" itself. */
  expiry: '1234',
  cvc: '123',
};

/**
 * Billing address for the AddressElement. The country defaults to the account
 * profile's country (GB for the test user), and postal-code validation is
 * country-specific, so we set GB explicitly and use a valid UK address.
 */
const STRIPE_ADDRESS = {
  name: 'E2E Test User',
  country: 'GB',
  addressLine1: '10 Downing Street',
  city: 'London',
  postalCode: 'SW1A 2AA',
};

const PAYMENT_FORM = '#add-payment-method-form';

/** Stripe-hosted iframes only — excludes hCaptcha / loader noise on the page. */
const STRIPE_IFRAMES = `${PAYMENT_FORM} iframe[src*="js.stripe.com"]`;

/** True if `iframe`'s document directly contains an element matching `selector`. */
function frameContains(iframe: HTMLIFrameElement, selector: string): boolean {
  try {
    return !!iframe.contentDocument?.querySelector(selector);
  } catch {
    // Cross-origin (shouldn't happen with chromeWebSecurity:false) or not loaded.
    return false;
  }
}

/**
 * Type `value` into the Stripe iframe input matching `selector`.
 *
 * Locates the js.stripe.com iframe whose document directly contains the field,
 * then types through Cypress's iframe-body chain (the maintenance-free approach
 * that actually dispatches real key events Stripe's masks listen for).
 */
function fillStripeInput(label: string, selector: string, value: string): void {
  // Retry until an iframe hosting this field exists and has painted the input.
  cy.get(STRIPE_IFRAMES, { timeout: 60_000 })
    .should(($frames) => {
      const hasField = $frames
        .toArray()
        .some((f) => frameContains(f as HTMLIFrameElement, selector));
      expect(hasField, `Stripe iframe containing ${label}`).to.be.true;
    })
    .then(($frames) => {
      const index = $frames
        .toArray()
        .findIndex((f) => frameContains(f as HTMLIFrameElement, selector));

      cy.get(STRIPE_IFRAMES)
        .eq(index)
        .its('0.contentDocument.body')
        .should('not.be.empty')
        .then(cy.wrap)
        .find(selector)
        .first()
        .should('not.be.disabled')
        .click({ force: true })
        .clear({ force: true })
        .type(value, { force: true, delay: 30 });
    });
}

/**
 * Select an option in the Stripe AddressElement country `<select>`. Setting the
 * country first makes the downstream address fields (and postal validation)
 * deterministic regardless of the account profile's default country.
 */
function selectStripeCountry(value: string): void {
  const selector = 'select[name="country"]';

  cy.get(STRIPE_IFRAMES, { timeout: 60_000 })
    .should(($frames) => {
      const hasField = $frames
        .toArray()
        .some((f) => frameContains(f as HTMLIFrameElement, selector));
      expect(hasField, 'Stripe country select').to.be.true;
    })
    .then(($frames) => {
      const index = $frames
        .toArray()
        .findIndex((f) => frameContains(f as HTMLIFrameElement, selector));

      cy.get(STRIPE_IFRAMES)
        .eq(index)
        .its('0.contentDocument.body')
        .should('not.be.empty')
        .then(cy.wrap)
        .find(selector)
        .first()
        .should('not.be.disabled')
        .select(value, { force: true });
    });
}

export function completeOrgContactInfo(): void {
  cy.get('[data-e2e="org-billing-contact-open"]', { timeout: 30_000 }).should('be.visible').click();

  cy.get('[data-e2e="org-contact-email"]', { timeout: 30_000 }).should('be.visible');
  cy.get('[data-e2e="org-contact-email"]').then(($email) => {
    if (!$email.val()) {
      cy.get('[data-e2e="org-contact-email"]').type('e2e-org@test.datum.net');
    }
  });
  cy.get('[data-e2e="org-contact-name"]').then(($name) => {
    if (!$name.val()) {
      cy.get('[data-e2e="org-contact-name"]').type('E2E Test User');
    }
  });

  cy.get('[data-e2e="org-contact-save"]').click();
}

export function fillStripePaymentDialog(displayName = 'E2E test card'): void {
  cy.get('[data-e2e="payment-method-display-name"]', { timeout: 30_000 })
    .should('be.visible')
    .clear()
    .type(displayName);

  cy.get('[data-e2e="payment-method-submit"]', { timeout: 60_000 }).should('not.be.disabled');

  // PaymentElement + AddressElement mount as separate js.stripe.com iframes.
  cy.get(STRIPE_IFRAMES, { timeout: 60_000 }).should('have.length.at.least', 2);

  fillStripeInput('card number', 'input[name="number"]', STRIPE_CARD.number);
  fillStripeInput('expiry', 'input[name="expiry"]', STRIPE_CARD.expiry);
  fillStripeInput('CVC', 'input[name="cvc"]', STRIPE_CARD.cvc);

  // Name + country first: country drives which address fields render and how the
  // postal code is validated, so set it before filling the rest of the address.
  fillStripeInput('full name', 'input[name="name"]', STRIPE_ADDRESS.name);
  selectStripeCountry(STRIPE_ADDRESS.country);
  fillStripeInput('address line 1', 'input[name="addressLine1"]', STRIPE_ADDRESS.addressLine1);
  fillStripeInput('city', 'input[name="locality"]', STRIPE_ADDRESS.city);
  fillStripeInput('postal code', 'input[name="postalCode"]', STRIPE_ADDRESS.postalCode);

  cy.get('[data-e2e="payment-method-submit"]').click();
}

export function completeOrgPaymentMethod(): void {
  cy.get('[data-e2e="org-billing-payment-open"]', { timeout: 120_000 })
    .should('be.visible')
    .and('not.be.disabled')
    .click();

  fillStripePaymentDialog();

  cy.get('[data-e2e="org-billing-payment-summary"]', { timeout: 120_000 }).should('be.visible');
}

export function completeOrgBillingSetup(displayName?: string): void {
  if (displayName) {
    cy.get('[data-e2e="create-organization-display-name"]', { timeout: 30_000 })
      .should('be.visible')
      .clear()
      .type(displayName);
  }

  completeOrgContactInfo();
  completeOrgPaymentMethod();
}
