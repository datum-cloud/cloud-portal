# Tasks — Show customers the discounts applied to their billing account

## Phase 1 — Discounts card

- [x] Add `summarizeDiscounts` and the `AccountDiscount` type in `app/features/billing/discounts.ts`, with Bun tests
- [x] Add `DiscountsCard` in `app/features/billing/cards/discounts-card.tsx` and export it
- [x] Add Cypress component tests for the card

## Phase 2 — Page wiring

- [x] Add the `loadAccountDiscounts` stub (returns `[]`, TODO naming the milo-os/billing API) to the detail loader
- [x] Render a "Discounts" section next to Invoices only when a discount is above 0%
- [x] Run typecheck, lint and tests

## Phase 3 — Real data

- [x] Regenerate the billing client from staging (developer ran `bun run openapi`)
- [x] Replace the `loadAccountDiscounts` stub with `accountDiscounts(account)` reading `status.discounts`, with Bun tests
- [x] Run typecheck, lint and tests

## Phase 4 — Payment terms in Payment methods

- [x] Split the apply and declined lines out of `PaymentTermsCard` into `PaymentTermsPrompt`
- [x] Add a `footerNote` slot to `PaymentMethodsCard`
- [x] Remove the "Payment terms" section and render both inside "Payment methods"
- [x] Update the payment terms Cypress component tests

## Phase 5 — Page scrolls past its content

- [x] Find the cause: hidden native selects from `Form.Select` escape the scroll container
- [x] Make `ContentWrapper`'s scroll container `relative`
