import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PROVIDER_TYPES,
  PROVIDER_TYPE_INFO,
  SETUP_PROVIDERS,
} from '@/lib/providers';
import {
  BUILTIN_PROVIDER_TYPES,
  getProviderDefaultModel,
  getProviderEnvVar,
} from '@electron/utils/provider-registry';
import {
  getProviderDefinition,
  getProviderBackendConfig,
} from '@electron/shared/providers/registry';
import { providerIcons } from '@/assets/providers';

// === Task 4.1: Cursor provider definition is registered correctly ===

describe('Cursor provider registration', () => {
  it('includes cursor in PROVIDER_TYPES and BUILTIN_PROVIDER_TYPES', () => {
    expect(PROVIDER_TYPES).toContain('cursor');
    expect(BUILTIN_PROVIDER_TYPES).toContain('cursor');
  });

  it('has correct provider definition in backend registry', () => {
    const definition = getProviderDefinition('cursor');

    expect(definition).toBeDefined();
    expect(definition).toMatchObject({
      id: 'cursor',
      name: 'Cursor',
      category: 'official',
      defaultModelId: 'claude-4-sonnet-thinking',
      supportedAuthModes: ['api_key'],
      defaultAuthMode: 'api_key',
      supportsApiKey: true,
      requiresApiKey: true,
    });
  });

  it('has correct backend config with Cursor API base URL', () => {
    const config = getProviderBackendConfig('cursor');

    expect(config).toEqual({
      baseUrl: 'https://api.cursor.com',
      api: 'openai-completions',
      apiKeyEnv: 'CURSOR_API_KEY',
    });
  });

  it('uses CURSOR_API_KEY environment variable', () => {
    expect(getProviderEnvVar('cursor')).toBe('CURSOR_API_KEY');
  });

  it('has claude-4-sonnet-thinking as default model', () => {
    expect(getProviderDefaultModel('cursor')).toBe('claude-4-sonnet-thinking');
  });

  it('has a provider icon registered', () => {
    expect(providerIcons.cursor).toBeDefined();
  });
});

// === Task 4.2: Cursor appears in setup wizard provider list ===

describe('Cursor in setup wizard', () => {
  it('appears in SETUP_PROVIDERS with API key configuration', () => {
    const cursor = SETUP_PROVIDERS.find((p) => p.id === 'cursor');

    expect(cursor).toBeDefined();
    expect(cursor).toMatchObject({
      id: 'cursor',
      name: 'Cursor',
      requiresApiKey: true,
    });
    expect(cursor).not.toHaveProperty('isOAuth', true);
  });
});

// === Task 4.3: Cursor appears in Models screen provider list ===

describe('Cursor in provider type info', () => {
  it('is present in PROVIDER_TYPE_INFO with correct configuration', () => {
    const cursor = PROVIDER_TYPE_INFO.find((p) => p.id === 'cursor');

    expect(cursor).toBeDefined();
    expect(cursor).toMatchObject({
      id: 'cursor',
      name: 'Cursor',
      requiresApiKey: true,
      defaultModelId: 'claude-4-sonnet-thinking',
      apiKeyUrl: 'https://cursor.com/settings',
      docsUrl: 'https://cursor.com/docs/api',
    });
    expect(cursor).not.toHaveProperty('isOAuth', true);
  });
});

// === Task 4.7: Cursor API key validation succeeds and fails ===

describe('Cursor API key validation', () => {
  const proxyAwareFetch = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    proxyAwareFetch.mockReset();
    vi.doMock('@electron/utils/proxy-fetch', () => ({
      proxyAwareFetch,
    }));
  });

  it('validates a valid key against /v0/me with Basic Auth', async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ userEmail: 'user@example.com', apiKeyName: 'test-key' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { validateApiKeyWithProvider } = await import(
      '@electron/services/providers/provider-validation'
    );
    const result = await validateApiKeyWithProvider('cursor', 'key_abc123');

    expect(result).toMatchObject({ valid: true, status: 200 });
    expect(proxyAwareFetch).toHaveBeenCalledWith(
      'https://api.cursor.com/v0/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      }),
    );
  });

  it('returns invalid for 401 response', async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { validateApiKeyWithProvider } = await import(
      '@electron/services/providers/provider-validation'
    );
    const result = await validateApiKeyWithProvider('cursor', 'key_invalid');

    expect(result).toMatchObject({
      valid: false,
      status: 401,
      error: expect.stringContaining('Invalid or expired'),
    });
  });

  it('handles connection errors gracefully', async () => {
    proxyAwareFetch.mockRejectedValueOnce(new Error('Network timeout'));

    const { validateApiKeyWithProvider } = await import(
      '@electron/services/providers/provider-validation'
    );
    const result = await validateApiKeyWithProvider('cursor', 'key_test');

    expect(result).toMatchObject({
      valid: false,
      error: expect.stringContaining('Network timeout'),
    });
  });
});

