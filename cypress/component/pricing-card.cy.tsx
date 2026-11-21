import { PricingCard } from '@/features/billing/cards/pricing-card';
import { contractSummary } from '@/features/billing/contract';
import { priceList } from '@/features/billing/pricing';
import type { BillingAccount } from '@/features/billing/types';

const prices = [
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
    name: 'server-v1',
    displayName: 'Dedicated server',
    chargeType: 'Recurring',
    interval: 'monthly',
    currency: 'USD',
    amount: '1000',
  },
] as const;

const contract = {
  startsAt: '2026-11-12T00:00:00Z',
  billingDayOfMonth: 12,
  usageBilled: true,
  fees: [
    {
      name: 'server-v1',
      displayName: 'Dedicated server',
      chargeType: 'Recurring',
      interval: 'monthly',
      currency: 'USD',
      amount: '1000',
      quantity: 1,
      pricingUnit: 'server',
      billingTiming: 'InArrears',
      periods: 8,
      endsAt: '2027-07-12T00:00:00Z',
    },
  ],
} as const;

function items(account: BillingAccount) {
  return priceList(account, contractSummary(account, Date.parse('2026-11-20T00:00:00Z')))!;
}

const account = { status: { prices, contract } } as unknown as BillingAccount;

// Customers see one list of everything they pay, however it's billed.
describe('PricingCard', () => {
  it('lists contract fees and usage rates together, with each discount', () => {
    cy.mount(<PricingCard items={items(account)} />);
    cy.get('[data-e2e="pricing-list"]')
      .should('contain.text', 'Dedicated server')
      .and('contain.text', '1 × $1,000 / server')
      .and('contain.text', 'For 8 months, until July 12, 2027')
      .and('contain.text', '$1,000 / month')
      .and('contain.text', 'Billed in arrears')
      .and('contain.text', 'ALB Requests')
      .and('contain.text', '$1.00 per million requests')
      .and('contain.text', '0 – 200 GB')
      .and('contain.text', '200 GB+')
      .and('contain.text', '10% off');
    // The contract's fee isn't listed twice.
    cy.get('[data-e2e="pricing-list"] tbody tr').should('have.length', 3);
  });

  it('says a discount on everything once instead of on every row', () => {
    const discounted = {
      status: {
        contract,
        prices: prices.map((price) => ({ ...price, discountPercentage: 100 })),
      },
    } as unknown as BillingAccount;
    cy.mount(<PricingCard items={items(discounted)} />);
    cy.get('[data-e2e="pricing-note"]').should('contain.text', '100% discount on everything.');
    cy.get('[data-e2e="pricing-list"]').should('not.contain.text', 'Discount');
  });

  it('searches a long list and shows the rest on request', () => {
    const many = {
      status: {
        prices: Array.from({ length: 12 }, (_, i) => ({
          name: `fee-${i}`,
          displayName: `Fee ${i}`,
          chargeType: 'Recurring',
          interval: 'monthly',
          currency: 'USD',
          amount: '100',
        })),
      },
    } as unknown as BillingAccount;
    cy.mount(<PricingCard items={items(many)} />);
    cy.get('[data-e2e="pricing-list"] tbody tr').should('have.length', 8);
    cy.contains('button', 'Show all 12 prices').click();
    cy.get('[data-e2e="pricing-list"] tbody tr').should('have.length', 12);
    cy.get('input[aria-label="Search prices"]').type('Fee 11');
    cy.get('[data-e2e="pricing-list"] tbody tr').should('have.length', 1);
    cy.contains('1 of 12 prices').should('exist');
  });
});
