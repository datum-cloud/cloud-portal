import { PricingCard } from '@/features/billing/cards/pricing-card';
import { pricingSummary } from '@/features/billing/pricing';
import type { BillingAccount } from '@/features/billing/types';

const account = {
  status: {
    prices: [
      {
        name: 'networking-alb-requests-v1',
        displayName: 'ALB Requests',
        serviceRef: 'networking.datumapis.com',
        chargeType: 'Usage',
        currency: 'USD',
        pricingUnit: 'request',
        rates: [{ flat: '0.000001' }],
      },
      {
        name: 'networking-alb-egress-v1',
        displayName: 'ALB Egress',
        serviceRef: 'networking.datumapis.com',
        chargeType: 'Usage',
        currency: 'USD',
        pricingUnit: 'GB',
        rates: [{ tiered: [{ upTo: '200', rate: '0' }, { rate: '0.05' }] }],
        discountPercentage: 10,
      },
      {
        name: 'support-v1',
        displayName: 'Support',
        chargeType: 'Recurring',
        interval: 'monthly',
        currency: 'USD',
        amount: '500',
      },
    ],
  },
} as BillingAccount;

// Customers see every rate and fee they're billed at, with each discount.
describe('PricingCard', () => {
  it('lists usage rates, fees and discounts', () => {
    cy.mount(<PricingCard pricing={pricingSummary(account)!} />);
    cy.get('[data-e2e="pricing-usage"]')
      .should('contain.text', 'ALB Requests')
      .and('contain.text', '$1.00 per million requests')
      .and('contain.text', '0 – 200 GB')
      .and('contain.text', 'Free')
      .and('contain.text', '200 GB+')
      .and('contain.text', '$0.05 per GB')
      .and('contain.text', '10% off');
    cy.get('[data-e2e="pricing-fees"]')
      .should('contain.text', 'Support')
      .and('contain.text', '$500 / month')
      .and('not.contain.text', 'Discount');
  });

  it('says a discount on everything once instead of on every row', () => {
    const discounted = {
      status: {
        prices: (account.status?.prices ?? []).map((price) => ({
          ...price,
          discountPercentage: 100,
        })),
      },
    } as BillingAccount;
    cy.mount(<PricingCard pricing={pricingSummary(discounted)!} />);
    cy.get('[data-e2e="pricing-note"]').should('contain.text', '100% discount on everything.');
    cy.get('[data-e2e="pricing-usage"]').should('not.contain.text', 'Discount');
    cy.get('[data-e2e="pricing-fees"]').should('not.contain.text', 'Discount');
  });
});
