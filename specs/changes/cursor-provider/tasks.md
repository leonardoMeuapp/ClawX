# Implementation Tasks

## Overview

This implementation is organized into 5 phases:

1. **Foundation** - Update provider registration to api_key-only and ensure icon is correct
2. **OAuth Cleanup** - Remove all Cursor OAuth artifacts from the codebase
3. **Verification** - Update existing tests for api_key-only assertions
4. **Acceptance Criteria Testing** - Verify all requirement behaviors with dedicated tests
5. **Final Checkpoint** - Validate completeness and readiness

**Estimated Effort**: Small (1-2 sessions)

**Note**: This is a corrective rewrite. The initial implementation incorrectly included OAuth browser flow support for Cursor. Per Cursor's official API documentation, only API key authentication with HTTP Basic Auth is supported. Phases 1-3 update existing code; the API key validation (`provider-validation.ts`), model fetching (`cursor-models.ts`), icon (`cursor.svg`), and type registration (`types.ts`) are already correct and need no changes.

## Phase 1: Foundation

- [x] 1.1 Update Cursor backend registry to api_key-only
  - In `electron/shared/providers/registry.ts`, change Cursor entry: `supportedAuthModes: ['api_key']`, `defaultAuthMode: 'api_key'`, remove `isOAuth: true`, set `requiresApiKey: true`.
  - _Implements: DES-1, REQ-1.2_

- [x] 1.2 Update Cursor frontend provider info to api_key-only
  - In `src/lib/providers.ts`, change Cursor entry: remove `isOAuth: true`, set `requiresApiKey: true`, remove `supportsApiKey: true`.
  - _Implements: DES-1, DES-4, REQ-2.2, REQ-3.2_

- [x] 1.3 Confirm API key validation and model fetching need no changes
  - Verify that `electron/services/providers/provider-validation.ts` (cursor-basic-auth profile) already uses HTTP Basic Auth for `/v0/me` and that `electron/services/providers/cursor-models.ts` already uses HTTP Basic Auth for `/v0/models`. No code changes needed — both are already correct.
  - _Implements: DES-2, DES-3_

## Phase 2: OAuth Cleanup

- [x] 2.1 Delete Cursor OAuth login helper
  - Delete the file `electron/utils/cursor-oauth.ts` entirely.
  - _Implements: DES-5_

- [x] 2.2 Revert BrowserOAuthManager Cursor additions
  - In `electron/utils/browser-oauth.ts`: remove `'cursor'` from `BrowserOAuthProviderType` union, remove `loginCursorOAuth` and `CursorOAuthCredentials` imports, remove `CURSOR_RUNTIME_PROVIDER_ID` and `CURSOR_OAUTH_DEFAULT_MODEL` constants, remove Cursor branches in `executeFlow()` and `onSuccess()`.
  - _Depends: 2.1_
  - _Implements: DES-5, REQ-1.2_

- [x] 2.3 Remove Cursor from OAuth route dispatch
  - In `electron/api/routes/providers.ts`, remove `|| body.provider === 'cursor'` from the condition that routes to `browserOAuthManager.startFlow()`.
  - _Depends: 2.2_
  - _Implements: DES-5_

- [x] 2.4 Remove Cursor OAuth runtime sync artifacts
  - In `electron/services/providers/provider-runtime-sync.ts`, remove `CURSOR_OAUTH_RUNTIME_PROVIDER` and `CURSOR_OAUTH_DEFAULT_MODEL_REF` constants, remove Cursor branches in `getBrowserOAuthRuntimeProvider()` and `syncDefaultProviderToRuntime()`.
  - _Depends: 2.2_
  - _Implements: DES-5_

## Phase 3: Verification

- [x] 3.1 Update test assertions for api_key-only
  - In `tests/unit/cursor-provider.test.ts`, update test expectations: `supportedAuthModes` should be `['api_key']`, `defaultAuthMode` should be `'api_key'`, remove `isOAuth: true` assertions, add `requiresApiKey: true` assertion. Remove any OAuth-specific test cases (4.4, 4.5, 4.6 from old tasks).
  - _Depends: 1.1, 1.2, 1.3, 2.2_
  - _Implements: DES-1, DES-2, DES-3, DES-4, REQ-1.2_

