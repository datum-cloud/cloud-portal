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
- A placeholder loader stub that returns an empty list, so nothing shows until the data exists.
- Unit tests for the summary logic and Cypress component tests for the card.

## Out of Scope

- Reading Offers from the customer session. Offers are staff-authored and cluster-scoped; the portal must not call Offer endpoints.
- Offer or plan names, the words "override" or "inherited", and discounted prices worked out in the portal.
- The milo-os/billing API that exposes resolved discounts to customers.

## Technical Approach

- `app/features/billing/discounts.ts` holds the pure logic: drop discounts at or below 0%, then return either `{ kind: 'uniform', percentage }` or `{ kind: 'perService', items }`, or `undefined` when nothing applies.
- `DiscountsCard` renders that summary and returns `null` when it is `undefined`. The page also hides the section, so an empty list adds nothing.
- The detail loader calls `loadAccountDiscounts()`, a stub that returns `[]`.

### Data dependency

There is no customer-readable API for resolved discounts yet. The stub in `detail.tsx` (`loadAccountDiscounts`) is marked with a TODO. It waits on milo-os/billing to publish `BillingAccount.status.discounts` (milo-os/billing#185, not yet merged): one entry per service pricing in the account's Offer, with `name`, `serviceRef`, `displayName` and `percentage`, set only while at least one is above 0%. Customers' Billing Viewer role already reads `BillingAccount` status; `BillingEntitlement` was ruled out because customers can't read it and its spec names the Offer. The portal's billing client needs regenerating once that lands. Discounts are only charged once milo-os/openmeter-provider#61 reaches production, so the card should not be wired to real data before then.

"All usage" is decided from the services listed: when every listed service has the same percentage, the card shows one line. Billing lists every pricing in the Offer, including those at 0%, so the list is complete.

---

## Questions

1. Which resource will carry the resolved discounts for customers?
   Answer: `BillingAccount.status.discounts`, written by milo-os/billing. Built against props until it ships.

2. Should services at 0% be listed when others are discounted?
   Answer: No. They are left out.
