# Implementation Tasks

## Overview

This implementation is organized into 11 phases:

1. **Foundation** - Register the provider type across shared types, registry, and frontend metadata
2. **OAuth and Model Discovery** - Implement GitHub Device Flow OAuth and Copilot model fetching
3. **Integration Wiring** - Wire OAuth into route dispatch and BrowserOAuthManager lifecycle
4. **Model Tier Enhancement** - Add tier metadata to model discovery and extend data storage
5. **Model Tier UI** - Build categorized model selector component for the provider card
6. **Acceptance Criteria Testing** - Verify all requirement behaviors
7. **Final Checkpoint** - Validate completeness and readiness
8. **Backend Tier Removal** - Remove tier classification types, functions, and metadata from backend
9. **UI Simplification** - Simplify model selector to flat list, fix edit-mode visibility
10. **Acceptance Criteria Testing (Tier Removal)** - Verify all REQ-7 tier removal criteria and updated REQ-3, REQ-6
11. **Final Checkpoint (Tier Removal)** - Validate all requirements pass after simplification

**Estimated Effort**: Medium (3-4 sessions)

## Phase 1: Foundation

- [x] 1.1 Add `github-copilot` to shared provider types
  - Add `'github-copilot'` to the `PROVIDER_TYPES` and `BUILTIN_PROVIDER_TYPES` const arrays in `electron/shared/providers/types.ts`.
  - _Implements: DES-1_

- [x] 1.2 Add GitHub Copilot registry entry
  - Add a `ProviderDefinition` entry to the `PROVIDER_DEFINITIONS` array in `electron/shared/providers/registry.ts` with `id: 'github-copilot'`, `name: 'GitHub Copilot'`, `category: 'official'`, `supportedAuthModes: ['oauth_browser']`, `defaultAuthMode: 'oauth_browser'`, `isOAuth: true`, `requiresApiKey: false`, and `providerConfig` pointing to `https://api.githubcopilot.com` with `api: 'openai-completions'`.
  - _Depends: 1.1_
  - _Implements: DES-1_

- [x] 1.3 Add GitHub Copilot to frontend provider metadata
  - Add `'github-copilot'` to the `PROVIDER_TYPES`, `BUILTIN_PROVIDER_TYPES`, and `PROVIDER_TYPE_INFO` arrays in `src/lib/providers.ts` with `isOAuth: true`, `requiresApiKey: false`, and matching label/model metadata.
  - _Depends: 1.1_
  - _Implements: DES-1, DES-6_

- [x] 1.4 Add GitHub Copilot SVG icon
  - Create `src/assets/providers/github-copilot.svg` with a monochrome GitHub Copilot logo. Import and register it in `src/assets/providers/index.ts` under the `'github-copilot'` key in the `providerIcons` map.
  - _Implements: DES-6, REQ-1.3_

## Phase 2: OAuth and Model Discovery

- [x] 2.1 Create GitHub Copilot OAuth utility
  - Create `electron/utils/github-copilot-oauth.ts` implementing `loginGitHubCopilotOAuth()`. The function performs the GitHub Device Flow: POST to `https://github.com/login/device/code` with `client_id` and `scope`, emit device code and verification URI via a callback, then poll `https://github.com/login/oauth/access_token` until the user completes authorization or timeout. Return credentials including `access`, `refresh`, `expires`, and `email`. Export a `GitHubCopilotOAuthCredentials` interface.
  - _Implements: DES-2, REQ-2.2_

- [x] 2.2 Add Copilot model fetch to OAuth utility
  - In `electron/utils/github-copilot-oauth.ts`, after obtaining the access token, fetch `GET https://api.githubcopilot.com/models` with the Bearer token. Parse the model list and include it in the returned credentials. On failure, fall back to a hardcoded list of common Copilot models (e.g., `gpt-4o`, `claude-sonnet-4`, `gemini-2.0-flash`).
  - _Depends: 2.1_
  - _Implements: DES-3, REQ-3.1_

