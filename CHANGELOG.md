# Change Log

<!-- CHANGELOG:INSERT_HERE -->
## [v0.1.17] 2025-05-05

### Changes

*Pull Request Template Update*
- Added a pull request template to standardize contributions including providing guidance on titles/descriptions and encouraging labels

*Export Policy Updates*
- Added ability to update export policy via a dedicated edit route
- Implemented robust form handling with state management and validation.
- Improved form and UI/UX, and TypeScript type definitions

*Pull Request Template Improvements*
- Updated the Pull Request template to require the inclusion of the related issue number in the PR description
- Introduced a new `invalid` label for closing PRs that shouldn't be included in the changelog

*Gateway Editing Feature*
- Implemented gateway editing functionality in the Cloud Portal.
- Enhanced `GatewayForm` to support both creation and editing.
- Added support for gateway deletion with a confirmation dialog.

*Changelog*
- Added a `CHANGELOG.md` file to track and preserve release details.
- Includes a marker for automated prepending of new releases.

*Sink Authentication*
- Added authentication support for export policy sinks.
- Implemented a new authentication field component for sink configurations.
- Allows users to configure basic authentication for Prometheus remote write endpoints via secrets.

*Workload Sandbox Environment Variables*
- Added ability to manage environment variables for workload sandboxes by selecting ConfigMaps.
- Updated schemas, interfaces, and helpers to support the new features.

*Gateway Display FQDN*
- Implemented displaying the FQDN for the gateway.

*Bug Fix: OpenTelemetry Integration*
- Corrected the OpenTelemetry integration by configuring the OTLP gRPC exporter setup to prevent TLS mismatch errors.

*Bug Fix: Editing Secrets*
- Resolved a bug causing an "options is not iterable" error when editing secrets.

*Bug Fix: OpenTelemetry in Docker*
- Fixed OpenTelemetry instrumentation in Docker environments with a new start-up script.

*Removed OpenTelemetry Metrics Export*
- Removed the redundant and unused OpenTelemetry metrics exporter. The existing Prometheus setup is sufficient for our needs.


## [v0.1.16] 2025-04-23

### Changes

**Features and Improvements**

- :eyes: Added the ability to view secrets.
- :key: Users can now manage secrets within the Cloud Portal.
- :chart_with_upwards_trend: Implemented Fathom analytics to better understand user behavior.
- :bulb: Improved field documentation with helpful tooltips, providing more context within the UI.
- :rocket: OpenTelemetry integration is complete, including:
  - Addition of OpenTelemetry for enhanced tracing.
  - Express traces are now included.
  - Moving to Otel GRPC for improved communication.
  - Ensuring the correct OpenTelemetry endpoint is logged for verification.
- :art: Optimized login images for faster loading.

**Bug Fixes**

- :lock: Fixed a bug in CSRF handling and improved the display of error messages.
- :whale: Resolved issues with ELKJS during Docker builds.
- :x: Reverted the Pyroscope integration due to incompatibility with the Bun runtime. We'll explore alternative solutions in the future.
- :recycle: Addressed an issue where the workload Reactflow was returning null
- :warning: The portal will now show users when a workload is being deleted.

**Chores**

- :arrows_counterclockwise: Changed the export policy form to "stepper" mode and added a view for export policies.
- :arrow_up: Updated the prom/prometheus Docker tag to v3.3.0.
