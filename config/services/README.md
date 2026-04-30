# Service catalog registration

The Datum Cloud AI assistant's `services.miloapis.com.Service`
registration. Lives here, not in
[`datum-cloud/services`](https://github.com/datum-cloud/services), per
[#2 review feedback](https://github.com/datum-cloud/services/pull/2):
the `services` repo is the API that gets added to Milo; concrete
`Service` registrations are deployable artefacts that the producing
service publishes as part of its own deployment process — same
"catalog ships with the producing service" rule that put
`config/billing/` here.

## Identity

| Field | Value |
| --- | --- |
| `serviceName` | `assistant.miloapis.com` |
| `owner.producerProjectRef.name` | `cloud-portal` |
| `phase` | `Draft` |

The canonical CR is `services_v1alpha1_service_assistant.yaml`.

## Relationship to `config/billing/`

| Repo | API group | Resources | Directory |
| --- | --- | --- | --- |
| `cloud-portal` | `services.miloapis.com/v1alpha1` | `Service` | `config/services/` |
| `cloud-portal` | `billing.miloapis.com/v1alpha1` | `MeterDefinition`, `MonitoredResourceType` | `config/billing/` |

The Service registration declares *that the assistant exists as a
billable service*; the billing-side resources declare *what gets
metered and how*. They are deployed independently (the
services-operator's downstream-push controller will eventually let the
Service own the meters too, but until then both sides are kept in sync
manually — see [`config/billing/README.md`](../billing/README.md) for
the contract that pins `meterName`s on the wire side).

## Producer responsibilities

The cloud-portal — as the registered producer — owns:

1. Generating an `eventID` (ULID) once per logical sample and reusing
   it on retry (`app/modules/usage/ulid.ts`).
2. Attaching `projectRef` correctly so the durable usage pipeline can
   attribute the event to a `BillingAccountBinding`
   (`app/modules/usage/assistant-events.ts`).
3. Honouring the `model` and (optional) `region` label set declared by
   the `MonitoredResourceType` in `config/billing/` — events with
   unknown labels are rejected at the gateway.
4. Keeping `meterName` and resource group/Kind in sync across
   `config/billing/`, `app/modules/usage/meters.ts`, and the Cypress
   envelope coverage. `config/billing/README.md` documents this
   three-way pin explicitly.

## Deployment

This bundle is **not** wired into the cloud-portal Deployment overlay
(`config/base/`). The `Service` is a control-plane resource;
deployment into the services-operator's namespace happens via Flux
from the infra repo alongside every other producer's registration.

To preview the bundle locally:

```sh
kustomize build config/services
```