## Phase 3: Integration Wiring

- [x] 3.1 Extend BrowserOAuthManager for github-copilot
  - In `electron/utils/browser-oauth.ts`, add `'github-copilot'` to the `BrowserOAuthProviderType` union. In `executeFlow()`, add a branch for `'github-copilot'` that delegates to `loginGitHubCopilotOAuth()`, passing the device code emission callback which sends `oauth:code` to the renderer. In `onSuccess()`, add a branch for `'github-copilot'` that uses `'github-copilot'` as the runtime provider ID, creates/updates the `ProviderAccount` with `metadata.customModels` from the fetched model list, and saves OAuth tokens.
  - _Depends: 2.1, 2.2_
  - _Implements: DES-2, DES-4, REQ-2.1, REQ-2.3, REQ-2.4_

- [x] 3.2 Add github-copilot to OAuth route dispatch
  - In `electron/api/routes/providers.ts`, extend the OAuth start handler to route `'github-copilot'` to `browserOAuthManager.startFlow('github-copilot', ...)` alongside `'google'` and `'openai'`. The existing CRUD routes and runtime sync in the provider routes already handle arbitrary provider types, so no additional lifecycle code is needed.
  - _Depends: 3.1_
  - _Implements: DES-4, DES-5, REQ-4.1_

## Phase 4: Model Tier Enhancement

- [x] 4.1 Add `CopilotModelEntry` type and update `fetchCopilotModels` return type
  - In `electron/utils/github-copilot-oauth.ts`, export a `CopilotModelEntry` interface (`{ id: string; tier: 'free' | 'premium' }`). Update `fetchCopilotModels()` to parse tier metadata from the Copilot API response (e.g., `is_premium`, `model_policy`, or equivalent field) and return `CopilotModelEntry[]` instead of `string[]`. Models lacking tier metadata default to `'free'`. Update `COPILOT_FALLBACK_MODELS` to include default tier assignments.
  - _Depends: 2.2_
  - _Implements: DES-3, REQ-3.1, REQ-3.2_

- [x] 4.2 Add `modelTiers` to `ProviderAccount` metadata type
  - In `electron/shared/providers/types.ts`, extend the `metadata` interface on `ProviderAccount` with an optional `modelTiers?: Record<string, string>` field to store the tier classification of each model.
  - _Implements: DES-3, REQ-3.3_

- [x] 4.3 Update `BrowserOAuthManager.onSuccess` to store model tiers
  - In `electron/utils/browser-oauth.ts`, update the `'github-copilot'` branch of `onSuccess()` to extract tier information from `CopilotModelEntry[]` and store it as `metadata.modelTiers` (a `Record<string, string>` mapping model ID to tier) alongside `metadata.customModels`.
  - _Depends: 4.1, 4.2_
  - _Implements: DES-3, DES-2, REQ-3.3_

- [x] 4.4 Update `GitHubCopilotOAuthCredentials` models field
  - In `electron/utils/github-copilot-oauth.ts`, update the `GitHubCopilotOAuthCredentials` interface to change the `models` field from `string[]` to `CopilotModelEntry[]`.
  - _Depends: 4.1_
  - _Implements: DES-3_

## Phase 5: Model Tier UI

- [x] 5.1 Create `CopilotModelSelector` component
  - Create `src/components/settings/CopilotModelSelector.tsx`. The component accepts `models` (string array), `modelTiers` (record mapping ID to tier), `activeModel` (current model string), and an `onSelectModel` callback. It groups models into Free and Premium sections using the tier map, renders section headings, model entries with tier badges (distinct visual styling for Free vs Premium), and highlights the active model. The Premium section is hidden when no premium models exist.
  - _Implements: DES-7, REQ-6.1, REQ-6.2, REQ-6.3, REQ-6.6_

