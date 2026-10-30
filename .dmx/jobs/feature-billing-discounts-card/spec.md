---
ticket: ''
branch: feature-billing-discounts-card
summary: Show customers the discounts applied to their billing account
ticketing: github-issues
---

# Show customers the discounts applied to their billing account

**Ticket:** none yet (no cloud-portal issue filed). Related: datum-cloud/staff-portal#751, datum-cloud/staff-portal#763
**Type:** feature
**Branch:** feature-billing-discounts-card

---

## Context

Staff can set discounts on billing Offers (`billing.miloapis.com/v1alpha1`) in the staff portal (datum-cloud/staff-portal#763). An Offer has an optional general discount and optional per-service discounts; publishing an Offer to GA snapshots each service's resolved percentage into `spec.servicePricings[].discount`, which is what gets billed. Customers should see that discounts apply to them, without seeing the Offer or how staff configured it.

## Scope

- A read-only `DiscountsCard` in `app/features/billing/cards/`, taking a list of resolved discounts (service display name + percentage) as props.
- It shows one line ("20% discount on all usage") when every service has the same percentage, otherwise a Service → % list without the services at 0%. A note says discounts are applied to invoices automatically.
- A "Discounts" section on the billing account detail page (`app/routes/account/billing/detail.tsx`), next to Invoices, rendered only when at least one discount is above 0%.
- Read the discounts from `BillingAccount.status.discounts` (milo-os/billing#185) through the regenerated billing client.
- Unit tests for the summary logic and Cypress component tests for the card.
- Payment terms move into the "Payment methods" section (developer asked for this on 2026-10-30, to ship in the same PR). The separate "Payment terms" section is removed: active terms and an application under review render above the card list, and the apply and declined prompts (`PaymentTermsPrompt`) go in the `PaymentMethodsCard` footer next to "Add a payment method".
- Fix the billing account page scrolling past its content (developer asked for this on 2026-10-30, in the same PR). The hidden native `<select>` behind each `Form.Select` is absolutely positioned and escaped the page's scroll container, stretching the document past the `h-svh` shell. `ContentWrapper` is now `relative`, which fixes every page that uses it.

## Out of Scope

- Reading Offers from the customer session. Offers are staff-authored and cluster-scoped; the portal must not call Offer endpoints.
- Offer or plan names, the words "override" or "inherited", and discounted prices worked out in the portal.
- The milo-os/billing API that exposes resolved discounts to customers.

## Technical Approach

- `app/features/billing/discounts.ts` holds the pure logic: drop discounts at or below 0%, then return either `{ kind: 'uniform', percentage }` or `{ kind: 'perService', items }`, or `undefined` when nothing applies.
- `DiscountsCard` renders that summary and returns `null` when it is `undefined`. The page also hides the section, so an empty list adds nothing.
- `accountDiscounts(account)` maps `status.discounts` to the card's props (`displayName`, falling back to `name`, plus `percentage`). The page computes it from the live account, so discounts follow the account watch.

### Data dependency

Billing publishes the discounts on `BillingAccount.status.discounts` (milo-os/billing#185): one entry per service pricing in the account's Offer, with `name`, `serviceRef`, `displayName` and `percentage`, set only while at least one is above 0%. Customers' Billing Viewer role already reads `BillingAccount` status; `BillingEntitlement` was ruled out because customers can't read it and its spec names the Offer. The billing client was regenerated from staging on 2026-10-30.

Before this merges, confirm milo-os/openmeter-provider#61 (merged 2026-10-27) is in production. Discounts aren't charged until then, and once this ships the card shows any discount billing publishes.

"All usage" is decided from the services listed: when every listed service has the same percentage, the card shows one line. Billing lists every pricing in the Offer, including those at 0%, so the list is complete.

---

## Questions

1. Which resource will carry the resolved discounts for customers?
   Answer: `BillingAccount.status.discounts`, written by milo-os/billing (milo-os/billing#185).

2. Should services at 0% be listed when others are discounted?
   Answer: No. They are left out.