// === Task 4.8: Cursor models are fetched with fallback ===

describe('Cursor model fetching', () => {
  const proxyAwareFetch = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    proxyAwareFetch.mockReset();
    vi.doMock('@electron/utils/proxy-fetch', () => ({
      proxyAwareFetch,
    }));
  });

  it('fetches and parses models from /v0/models', async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ models: ['claude-4-sonnet', 'gpt-5', 'o4-mini'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { fetchCursorModels, invalidateCursorModelsCache } = await import(
      '@electron/services/providers/cursor-models'
    );
    invalidateCursorModelsCache();

    const models = await fetchCursorModels(
      { type: 'api_key', accountId: 'cursor', apiKey: 'key_test' },
      'cursor',
    );

    expect(models).toHaveLength(3);
    expect(models[0]).toMatchObject({
      id: 'claude-4-sonnet',
      name: 'claude-4-sonnet',
      vendorId: 'cursor',
      source: 'remote',
    });
    expect(models.map((m) => m.id)).toEqual(['claude-4-sonnet', 'gpt-5', 'o4-mini']);
  });

  it('returns fallback default model on API failure', async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    const { fetchCursorModels, invalidateCursorModelsCache } = await import(
      '@electron/services/providers/cursor-models'
    );
    invalidateCursorModelsCache();

    const models = await fetchCursorModels(
      { type: 'api_key', accountId: 'cursor', apiKey: 'key_test' },
      'cursor',
    );

    expect(models).toHaveLength(1);
    expect(models[0]).toMatchObject({
      id: 'claude-4-sonnet-thinking',
      vendorId: 'cursor',
      source: 'builtin',
    });
  });

  it('returns fallback on network error', async () => {
    proxyAwareFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const { fetchCursorModels, invalidateCursorModelsCache } = await import(
      '@electron/services/providers/cursor-models'
    );
    invalidateCursorModelsCache();

    const models = await fetchCursorModels(
      { type: 'api_key', accountId: 'cursor', apiKey: 'key_fallback_test' },
      'cursor',
    );

    expect(models.length).toBeGreaterThanOrEqual(1);
    expect(models[0].id).toBe('claude-4-sonnet-thinking');
  });

  it('uses cache within TTL window', async () => {
    proxyAwareFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ models: ['model-a', 'model-b'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { fetchCursorModels, invalidateCursorModelsCache } = await import(
      '@electron/services/providers/cursor-models'
    );
    invalidateCursorModelsCache();

    const secret = { type: 'api_key' as const, accountId: 'cursor', apiKey: 'key_test' };
    const firstResult = await fetchCursorModels(secret, 'cursor');
    const secondResult = await fetchCursorModels(secret, 'cursor');

    expect(proxyAwareFetch).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual(secondResult);
  });

  it('bypasses cache when skipCache is true', async () => {
    proxyAwareFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ models: ['model-a'] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ models: ['model-a', 'model-b'] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    const { fetchCursorModels, invalidateCursorModelsCache } = await import(
      '@electron/services/providers/cursor-models'
    );
    invalidateCursorModelsCache();

    const secret = { type: 'api_key' as const, accountId: 'cursor', apiKey: 'key_test' };
    await fetchCursorModels(secret, 'cursor');
    const secondResult = await fetchCursorModels(secret, 'cursor', { skipCache: true });

    expect(proxyAwareFetch).toHaveBeenCalledTimes(2);
    expect(secondResult).toHaveLength(2);
  });
});