- [x] 5.2 Integrate `CopilotModelSelector` into `ProviderCard`
  - In `src/components/settings/ProvidersSettings.tsx`, within the `ProviderCard` component, when `account.vendorId === 'github-copilot'` and `account.metadata?.customModels` is populated, render the `CopilotModelSelector` component instead of the standard model text input. Wire the `onSelectModel` callback to update the account model via the existing `updateAccount()` flow.
  - _Depends: 5.1_
  - _Implements: DES-7, REQ-6.4, REQ-6.5_

## Phase 6: Acceptance Criteria Testing

- [x] 6.1 Test: GitHub Copilot appears in provider registry
  - Verify `getProviderDefinition('github-copilot')` returns the correct definition with `category: 'official'`, `supportedAuthModes: ['oauth_browser']`, and `isOAuth: true`.
  - Test type: unit
  - _Implements: REQ-1.1, REQ-1.2_

- [x] 6.2 Test: GitHub Copilot displays correct icon and label
  - Verify `getProviderIconUrl('github-copilot')` returns a defined SVG URL and the `PROVIDER_TYPE_INFO` entry has `name: 'GitHub Copilot'`.
  - Test type: unit
  - _Implements: REQ-1.3_

- [x] 6.3 Test: OAuth presents sign-in button and no API key input
  - Verify the GitHub Copilot provider type info has `isOAuth: true`, `requiresApiKey: false`, and does not have `supportsApiKey: true`, ensuring the UI renders only the OAuth sign-in button.
  - Test type: unit
  - _Implements: REQ-2.1_

- [x] 6.4 Test: GitHub Device Flow OAuth executes correctly
  - Mock the GitHub device code and token endpoints. Verify `loginGitHubCopilotOAuth()` emits the device code via callback, polls the token endpoint, and returns valid credentials on success. Verify it emits an error on timeout.
  - Test type: unit
  - _Depends: 2.1_
  - _Implements: REQ-2.2, REQ-2.5_

- [x] 6.5 Test: OAuth tokens are stored securely on success
  - Verify that `BrowserOAuthManager.onSuccess()` for `'github-copilot'` calls `secretStore.set()` with `type: 'oauth'` and the correct access/refresh tokens, and calls `saveOAuthTokenToOpenClaw()`.
  - Test type: integration
  - _Depends: 3.1_
  - _Implements: REQ-2.3_

- [x] 6.6 Test: authenticated account email is stored in account metadata
  - Verify that `BrowserOAuthManager.onSuccess()` for `'github-copilot'` creates a `ProviderAccount` with `metadata.email` populated from the OAuth credentials.
  - Test type: integration
  - _Depends: 3.1_
  - _Implements: REQ-2.4_

- [x] 6.7 Test: model list fetched and stored after authentication
  - Mock the Copilot models endpoint returning a list. Verify the models are stored in `ProviderAccount.metadata.customModels`.
  - Test type: unit
  - _Depends: 2.2_
  - _Implements: REQ-3.1_

- [x] 6.8 Test: model fetch failure uses fallback list
  - Mock the Copilot models endpoint returning an error. Verify a fallback model list is used and the provider account is still created successfully.
  - Test type: unit
  - _Depends: 2.2_
  - _Implements: REQ-3.4_

- [x] 6.9 Test: provider account syncs to runtime on creation
  - Verify that creating a Copilot provider account triggers `syncSavedProviderToRuntime()` via the POST `/api/provider-accounts` route.
  - Test type: integration
  - _Depends: 3.2_
  - _Implements: REQ-4.1_

- [x] 6.10 Test: set Copilot as default and delete account
  - Verify the Copilot account can be set as default via PUT `/api/provider-accounts/default` and deleted via DELETE `/api/provider-accounts/:id`, with OAuth secrets removed on deletion.
  - Test type: integration
  - _Depends: 3.2_
  - _Implements: REQ-4.2, REQ-4.3, REQ-4.4_

- [x] 6.11 Test: GitHub Copilot appears in Setup wizard provider list
  - Verify `SETUP_PROVIDERS` (alias of `PROVIDER_TYPE_INFO`) includes an entry with `id: 'github-copilot'` and `isOAuth: true`.
  - Test type: unit
  - _Implements: REQ-5.1_

