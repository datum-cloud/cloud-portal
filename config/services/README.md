# Service catalog

Datum Cloud AI assistant's catalog identifiers — everything the
services-operator and downstream Milo controllers need in order to
recognise the assistant as a billable service and fan out its meters.

This bundle lives in `cloud-portal` (not in
[`datum-cloud/services`](https://github.com/datum-cloud/services)) per
[#2 review feedback](https://github.com/datum-cloud/services/pull/2):
the `services` repo is the API surface that gets added to Milo;
concrete `Service` + `ServiceConfiguration` registrations are
deployable artefacts that the producing service publishes as part of
its own deployment process.

## Contents

| Kind                   | Name                     | What it declares                                                                |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| `Service`              | `assistant-miloapis-com` | `serviceName`, display metadata, producer owner.                                |
| `ServiceConfiguration` | `assistant-miloapis-com` | The Conversation MonitoredResourceType, five conversation metrics, and billing. |

Both ship in `phase: Published`.

## Why one `ServiceConfiguration` instead of raw `MeterDefinition`s

The canonical producer-facing document for billing is the
`services.miloapis.com/v1alpha1.ServiceConfiguration` — see
[`billing/docs/emitting-usage.md`](https://github.com/datum-cloud/billing/blob/main/docs/emitting-usage.md).
A producer authors _one_ document; the services-operator fans it out
into `billing.miloapis.com/MeterDefinition` and `MonitoredResourceType`
objects stamped `app.kubernetes.io/managed-by: services-operator`.
Producers are explicitly told not to author those downstream CRDs
directly — edit the `ServiceConfiguration` and let the fan-out catch
up.

The `ServiceConfiguration` declares three things:

- **`spec.monitoredResourceTypes[]`** — the Kinds the assistant emits
  usage against, plus the closed set of labels each Kind's events may
  carry. Keyed by `.type`.
- **`spec.metrics[]`** — metric descriptors (`name`, `kind`, `unit`).
  Replaces the old `meters[]` shape.
- **`spec.billing.consumerDestinations[]`** — routes metrics to
  monitored resource types. A metric only becomes a `MeterDefinition`
  if it appears here.

## Immutability after `Published`

Per the CRD contract:

- `spec.metrics[].name`, `.kind`, `.unit` are immutable.
- `spec.monitoredResourceTypes[].type` and `.gvk` are immutable.

Adding an optional label or a new metric is additive and safe.
Removing or renaming either is breaking — version the name (e.g.
`assistant.miloapis.com/conversation/input-tokens/v2`).

## Source-of-truth pinning

The `serviceName`, metric names, and Conversation Kind appear in three
places that must move together:

| Surface               | File                                                               |
| --------------------- | ------------------------------------------------------------------ |
| Catalog (declarative) | `services_v1alpha1_serviceconfiguration_assistant.yaml` (this dir) |
| Wire-side constants   | `app/modules/usage/meters.ts`                                      |
| Envelope coverage     | `cypress/component/usage-emitter.cy.ts`                            |

Any change to a metric `name` or to the `Conversation` Kind here MUST
be made in those two files in the same PR.

## Deployment

This bundle is **not** wired into the cloud-portal Deployment overlay
(`config/base/`). The catalog identifiers are control-plane resources;
deployment into the services-operator's namespace happens via Flux
from the infra repo (`apps/cloud-portal/base/milo-services.yaml`).

To preview the bundle locally:

```sh
kustomize build config/services
```
