# Billing catalog

Catalog identifiers the cloud-portal emits usage events against. Owned
by this repo because the rule established on
[milo-os/billing#11](https://github.com/milo-os/billing/pull/11#issuecomment-4343165104)
is "meter definitions live with the service that produces the
metering events".

## Contents

| Resource | meterName / GVK | Aggregation | Notes |
| --- | --- | --- | --- |
| `MonitoredResourceType` | `assistant.miloapis.com/Conversation` | — | One per top-level chat session. Closed label set: `model` (required), `region` (optional). |
| `MeterDefinition` | `assistant.miloapis.com/conversation/input-tokens` | `Sum` `{token}` | Fresh input tokens. Cached input is split out below so it does not double-count. |
| `MeterDefinition` | `assistant.miloapis.com/conversation/output-tokens` | `Sum` `{token}` | Includes any extended-thinking tokens. |
| `MeterDefinition` | `assistant.miloapis.com/conversation/cache-read-tokens` | `Sum` `{token}` | Tokens served from prompt cache; priced lower than input. |
| `MeterDefinition` | `assistant.miloapis.com/conversation/cache-write-tokens` | `Sum` `{token}` | Tokens written to prompt cache; priced higher than input. |
| `MeterDefinition` | `assistant.miloapis.com/conversation/messages` | `Count` `{message}` | Tier-cap signal and billing safety-net when token totals are unavailable. |

All ship in `phase: Draft`. The five MeterDefinitions reference the
MonitoredResourceType via `spec.monitoredResourceTypes`; the
`services.miloapis.com/owner-service` label points at
`assistant.miloapis.com` so the future services-operator fan-out
controller picks them up cleanly.

## Why split cache-read and cache-write?

Anthropic (and equivalent providers) bill prompt-cache reads at a
fraction of input-token rate and prompt-cache writes at a premium.
Mixing them into `input-tokens` would either overcharge cached chats
or make the bill irreconcilable with what the provider reports.
`MeterDefinition.measurement.aggregation` and `measurement.unit` are
**immutable post-`Published`**, so getting the split right at `Draft`
is materially cheaper than fixing it after promotion.

## Source-of-truth pinning

The `meterName`s and the `assistant.miloapis.com/Conversation` Kind
are also pinned, with matching dimension keys, in:

- `app/modules/usage/meters.ts` — wire-side constants used by the
  emitter.
- `cypress/component/usage-emitter.cy.ts` — covers the envelope
  produced by `buildAssistantUsageEvents`.

Any change to `meterName` here MUST be made in those two files in the
same PR, and vice versa.

## Deployment

This bundle is **not** wired into the cloud-portal Deployment overlay
(`config/base/`). Catalog identifiers are control-plane resources;
they're deployed into the billing service's namespace by Flux from
the infra repo alongside every other service's catalog. See
`docs/usage-pipeline/docs/enhancements/usage-pipeline.md` in the
billing repo for the broader pipeline contract.

To preview the bundle locally:

```sh
kustomize build config/billing
```
