import { logger } from './logger';
import { proxyAwareFetch } from './proxy-fetch';

const GITHUB_CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_API_URL = 'https://api.github.com/user';
const COPILOT_MODELS_URL = 'https://api.githubcopilot.com/models';
const SCOPE = 'read:user copilot';

const POLL_INTERVAL_DEFAULT_MS = 5000;
const POLL_TIMEOUT_MS = 300_000;

export const COPILOT_FALLBACK_MODELS: string[] = [
  'gpt-4o',
  'gpt-4.1',
  'claude-sonnet-4',
  'gemini-2.0-flash',
  'o3-mini',
];

const COPILOT_RUNTIME_PROVIDER_ID = 'github-copilot';
const COPILOT_DEFAULT_MODEL = 'gpt-4o';

export { COPILOT_RUNTIME_PROVIDER_ID, COPILOT_DEFAULT_MODEL };

export interface GitHubCopilotOAuthCredentials {
  access: string;
  refresh: string;
  expires: number;
  email?: string;
  username?: string;
  models: string[];
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenSuccessResponse {
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface TokenErrorResponse {
  error: string;
  error_description?: string;
}

interface DeviceCodeCallbacks {
  onDeviceCode: (data: { userCode: string; verificationUri: string }) => void;
  onOpenUrl: (url: string) => Promise<void>;
  isCancelled: () => boolean;
}

async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await proxyAwareFetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: SCOPE,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub device code request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<DeviceCodeResponse>;
}

async function pollForToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
  isCancelled: () => boolean,
): Promise<TokenSuccessResponse> {
  const pollIntervalMs = Math.max(interval, 5) * 1000;
  const deadline = Date.now() + Math.min(expiresIn * 1000, POLL_TIMEOUT_MS);

  while (Date.now() < deadline) {
    if (isCancelled()) {
      throw new Error('OAuth flow cancelled');
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    if (isCancelled()) {
      throw new Error('OAuth flow cancelled');
    }

    const response = await proxyAwareFetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = await response.json() as TokenSuccessResponse | TokenErrorResponse;

    if ('access_token' in data) {
      return data as TokenSuccessResponse;
    }

    const errorData = data as TokenErrorResponse;
    if (errorData.error === 'authorization_pending') {
      continue;
    }
    if (errorData.error === 'slow_down') {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      continue;
    }
    if (errorData.error === 'expired_token') {
      throw new Error('Device code expired. Please try again.');
    }
    if (errorData.error === 'access_denied') {
      throw new Error('Authorization was denied by the user.');
    }

    throw new Error(
      `GitHub OAuth error: ${errorData.error}${errorData.error_description ? ` — ${errorData.error_description}` : ''}`
    );
  }

  throw new Error('GitHub OAuth polling timed out. Please try again.');
}

async function fetchGitHubUser(
  accessToken: string,
): Promise<{ email?: string; username?: string }> {
  try {
    const response = await proxyAwareFetch(USER_API_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      logger.warn(`[GitHubCopilotOAuth] Failed to fetch user info (${response.status})`);
      return {};
    }

    const user = await response.json() as { email?: string; login?: string };
    return {
      email: user.email ?? undefined,
      username: user.login ?? undefined,
    };
  } catch (error) {
    logger.warn('[GitHubCopilotOAuth] Failed to fetch user info:', error);
    return {};
  }
}

export async function fetchCopilotModels(
  accessToken: string,
): Promise<string[]> {
  try {
    const response = await proxyAwareFetch(COPILOT_MODELS_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      logger.warn(`[GitHubCopilotOAuth] Failed to fetch models (${response.status})`);
      return COPILOT_FALLBACK_MODELS;
    }

    const data = await response.json() as { data?: Array<{ id: string }> };
    const models = data?.data;
    if (!Array.isArray(models) || models.length === 0) {
      logger.warn('[GitHubCopilotOAuth] Empty model list, using fallback');
      return COPILOT_FALLBACK_MODELS;
    }

    return models.map((m) => m.id);
  } catch (error) {
    logger.warn('[GitHubCopilotOAuth] Failed to fetch models:', error);
    return COPILOT_FALLBACK_MODELS;
  }
}

export async function loginGitHubCopilotOAuth(
  callbacks: DeviceCodeCallbacks,
): Promise<GitHubCopilotOAuthCredentials> {
  logger.info('[GitHubCopilotOAuth] Starting GitHub Device Flow');

  const deviceCodeResponse = await requestDeviceCode();

  callbacks.onDeviceCode({
    userCode: deviceCodeResponse.user_code,
    verificationUri: deviceCodeResponse.verification_uri,
  });

  await callbacks.onOpenUrl(deviceCodeResponse.verification_uri);

  const tokenResponse = await pollForToken(
    deviceCodeResponse.device_code,
    deviceCodeResponse.interval ?? (POLL_INTERVAL_DEFAULT_MS / 1000),
    deviceCodeResponse.expires_in,
    callbacks.isCancelled,
  );

  logger.info('[GitHubCopilotOAuth] Token obtained, fetching user info and models');

  const [userInfo, models] = await Promise.all([
    fetchGitHubUser(tokenResponse.access_token),
    fetchCopilotModels(tokenResponse.access_token),
  ]);

  const tokenExpiresIn = 28800;

  return {
    access: tokenResponse.access_token,
    refresh: tokenResponse.refresh_token ?? '',
    expires: Date.now() + tokenExpiresIn * 1000,
    email: userInfo.email,
    username: userInfo.username,
    models,
  };
}
