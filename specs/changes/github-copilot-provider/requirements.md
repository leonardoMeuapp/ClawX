# Requirements

## Overview

ClawX currently supports 12 AI providers (Anthropic, OpenAI, Google, OpenRouter, etc.) but does not offer GitHub Copilot as a provider option. Many developers already have GitHub Copilot subscriptions that include access to AI models (GPT-4o, Claude Sonnet, Gemini, etc.) through the Copilot API.

This change adds GitHub Copilot as a first-class provider in ClawX, allowing users to authenticate via GitHub OAuth and access their available Copilot models. The provider appears both in the Settings provider addition dialog and in the onboarding setup wizard, following the same patterns as existing OAuth-based providers (OpenAI, Google).

The provider card displays available models in a flat list and allows selection in both view and edit modes.

The initial implementation included model tier classification (free/premium) with tier badges and grouping in the model selector. This classification has been removed because the Copilot API does not return tier or multiplier metadata for models. REQ-7 documents the explicit removal of all tier-related code, types, and UI elements from the existing implementation.

## Glossary

| Term | Definition |
|------|------------|
| Copilot Provider | A ClawX provider entry representing GitHub Copilot, using the GitHub Copilot API to access AI models |
| Copilot API | The GitHub Copilot Chat Completions API endpoint that exposes AI models available under a user's Copilot subscription |
| GitHub OAuth | The OAuth 2.0 authorization flow using GitHub as the identity provider, granting access to Copilot resources |
| Model Tier Classification | A previously-implemented categorization of Copilot models into free/premium tiers — now removed because the API does not provide this metadata |

## Assumptions

- The Copilot API follows the OpenAI Chat Completions protocol, so the existing `openai-completions` API protocol can be reused.
- GitHub OAuth tokens obtained through the login flow grant access to the Copilot Chat Completions API.
- The list of available models depends on the user's Copilot subscription tier and can be fetched dynamically from the Copilot API.
- The Copilot provider does not support API key authentication — only OAuth browser login is available.
- The GitHub OAuth flow follows the same browser-based pattern already used by OpenAI and Google providers.

## Requirements

### REQ-1: Copilot provider registration

**User Story:** As a developer with a GitHub Copilot subscription, I want to see GitHub Copilot listed as a provider option, so that I can use my Copilot subscription to access AI models in ClawX.

#### Acceptance Criteria
1.1 THE ClawX application SHALL display GitHub Copilot as an available provider in the Add Provider dialog within Settings.
1.2 THE ClawX application SHALL display GitHub Copilot as an available provider in the onboarding setup wizard provider selection step.
1.3 THE ClawX application SHALL display the GitHub Copilot provider with a recognizable GitHub Copilot icon and label.

### REQ-2: GitHub OAuth authentication

**User Story:** As a developer, I want to sign in with my GitHub account to authenticate with Copilot, so that I can securely connect my Copilot subscription without managing API keys.

#### Acceptance Criteria
2.1 WHEN the user selects the GitHub Copilot provider, THEN the ClawX application SHALL present a "Sign in with GitHub" button as the sole authentication method.
2.2 WHEN the user clicks the "Sign in with GitHub" button, THEN the ClawX application SHALL open the GitHub OAuth authorization page in the user's default external browser.
2.3 WHEN the GitHub OAuth flow completes successfully, THEN the ClawX application SHALL store the OAuth tokens securely in the OS keychain.
2.4 WHEN the GitHub OAuth flow completes successfully, THEN the ClawX application SHALL display the authenticated GitHub account email or username in the provider card.
2.5 IF the GitHub OAuth flow fails or is cancelled by the user, THEN the ClawX application SHALL display an error message and allow the user to retry.

### REQ-3: Copilot model discovery

**User Story:** As a developer, I want ClawX to automatically discover which Copilot models are available for my account, so that I can choose which model to use.

#### Acceptance Criteria
3.1 WHEN the user successfully authenticates with GitHub Copilot, THEN the ClawX application SHALL fetch the list of available models from the Copilot API.
3.2 WHEN model data is fetched, THEN the ClawX application SHALL store the list of model identifiers.
3.3 IF the model list fetch fails, THEN the ClawX application SHALL use a predefined fallback list of common Copilot models.

### REQ-4: Copilot provider lifecycle

**User Story:** As a developer, I want to manage my Copilot provider account like any other provider, so that I can enable, disable, set as default, or remove it as needed.

#### Acceptance Criteria
4.1 WHEN the user adds a Copilot provider account, THEN the ClawX application SHALL synchronize the provider configuration with the OpenClaw Gateway runtime.
4.2 THE ClawX application SHALL allow the user to set the Copilot provider as the default provider.
4.3 THE ClawX application SHALL allow the user to delete the Copilot provider account.
4.4 WHEN the user deletes the Copilot provider account, THEN the ClawX application SHALL revoke the stored OAuth tokens from the OS keychain.

### REQ-5: Onboarding setup integration

**User Story:** As a new user setting up ClawX for the first time, I want to be able to choose GitHub Copilot during onboarding, so that I can start using ClawX immediately with my existing Copilot subscription.

#### Acceptance Criteria
5.1 WHEN the user reaches the provider selection step in the onboarding wizard, THEN the ClawX application SHALL display GitHub Copilot as a selectable provider option.
5.2 WHEN the user selects GitHub Copilot during onboarding and completes OAuth login, THEN the ClawX application SHALL mark the provider step as configured and enable the "Next" button.
5.3 WHEN the user completes onboarding with GitHub Copilot configured, THEN the ClawX application SHALL set the Copilot provider as the default provider.

### REQ-6: Model selector display

**User Story:** As a developer, I want to see my available Copilot models in the provider card and be able to select one, so that I can choose which model to use.

#### Acceptance Criteria
6.1 WHILE the GitHub Copilot provider is configured, the ClawX application SHALL display the model selector in the provider card in both view mode and edit mode.
6.2 WHEN displaying the model list, THEN the ClawX application SHALL show all available models in a flat list.
6.3 THE ClawX application SHALL allow the user to select any available model from the list as the active model for the Copilot provider in both view mode and edit mode.
6.4 WHEN the user selects a model from the list, THEN the ClawX application SHALL update the active model for the Copilot provider account.

### REQ-7: Tier classification removal

**User Story:** As a developer maintaining ClawX, I want the Copilot provider to not attempt tier classification of models, because the Copilot API does not expose tier or multiplier metadata and the existing classification code produces incorrect results.

#### Acceptance Criteria
7.1 THE ClawX application SHALL NOT classify Copilot models into tiers (e.g., "free", "premium").
7.2 THE ClawX application SHALL NOT display tier badges, tier grouping headers, or multiplier indicators in the Copilot model selector.
7.3 THE ClawX application SHALL NOT store `modelTiers` or `modelMultipliers` in the Copilot provider account metadata.
7.4 THE `CopilotModelEntry` type (containing `id`, `tier`, and optional `multiplier` fields) SHALL be removed; models SHALL be stored as plain `string[]` identifiers.
7.5 THE `classifyModelTier()` function SHALL be removed from the Copilot OAuth utility.
7.6 THE `COPILOT_FALLBACK_MODELS` constant SHALL contain only model ID strings, not structured objects with tier information.
