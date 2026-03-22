# Requirements

## Overview

ClawX currently supports 12 AI providers but does not include Cursor as a provider option. Users with an active Cursor subscription have access to models served through Cursor's Cloud API (`https://api.cursor.com`), including models like `claude-4-sonnet-thinking`, `gpt-5.2`, and `claude-4.5-sonnet-thinking`.

This change adds Cursor as a new official provider in the Models management screen and in the onboarding setup wizard. The provider uses API key authentication with HTTP Basic Auth, consistent with Cursor's documented authentication mechanism. Users create API keys in the Cursor Dashboard and enter them in ClawX to configure the provider.

## Glossary

| Term | Definition |
|------|------------|
| Cursor API | The Cursor Cloud API at `https://api.cursor.com` that exposes model listing (`/v0/models`) and identity verification (`/v0/me`) endpoints. |
| Basic Authentication | HTTP authentication scheme where the API key is used as the username with an empty password, encoded as `Authorization: Basic {base64(apiKey + ':')}`. |
| Provider Account | A configured credential entry in ClawX linking a specific AI provider vendor to stored authentication secrets. |
| Provider Definition | A static registration entry describing a provider's identity, category, supported auth modes, default model, and base URL. |

## Assumptions

- The Cursor API `GET /v0/models` endpoint returns the list of models available to the authenticated user and can be used to dynamically populate the model selector.
- The Cursor API `GET /v0/me` endpoint can be used to validate credentials and retrieve the authenticated user's email address.
- The Cursor API uses the OpenAI-compatible completions protocol (`openai-completions`) for model inference, consistent with how other compatible providers work in OpenClaw.
- Cursor API keys follow the format `key_xxxx...` and are created by team administrators in the Cursor Dashboard.

## Requirements

### REQ-1: Cursor provider registration

**User Story:** As a user, I want Cursor to appear as an available AI provider in ClawX, so that I can configure and use models served through my Cursor subscription.

#### Acceptance Criteria

1.1 THE application SHALL include Cursor in the list of available provider vendors with category `official`, vendor identifier `cursor`, display name `Cursor`, and base URL `https://api.cursor.com`.

1.2 THE application SHALL register Cursor with `api_key` as the sole supported authentication mode and as the default mode.

1.3 THE application SHALL assign the API protocol `openai-completions` to the Cursor provider.

### REQ-2: Cursor provider in onboarding setup

**User Story:** As a new user, I want to see Cursor as a provider option during the onboarding setup wizard, so that I can configure my Cursor account before first use.

#### Acceptance Criteria

2.1 WHEN the user reaches the provider configuration step of the setup wizard, THEN the application SHALL display Cursor as a selectable provider alongside existing providers.

2.2 WHEN the user selects Cursor in the setup wizard, THEN the application SHALL display an API key input field.

2.3 THE application SHALL display a link to the Cursor Dashboard where users can create API keys.

### REQ-3: Cursor provider in Models management screen

**User Story:** As an existing user, I want to add, edit, and remove Cursor provider accounts from the Models management screen, so that I can manage my Cursor credentials after initial setup.

#### Acceptance Criteria

3.1 WHEN the user opens the Models page or the AI Providers section in Settings, THEN the application SHALL display Cursor as an available provider that can be added.

3.2 WHEN the user adds a new Cursor provider account, THEN the application SHALL present an API key input field for authentication.

3.3 WHEN the user removes a Cursor provider account, THEN the application SHALL delete the associated stored credentials.

### REQ-4: Cursor API key authentication

**User Story:** As a user who has a Cursor API key, I want to enter it to configure the Cursor provider, so that ClawX can access Cursor's models on my behalf.

#### Acceptance Criteria

4.1 WHEN the user submits a Cursor API key, THEN the application SHALL validate the key by calling the Cursor API identity endpoint (`GET /v0/me`) using HTTP Basic Authentication.

4.2 WHEN the Cursor API key validation succeeds, THEN the application SHALL store the key securely in the OS keychain and create a provider account record.

4.3 IF the Cursor API key validation fails, THEN the application SHALL display an error message indicating the key is invalid.

### REQ-5: Cursor model listing

**User Story:** As a user with a configured Cursor account, I want to see the models available through my Cursor subscription, so that I can select which model to use for AI tasks.

#### Acceptance Criteria

5.1 WHEN a Cursor provider account is configured and enabled, THEN the application SHALL fetch the list of available models from the Cursor API models endpoint.

5.2 THE application SHALL display fetched Cursor models in the model selector alongside models from other configured providers.

5.3 IF the Cursor models endpoint returns an error or is unreachable, THEN the application SHALL display a fallback default model and log the error.

### REQ-6: Cursor credential validation

**User Story:** As a user, I want the application to verify my Cursor credentials are valid, so that I am notified of issues before attempting to use models.

#### Acceptance Criteria

6.1 WHEN the user saves a Cursor provider account, THEN the application SHALL validate the credentials by calling the Cursor identity endpoint (`GET /v0/me`) with HTTP Basic Authentication.

6.2 WHEN credential validation succeeds, THEN the application SHALL display the authenticated user's email in the provider account details.

6.3 IF credential validation fails with HTTP 401, THEN the application SHALL display an error indicating invalid or expired credentials.

### REQ-7: Cursor provider icon

**User Story:** As a user, I want the Cursor provider to display a recognizable brand icon, so that I can quickly identify it among the list of configured providers.

#### Acceptance Criteria

7.1 THE application SHALL include a dedicated SVG icon file for the Cursor provider in the provider assets directory.

7.2 THE application SHALL register the Cursor SVG icon in the provider icons map so that it is rendered wherever provider icons are displayed.