- [x] 3.2 Run typecheck, lint, and tests
  - Run `pnpm run lint && pnpm run typecheck && pnpm test` to verify no compilation errors, lint violations, or test failures from the changes.
  - _Depends: 3.1_
  - _Implements: DES-1_

## Phase 4: Acceptance Criteria Testing

- [x] 4.1 Test: Cursor provider definition is registered with api_key only
  - Verify `getProviderDefinition('cursor')` returns a definition with category `official`, vendor identifier `cursor`, display name `Cursor`, base URL `https://api.cursor.com`, supported auth modes `['api_key']`, default auth mode `'api_key'`, `requiresApiKey: true`, and API protocol `openai-completions`. Also verify that the Cursor SVG icon is registered in the provider icons map.
  - Test type: unit
  - _Depends: 1.1_
  - _Implements: REQ-1.1, REQ-1.2, REQ-1.3, REQ-7.1, REQ-7.2_

- [x] 4.2 Test: Cursor appears in setup wizard with API key input
  - Verify `SETUP_PROVIDERS` includes an entry with `id: 'cursor'`, `requiresApiKey: true`, and no `isOAuth: true` flag.
  - Test type: unit
  - _Depends: 1.2_
  - _Implements: REQ-2.1, REQ-2.2, REQ-2.3_

- [x] 4.3 Test: Cursor appears in Models screen with api_key auth
  - Verify the provider vendor list includes Cursor with only `api_key` auth mode available, and that no OAuth option is present.
  - Test type: unit
  - _Depends: 1.1, 1.2_
  - _Implements: REQ-3.1, REQ-3.2, REQ-3.3_

- [x] 4.4 Test: Cursor API key validation succeeds and fails
  - Verify that a valid API key validated against `GET /v0/me` with Basic Auth returns `{ valid: true, email }` and stores the key, and that an invalid key (401) returns `{ valid: false }` with an error message.
  - Test type: unit
  - _Depends: 1.1_
  - _Implements: REQ-4.1, REQ-4.2, REQ-4.3_

- [x] 4.5 Test: Cursor models are fetched and displayed with fallback
  - Verify that the Cursor model fetching function returns `ModelSummary[]` from a mocked `/v0/models` response with Basic Auth, and that on fetch failure a fallback default model is returned.
  - Test type: unit
  - _Depends: 1.1_
  - _Implements: REQ-5.1, REQ-5.2, REQ-5.3_

- [x] 4.6 Test: Cursor credential validation and email display
  - Verify that saving a Cursor provider account triggers credential validation via `/v0/me` with Basic Auth, that on success the user email is stored in account metadata, and that on HTTP 401 an error is returned.
  - Test type: unit
  - _Depends: 1.1_
  - _Implements: REQ-6.1, REQ-6.2, REQ-6.3_

- [x] 4.7 Test: BrowserOAuthProviderType does not include cursor
  - Verify that `'cursor'` is not a member of `BrowserOAuthProviderType` and that `BrowserOAuthManager` does not have any Cursor handling.
  - Test type: unit
  - _Depends: 2.2_
  - _Implements: REQ-1.2_

## Phase 5: Final Checkpoint

- [x] 5.1 Verify all acceptance criteria
  - REQ-1: Confirm Cursor is registered as an official provider with `api_key` as sole auth mode and `openai-completions` protocol.
  - REQ-2: Confirm Cursor appears in the setup wizard with API key input field only.
  - REQ-3: Confirm Cursor appears in the Models screen with API key auth and credential cleanup.
  - REQ-4: Confirm API key validation via `/v0/me` with Basic Auth, secure storage, and error messaging.
  - REQ-5: Confirm dynamic model listing, display in selector, and error fallback.
  - REQ-6: Confirm credential validation via `/v0/me`, email display, and 401 error handling.
  - REQ-7: Confirm Cursor SVG icon file exists and is registered in the provider icons map.
  - Run `pnpm run lint && pnpm run typecheck && pnpm test` and resolve any remaining issues.
  - _Implements: All requirements_
