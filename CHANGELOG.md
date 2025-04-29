# Change Log

<!-- CHANGELOG:INSERT_HERE -->
## [v0.1.16] 2025-04-23

### Changes

*Bug Fixes*
*   Fixed a bug in CSRF handling and improved the error message.
*   Fixed an issue with ELKJS on Docker builds.

*Key Features and Enhancements*
*   Added Fathom analytics to the portal.
*   Implemented OpenTelemetry for enhanced monitoring and tracing capabilities.
*   Added Express traces.
*   Improved field documentation with tooltip support.
*   The export policy form is now in "stepper" mode with added view export policy.
*   Login images have been optimized.
*   Users are now shown when a workload is being deleted.
*   Secrets can now be managed and viewed in the portal.

*Observability Updates*
*   Switched to using Otel GRPC.
*   Added logging to confirm the correct OTLP endpoint is configured.
*   _Note_: The Pyroscope integration was reverted due to incompatibility issues with the Bun runtime. We plan to explore alternative integration methods in the future.

*Dependency Updates*
*   Updated `eslint` to v8.57.1.
*   Updated `i18next` to v25.0.0.
*   Updated `prom/prometheus` Docker tag to v3.3.0.


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