- [x] 6.12 Test: onboarding marks configured after Copilot OAuth
  - Verify the setup flow recognizes a successfully created GitHub Copilot account as a configured provider, enabling progression to the next step.
  - Test type: integration
  - _Depends: 3.1_
  - _Implements: REQ-5.2, REQ-5.3_

- [x] 6.13 Test: model discovery returns tier metadata
  - Mock the Copilot models endpoint returning models with tier metadata. Verify `fetchCopilotModels()` returns `CopilotModelEntry[]` with correct tier classifications. Verify models without tier metadata default to `'free'`.
  - Test type: unit
  - _Depends: 4.1_
  - _Implements: REQ-3.2, REQ-3.3_

- [x] 6.14 Test: model tiers stored in account metadata
  - Verify that `BrowserOAuthManager.onSuccess()` for `'github-copilot'` stores `metadata.modelTiers` as a `Record<string, string>` alongside `metadata.customModels`.
  - Test type: integration
  - _Depends: 4.3_
  - _Implements: REQ-3.3_

- [x] 6.15 Test: fallback models include default tier assignments
  - Mock the Copilot models endpoint failing. Verify the fallback model list includes tier classifications for each model.
  - Test type: unit
  - _Depends: 4.1_
  - _Implements: REQ-3.4_

- [x] 6.16 Test: CopilotModelSelector renders grouped models with badges
  - Render `CopilotModelSelector` with a mix of free and premium models. Verify Free and Premium section headings are present, each model shows a tier badge, and the active model is highlighted.
  - Test type: unit
  - _Depends: 5.1_
  - _Implements: REQ-6.1, REQ-6.2, REQ-6.3_

- [x] 6.17 Test: CopilotModelSelector hides Premium section when no premium models
  - Render `CopilotModelSelector` with only free models. Verify the Premium section heading is not rendered and all models appear under the Free section.
  - Test type: unit
  - _Depends: 5.1_
  - _Implements: REQ-6.6_

- [x] 6.18 Test: selecting a model from categorized list updates provider account
  - Render `CopilotModelSelector` with models and simulate clicking a model entry. Verify the `onSelectModel` callback is invoked with the correct model ID.
  - Test type: unit
  - _Depends: 5.1_
  - _Implements: REQ-6.4, REQ-6.5_

## Phase 7: Final Checkpoint

- [x] 7.1 Verify all acceptance criteria
  - REQ-1: Confirm GitHub Copilot appears in Add Provider dialog and onboarding wizard with correct icon and label.
  - REQ-2: Confirm GitHub OAuth flow works end-to-end: sign-in button, browser authorization, token storage, email display, error handling.
  - REQ-3: Confirm model discovery fetches Copilot models with tier metadata, classifies as Free/Premium, stores tiers, and falls back with default tiers on failure.
  - REQ-4: Confirm provider lifecycle operations (create, default, delete, token revocation) work correctly.
  - REQ-5: Confirm onboarding setup integration functions as expected.
  - REQ-6: Confirm model list is displayed grouped by Free/Premium with badges, model selection works, and Premium section is hidden when no premium models exist.
  - Run `pnpm run lint && pnpm run typecheck && pnpm test` and resolve any failures.
  - _Implements: All requirements_

## Phase 8: Backend Tier Removal

- [x] 8.1 Remove `CopilotModelEntry` type and `classifyModelTier()` function
  - In `electron/utils/github-copilot-oauth.ts`, delete the `CopilotModelEntry` interface and the `classifyModelTier()` function entirely. These are no longer needed because the Copilot API does not return tier metadata.
  - _Implements: DES-8, REQ-7.4, REQ-7.5_

