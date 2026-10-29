# Tasks — Show customers the discounts applied to their billing account

## Phase 1 — Discounts card

- [x] Add `summarizeDiscounts` and the `AccountDiscount` type in `app/features/billing/discounts.ts`, with Bun tests
- [x] Add `DiscountsCard` in `app/features/billing/cards/discounts-card.tsx` and export it
- [x] Add Cypress component tests for the card

## Phase 2 — Page wiring

- [x] Add the `loadAccountDiscounts` stub (returns `[]`, TODO naming the milo-os/billing API) to the detail loader
- [x] Render a "Discounts" section next to Invoices only when a discount is above 0%
- [x] Run typecheck, lint and tests
