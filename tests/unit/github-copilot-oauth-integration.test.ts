import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@electron/services/providers/provider-service', () => {
  const mockService = {
    getAccount: vi.fn().mockResolvedValue(null),
    createAccount: vi.fn().mockImplementation(async (account: unknown) => account),
    getDefaultAccountId: vi.fn().mockResolvedValue(null),
    setDefaultAccount: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getProviderService: vi.fn(() => mockService),
    __mockService: mockService,
  };
});

vi.mock('@electron/services/secrets/secret-store', () => {
  const mockStore = {
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getSecretStore: vi.fn(() => mockStore),
    __mockStore: mockStore,
  };
});

vi.mock('@electron/utils/openclaw-auth', () => ({
  saveOAuthTokenToOpenClaw: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@electron/utils/gemini-cli-oauth', () => ({
  loginGeminiCliOAuth: vi.fn(),
}));

vi.mock('@electron/utils/openai-codex-oauth', () => ({
  loginOpenAICodexOAuth: vi.fn(),
}));

vi.mock('@electron/utils/github-copilot-oauth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@electron/utils/github-copilot-oauth')>();
  return {
    ...actual,
    loginGitHubCopilotOAuth: vi.fn(),
  };
});

vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@electron/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { getProviderService, __mockService } from '@electron/services/providers/provider-service';
import { getSecretStore, __mockStore } from '@electron/services/secrets/secret-store';
import { saveOAuthTokenToOpenClaw } from '@electron/utils/openclaw-auth';
import { loginGitHubCopilotOAuth } from '@electron/utils/github-copilot-oauth';
import { browserOAuthManager } from '@electron/utils/browser-oauth';

describe('GitHub Copilot OAuth integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores OAuth tokens securely and creates account on successful flow', async () => {
    const mockCredentials = {
      access: 'ghu_test_token_abc123',
      refresh: 'ghr_refresh_abc123',
      expires: Date.now() + 28800000,
      email: 'dev@github.com',
      username: 'devuser',
      models: ['gpt-4o', 'claude-sonnet-4'],
    };

    vi.mocked(loginGitHubCopilotOAuth).mockImplementation(async (callbacks) => {
      callbacks.onDeviceCode({
        userCode: 'ABCD-1234',
        verificationUri: 'https://github.com/login/device',
      });
      return mockCredentials;
    });

    const successPromise = new Promise<void>((resolve) => {
      browserOAuthManager.once('oauth:success', () => resolve());
    });

    await browserOAuthManager.startFlow('github-copilot', {
      accountId: 'github-copilot-test',
      label: 'Test Copilot',
    });

    await successPromise;

    const providerService = __mockService as ReturnType<typeof getProviderService>;
    const secretStore = __mockStore as ReturnType<typeof getSecretStore>;

    expect(providerService.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'github-copilot-test',
        vendorId: 'github-copilot',
        authMode: 'oauth_browser',
        metadata: expect.objectContaining({
          email: 'dev@github.com',
          resourceUrl: 'github-copilot',
          customModels: ['gpt-4o', 'claude-sonnet-4'],
        }),
      }),
    );

    const createdAccount = vi.mocked(providerService.createAccount).mock.calls[0][0] as Record<string, unknown>;
    const metadata = createdAccount.metadata as Record<string, unknown>;
    expect(metadata).not.toHaveProperty('modelTiers');

    expect(secretStore.set).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'oauth',
        accountId: 'github-copilot-test',
        accessToken: 'ghu_test_token_abc123',
        refreshToken: 'ghr_refresh_abc123',
        email: 'dev@github.com',
      }),
    );

    expect(saveOAuthTokenToOpenClaw).toHaveBeenCalledWith(
      'github-copilot',
      expect.objectContaining({
        access: 'ghu_test_token_abc123',
        refresh: 'ghr_refresh_abc123',
      }),
    );
  });

  it('stores username as email fallback in account metadata', async () => {
    const mockCredentials = {
      access: 'ghu_token',
      refresh: 'ghr_refresh',
      expires: Date.now() + 28800000,
      email: undefined,
      username: 'githubuser',
      models: ['gpt-4o'],
    };

    vi.mocked(loginGitHubCopilotOAuth).mockImplementation(async (callbacks) => {
      callbacks.onDeviceCode({
        userCode: 'EFGH-5678',
        verificationUri: 'https://github.com/login/device',
      });
      return mockCredentials;
    });

    const successPromise = new Promise<void>((resolve) => {
      browserOAuthManager.once('oauth:success', () => resolve());
    });

    await browserOAuthManager.startFlow('github-copilot', {
      accountId: 'copilot-noemail',
    });

    await successPromise;

    const providerService = __mockService as ReturnType<typeof getProviderService>;
    expect(providerService.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          email: 'githubuser',
        }),
      }),
    );
  });

  it('does not store modelTiers in account metadata', async () => {
    const mockCredentials = {
      access: 'ghu_tier_token',
      refresh: 'ghr_tier_refresh',
      expires: Date.now() + 28800000,
      email: 'tier@github.com',
      username: 'tieruser',
      models: ['gpt-4o', 'o3-mini', 'gemini-2.0-flash'],
    };

    vi.mocked(loginGitHubCopilotOAuth).mockImplementation(async (callbacks) => {
      callbacks.onDeviceCode({
        userCode: 'TIER-1234',
        verificationUri: 'https://github.com/login/device',
      });
      return mockCredentials;
    });

    const successPromise = new Promise<void>((resolve) => {
      browserOAuthManager.once('oauth:success', () => resolve());
    });

    await browserOAuthManager.startFlow('github-copilot', {
      accountId: 'copilot-tiers',
    });

    await successPromise;

    const providerService = __mockService as ReturnType<typeof getProviderService>;
    expect(providerService.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          customModels: ['gpt-4o', 'o3-mini', 'gemini-2.0-flash'],
        }),
      }),
    );

    const createdAccount = vi.mocked(providerService.createAccount).mock.calls[0][0] as Record<string, unknown>;
    const metadata = createdAccount.metadata as Record<string, unknown>;
    expect(metadata).not.toHaveProperty('modelTiers');
  });

  it('emits error when OAuth flow fails', async () => {
    vi.mocked(loginGitHubCopilotOAuth).mockRejectedValue(
      new Error('Device code expired'),
    );

    const errorPromise = new Promise<{ message: string }>((resolve) => {
      browserOAuthManager.once('oauth:error', (data) => resolve(data));
    });

    await browserOAuthManager.startFlow('github-copilot');

    const error = await errorPromise;
    expect(error.message).toContain('Device code expired');
  });
});