- [x] 8.2 Simplify `COPILOT_FALLBACK_MODELS` to `string[]`
  - In `electron/utils/github-copilot-oauth.ts`, change `COPILOT_FALLBACK_MODELS` from `CopilotModelEntry[]` (with `id`, `tier` fields) to a plain `string[]` of model IDs (e.g., `['gpt-4o', 'claude-sonnet-4', 'gemini-2.0-flash']`).
  - _Depends: 8.1_
  - _Implements: DES-3, DES-8, REQ-7.6_

- [x] 8.3 Simplify `fetchCopilotModels()` return type to `string[]`
  - In `electron/utils/github-copilot-oauth.ts`, update `fetchCopilotModels()` to return `string[]` instead of `CopilotModelEntry[]`. Extract only model IDs from the API response, without any tier classification. On failure, return `COPILOT_FALLBACK_MODELS` (now `string[]`).
  - _Depends: 8.1, 8.2_
  - _Implements: DES-3, DES-8, REQ-3.1, REQ-3.2_

- [x] 8.4 Simplify `GitHubCopilotOAuthCredentials.models` to `string[]`
  - In `electron/utils/github-copilot-oauth.ts`, update the `GitHubCopilotOAuthCredentials` interface to change the `models` field from `CopilotModelEntry[]` to `string[]`.
  - _Depends: 8.1_
  - _Implements: DES-3, DES-8, REQ-7.4_

- [x] 8.5 Remove `modelTiers` from backend `ProviderAccountMetadata`
  - In `electron/shared/providers/types.ts`, remove the `modelTiers?: Record<string, string>` field from the `ProviderAccountMetadata` interface (or equivalent metadata type).
  - _Implements: DES-8, REQ-7.3_

- [x] 8.6 Remove `modelTiers` from frontend provider metadata
  - In `src/lib/providers.ts`, remove the `modelTiers?: Record<string, string>` field from the frontend metadata interface.
  - _Depends: 8.5_
  - _Implements: DES-8, REQ-7.3_

- [x] 8.7 Remove `modelTiers` storage from `BrowserOAuthManager.onSuccess()`
  - In `electron/utils/browser-oauth.ts`, in the `'github-copilot'` branch of `onSuccess()`, remove the code that builds `modelTiers` from `CopilotModelEntry[]` and stores it in `metadata.modelTiers`. The `metadata.customModels` should now be set directly from the `string[]` models returned by the updated credentials.
  - _Depends: 8.3, 8.4, 8.5_
  - _Implements: DES-2, DES-8, REQ-7.3_

## Phase 9: UI Simplification

- [x] 9.1 Remove `!isEditing` guard on `CopilotModelSelector`
  - In `src/components/settings/ProvidersSettings.tsx`, remove the `!isEditing &&` condition from the `CopilotModelSelector` render block so the model selector is visible in both view mode and edit mode.
  - _Implements: DES-7, DES-8, REQ-6.1_

- [x] 9.2 Simplify `CopilotModelSelector` to flat model list
  - In `src/components/settings/CopilotModelSelector.tsx`, replace the tier-grouped model list (Free/Premium sections with tier badges) with a flat list of all models. Remove the `modelTiers` prop, remove tier grouping logic, remove tier badge rendering. The component should accept `models: string[]`, `activeModel: string`, and `onSelectModel` callback. Display all models in a single flat list with the active model highlighted.
  - _Depends: 8.6, 9.1_
  - _Implements: DES-7, DES-8, REQ-6.2, REQ-6.3, REQ-7.1, REQ-7.2_

- [x] 9.3 Update `CopilotModelSelector` props in `ProvidersSettings.tsx`
  - In `src/components/settings/ProvidersSettings.tsx`, update the `CopilotModelSelector` invocation to remove `modelTiers` prop and pass `models` as `string[]` from `account.metadata.customModels`.
  - _Depends: 9.2_
  - _Implements: DES-7, DES-8, REQ-7.2, REQ-7.3_

## Phase 10: Acceptance Criteria Testing (Tier Removal)

