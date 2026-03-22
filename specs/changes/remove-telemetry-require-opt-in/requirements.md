# Requirements

## Overview

ClawX currently sends anonymous usage data to PostHog (a third-party analytics service) including events like `app_installed`, `app_opened`, and gateway lifecycle metrics, along with a hardware-derived machine ID, OS, architecture, and app version. The current default is opt-out: telemetry is enabled by default and must be explicitly disabled by the user.

This change removes **all** remote data collection from the application, eliminates the settings UI toggle that currently controls anonymous data sharing, and requires **explicit opt-in consent** before any future telemetry can be reintroduced. The PostHog dependency and all remote event sending must be eliminated. Local-only diagnostic metrics (in-memory UI telemetry visible in the Developer panel) are not considered remote data collection and may be retained.

## Glossary

| Term | Definition |
|------|------------|
| Remote telemetry | Any data transmission from the application to an external server for usage analytics, crash reporting, diagnostics, or tracking purposes |
| Local diagnostics | In-process metrics stored only in memory or logged to the local console, never transmitted externally |
| Opt-in consent | An affirmative action by the user to enable a feature that is disabled by default |

## Assumptions

- The in-memory UI telemetry module (`src/lib/telemetry.ts`) is classified as local diagnostics and is out of scope for removal since it never transmits data externally.
- The `trackMetric` function in the Main process is classified as local diagnostics (logger-only) and is out of scope for removal.
- No other analytics SDKs exist in the codebase beyond PostHog (confirmed by audit).

## Requirements

### REQ-1: Remove remote telemetry transmission

**User Story:** As a user, I want the application to never send my usage data to external servers, so that my privacy is protected by default.

#### Acceptance Criteria

1.1 THE application SHALL NOT transmit any usage data, device identifiers, or application metrics to external servers.
1.2 THE application SHALL NOT initialize or instantiate any third-party analytics SDK at startup.
1.3 THE application SHALL NOT include PostHog or any equivalent analytics library as a runtime dependency.

### REQ-2: Remove hardware-derived device fingerprinting

**User Story:** As a user, I want the application to stop generating or storing hardware-derived machine identifiers for tracking purposes, so that my device cannot be uniquely identified.

#### Acceptance Criteria

2.1 THE application SHALL NOT generate or persist a hardware-derived machine identifier for telemetry purposes.
2.2 THE application SHALL NOT include `node-machine-id` or any equivalent device fingerprinting library as a runtime dependency.

### REQ-3: Default telemetry to disabled

**User Story:** As a user, I want telemetry to be disabled by default, so that no data is collected without my explicit permission.

#### Acceptance Criteria

3.1 WHEN the application starts for the first time, THEN the application SHALL set the telemetry preference to disabled.
3.2 THE application SHALL NOT collect or transmit any remote telemetry data unless the user has explicitly enabled it.

### REQ-4: Remove telemetry toggle from settings interface

**User Story:** As a user, I want the anonymous data sharing toggle removed from the settings screen, so that there is no misleading option for a feature that no longer exists.

#### Acceptance Criteria

4.1 THE application SHALL NOT display a toggle, switch, or checkbox for enabling or disabling anonymous usage data in the settings interface.
4.2 THE application SHALL remove the `telemetryEnabled` setting from the persisted configuration store.
4.3 THE application SHALL remove the `telemetryEnabled` field and its setter from the renderer settings state.

### REQ-5: Require explicit opt-in consent for any future telemetry

**User Story:** As a user, I want any future reintroduction of remote data collection to require my explicit opt-in, so that I retain full control over my privacy.

#### Acceptance Criteria

5.1 IF remote telemetry is reintroduced in a future version, THEN the application SHALL default the telemetry preference to disabled and require an explicit user action to enable it.
5.2 IF remote telemetry is reintroduced in a future version, THEN the application SHALL display a clear description of what data would be collected before the user can activate collection.

### REQ-6: Clean up persisted telemetry artifacts

**User Story:** As a user, I want previously stored telemetry identifiers to be removed, so that no tracking residue remains on my system.

#### Acceptance Criteria

6.1 WHEN the application upgrades from a version that had telemetry enabled, THEN the application SHALL delete any previously persisted machine identifier and telemetry installation flags from local storage.

### REQ-7: Preserve local diagnostic capabilities

**User Story:** As a developer, I want local-only diagnostic metrics to remain available in the developer panel, so that I can debug application behavior without remote data collection.

#### Acceptance Criteria

7.1 THE application SHALL retain in-memory UI telemetry collection for local developer diagnostics.
7.2 THE application SHALL NOT transmit local diagnostic metrics to any external server.
