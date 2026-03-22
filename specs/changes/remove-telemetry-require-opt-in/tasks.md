# Implementation Tasks

## Overview

This implementation is organized into 4 phases:

1. **Foundation** - Remove remote telemetry module and dependencies
2. **UI & State Cleanup** - Remove settings toggle, store fields, and i18n keys
3. **Acceptance Criteria Testing** - Verify all requirement behaviors
4. **Final Checkpoint** - Validate completeness and run full verification

**Estimated Effort**: Small (2-3 sessions)

## Phase 1: Foundation

- [x] 1.1 Gut remote telemetry module
  - Rewrite `electron/utils/telemetry.ts` to keep only `trackMetric` (local logger). Delete all PostHog imports, API key constants, `initTelemetry`, `captureTelemetryEvent`, `shutdownTelemetry`, and `machineIdSync` usage. Keep the `logger` import and `trackMetric` export unchanged.
  - _Implements: DES-1, REQ-1.1, REQ-1.2, REQ-2.1_

- [x] 1.2 Remove captureTelemetryEvent from gateway manager
  - In `electron/gateway/manager.ts`, remove the `captureTelemetryEvent` import and delete the three `captureTelemetryEvent(...)` call sites (~lines 416, 437, 981). Keep the adjacent `trackMetric(...)` calls intact.
  - _Depends: 1.1_
  - _Implements: DES-6, REQ-1.1_

- [x] 1.3 Remove initTelemetry from app startup
  - In `electron/main/index.ts`, remove the `initTelemetry` import and the `await initTelemetry()` call (~line 261).
  - _Depends: 1.1_
  - _Implements: DES-1, REQ-1.2_

- [x] 1.4 Remove analytics dependencies
  - Remove `posthog-node` and `node-machine-id` from `dependencies` in `package.json`. Run `pnpm install` to update `pnpm-lock.yaml`.
  - _Depends: 1.1_
  - _Implements: DES-2, REQ-1.3, REQ-2.2_

## Phase 2: UI & State Cleanup

- [x] 2.1 Remove telemetryEnabled from electron-store
  - In `electron/utils/store.ts`, remove `telemetryEnabled`, `machineId`, and `hasReportedInstall` from the `AppSettings` interface and from `createDefaultSettings()`.
  - _Implements: DES-4, REQ-4.2_

- [x] 2.2 Add persisted telemetry data cleanup on startup
  - In `electron/main/index.ts`, add an idempotent migration that deletes the `telemetryEnabled`, `machineId`, and `hasReportedInstall` keys from electron-store on every app start. Place it where `initTelemetry()` was previously called.
  - _Depends: 2.1_
  - _Implements: DES-5, REQ-6.1_

- [x] 2.3 Remove telemetryEnabled from Zustand settings store
  - In `src/stores/settings.ts`, remove the `telemetryEnabled` field, its default value, and the `setTelemetryEnabled` method.
  - _Implements: DES-4, REQ-4.3_

- [x] 2.4 Remove telemetry toggle from Settings page
  - In `src/pages/Settings/index.tsx`, delete the "Anonymous Usage Data" Switch block from the Advanced section. Remove the `telemetryEnabled` and `setTelemetryEnabled` destructured bindings from the `useSettingsStore` hook call.
  - _Depends: 2.3_
  - _Implements: DES-3, REQ-4.1_

- [x] 2.5 Remove telemetry i18n keys
  - Remove `advanced.telemetry` and `advanced.telemetryDesc` keys from `src/i18n/locales/en/settings.json` and `src/i18n/locales/zh/settings.json`. The `ja` locale is already missing these keys — no change needed.
  - _Implements: DES-3_

## Phase 3: Acceptance Criteria Testing

- [x] 3.1 Test: telemetry module only exports local logger
  - Rewrite `tests/unit/telemetry.test.ts`. Verify `trackMetric` logs to the local logger. Verify the module does not export `initTelemetry`, `captureTelemetryEvent`, or `shutdownTelemetry`. Remove all PostHog and node-machine-id mocks.
  - Test type: unit
  - _Depends: 1.1_
  - _Implements: DES-7, REQ-1.1, REQ-1.2_

- [x] 3.2 Test: no analytics dependencies in package.json
  - Add a test or verification step that confirms `posthog-node` and `node-machine-id` do not appear in `package.json` dependencies.
  - Test type: unit
  - _Depends: 1.4_
  - _Implements: DES-7, REQ-1.3, REQ-2.2_

- [x] 3.3 Test: no device fingerprinting at startup
  - Verify that app startup does not call `machineIdSync` or persist a `machineId` to the store.
  - Test type: unit
  - _Depends: 1.1, 2.1_
  - _Implements: DES-7, REQ-2.1, REQ-3.1, REQ-3.2_

- [x] 3.4 Test: settings store has no telemetryEnabled field
  - Verify the Zustand settings store does not contain `telemetryEnabled` or `setTelemetryEnabled` in its state shape.
  - Test type: unit
  - _Depends: 2.3_
  - _Implements: DES-7, REQ-4.2, REQ-4.3_

- [x] 3.5 Test: persisted telemetry artifacts are cleaned on upgrade
  - Verify the startup migration deletes `telemetryEnabled`, `machineId`, and `hasReportedInstall` from the electron-store when they exist from a previous version.
  - Test type: unit
  - _Depends: 2.2_
  - _Implements: DES-7, REQ-6.1_

- [x] 3.6 Test: local diagnostics remain functional
  - Verify `src/lib/telemetry.ts` exports `trackUiEvent`, `getUiTelemetrySnapshot`, and `clearUiTelemetry` and that they operate in-memory without network calls.
  - Test type: unit
  - _Depends: 1.1_
  - _Implements: DES-8, REQ-7.1, REQ-7.2_

- [x] 3.7 Test: Settings page does not render telemetry toggle
  - Verify the Settings page Advanced section does not contain an "Anonymous Usage Data" toggle.
  - Test type: unit
  - _Depends: 2.4_
  - _Implements: DES-7, REQ-4.1_

## Phase 4: Final Checkpoint

- [x] 4.1 Verify all acceptance criteria
  - REQ-1: Confirm no remote telemetry transmission code exists and no analytics dependencies remain.
  - REQ-2: Confirm no device fingerprinting code or dependencies remain.
  - REQ-3: Confirm telemetry defaults to disabled with no remote collection path.
  - REQ-4: Confirm the telemetry toggle is removed from Settings UI and all associated state is deleted.
  - REQ-5: Confirm the opt-in-only policy is documented (no runtime code needed — this is a design constraint for future changes).
  - REQ-6: Confirm persisted telemetry artifacts are cleaned on upgrade.
  - REQ-7: Confirm local diagnostics module and Telemetry Viewer remain functional.
  - Run `pnpm run lint && pnpm run typecheck && pnpm test` and resolve any failures.
  - _Implements: All requirements_