- [x] 10.1 Test: `CopilotModelEntry` type and `classifyModelTier` no longer exported
  - Verify that importing `CopilotModelEntry` or `classifyModelTier` from `github-copilot-oauth.ts` is not possible (they are deleted). Verify the module exports only `string[]`-based functions.
  - Test type: unit
  - _Depends: 8.1_
  - _Implements: REQ-7.4, REQ-7.5_

- [x] 10.2 Test: `COPILOT_FALLBACK_MODELS` is `string[]`
  - Verify `COPILOT_FALLBACK_MODELS` is a `string[]` containing only model ID strings, not objects with `tier` or `multiplier` fields.
  - Test type: unit
  - _Depends: 8.2_
  - _Implements: REQ-7.6_

- [x] 10.3 Test: `fetchCopilotModels()` returns `string[]`
  - Mock the Copilot models endpoint. Verify `fetchCopilotModels()` returns a `string[]` of model IDs. Verify no tier classification is performed on the response.
  - Test type: unit
  - _Depends: 8.3_
  - _Implements: REQ-3.1, REQ-3.2, REQ-7.1_

- [x] 10.4 Test: model fetch failure uses fallback `string[]` list
  - Mock the Copilot models endpoint returning an error. Verify `fetchCopilotModels()` returns `COPILOT_FALLBACK_MODELS` as `string[]`.
  - Test type: unit
  - _Depends: 8.3_
  - _Implements: REQ-3.3_

- [x] 10.5 Test: `modelTiers` not stored in account metadata
  - Verify that `BrowserOAuthManager.onSuccess()` for `'github-copilot'` does NOT store `metadata.modelTiers`. Verify `metadata.customModels` is a `string[]`.
  - Test type: integration
  - _Depends: 8.7_
  - _Implements: REQ-7.3_

- [x] 10.6 Test: CopilotModelSelector renders flat model list without tier badges
  - Render `CopilotModelSelector` with a list of model IDs. Verify all models appear in a single flat list. Verify no "Free", "Premium", or "Included" section headings are present. Verify no tier badges or multiplier indicators are rendered. Verify the active model is highlighted.
  - Test type: unit
  - _Depends: 9.2_
  - _Implements: REQ-6.2, REQ-7.1, REQ-7.2_

- [x] 10.7 Test: CopilotModelSelector renders in both view and edit mode
  - Verify the `CopilotModelSelector` is rendered when the provider card is in view mode and when it is in edit mode, confirming the `!isEditing` guard has been removed.
  - Test type: unit
  - _Depends: 9.1_
  - _Implements: REQ-6.1, REQ-6.3_

- [x] 10.8 Test: selecting a model from flat list updates provider account
  - Render `CopilotModelSelector` with models and simulate clicking a model entry. Verify the `onSelectModel` callback is invoked with the correct model ID.
  - Test type: unit
  - _Depends: 9.2_
  - _Implements: REQ-6.4_

## Phase 11: Final Checkpoint (Tier Removal)

- [x] 11.1 Verify all acceptance criteria after tier removal
  - REQ-1: Confirm GitHub Copilot appears in Add Provider dialog and onboarding wizard with correct icon and label.
  - REQ-2: Confirm GitHub OAuth flow works end-to-end: sign-in button, browser authorization, token storage, email display, error handling.
  - REQ-3: Confirm model discovery fetches model IDs as `string[]`, stores them in `metadata.customModels`, and falls back to `string[]` on failure.
  - REQ-4: Confirm provider lifecycle operations (create, default, delete, token revocation) work correctly.
  - REQ-5: Confirm onboarding setup integration functions as expected.
  - REQ-6: Confirm model selector displays a flat model list in both view and edit mode, model selection works correctly.
  - REQ-7: Confirm `CopilotModelEntry` type and `classifyModelTier()` function no longer exist. Confirm no tier badges, grouping, or multiplier indicators in selector. Confirm `modelTiers` not in metadata. Confirm `COPILOT_FALLBACK_MODELS` is `string[]`.
  - Run `pnpm run lint && pnpm run typecheck && pnpm test` and resolve any failures.
  - _Implements: All requirements_
