import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  PROVIDER_TYPES,
  PROVIDER_TYPE_INFO,
  BUILTIN_PROVIDER_TYPES as FRONTEND_BUILTIN_TYPES,
  type ProviderTypeInfo,
} from '@/lib/providers';
import { providerIcons } from '@/assets/providers';
import {
  BUILTIN_PROVIDER_TYPES,
  getProviderConfig,
} from '@electron/utils/provider-registry';
import {
  getProviderDefinition,
} from '@electron/shared/providers/registry';
import {
  COPILOT_FALLBACK_MODELS,
  fetchCopilotModels,
} from '@electron/utils/github-copilot-oauth';

describe('GitHub Copilot provider', () => {
  describe('provider registry', () => {
    it('appears in backend PROVIDER_TYPES and BUILTIN_PROVIDER_TYPES', () => {
      expect(BUILTIN_PROVIDER_TYPES).toContain('github-copilot');
    });

    it('has a correct ProviderDefinition in the registry', () => {
      const definition = getProviderDefinition('github-copilot');
      expect(definition).toBeDefined();
      expect(definition).toMatchObject({
        id: 'github-copilot',
        name: 'GitHub Copilot',
        category: 'official',
        isOAuth: true,
        requiresApiKey: false,
        supportedAuthModes: ['oauth_browser'],
        defaultAuthMode: 'oauth_browser',
        supportsMultipleAccounts: true,
      });
    });

    it('has a provider backend config targeting the Copilot API', () => {
      const config = getProviderConfig('github-copilot');
      expect(config).toBeDefined();
      expect(config).toMatchObject({
        baseUrl: 'https://api.githubcopilot.com',
        api: 'openai-completions',
      });
    });
  });

  describe('frontend metadata', () => {
    it('appears in frontend PROVIDER_TYPES and BUILTIN_PROVIDER_TYPES', () => {
      expect(PROVIDER_TYPES).toContain('github-copilot');
      expect(FRONTEND_BUILTIN_TYPES).toContain('github-copilot');
    });

    it('has a correct PROVIDER_TYPE_INFO entry', () => {
      const info = PROVIDER_TYPE_INFO.find(
        (p: ProviderTypeInfo) => p.id === 'github-copilot',
      );
      expect(info).toBeDefined();
      expect(info).toMatchObject({
        id: 'github-copilot',
        name: 'GitHub Copilot',
        isOAuth: true,
        requiresApiKey: false,
      });
    });

    it('does not support API key authentication', () => {
      const info = PROVIDER_TYPE_INFO.find(
        (p: ProviderTypeInfo) => p.id === 'github-copilot',
      );
      expect(info).toBeDefined();
      expect(info!.isOAuth).toBe(true);
      expect(info!.requiresApiKey).toBe(false);
      expect(info!.supportsApiKey).toBeUndefined();
    });

    it('appears in SETUP_PROVIDERS (same as PROVIDER_TYPE_INFO)', () => {
      const setupEntry = PROVIDER_TYPE_INFO.find(
        (p: ProviderTypeInfo) => p.id === 'github-copilot',
      );
      expect(setupEntry).toBeDefined();
      expect(setupEntry!.isOAuth).toBe(true);
    });
  });

  describe('icon asset', () => {
    it('has a registered SVG icon', () => {
      expect(providerIcons['github-copilot']).toBeDefined();
      expect(typeof providerIcons['github-copilot']).toBe('string');
    });
  });

  describe('tier classification removal', () => {
    it('does not export CopilotModelEntry type or classifyModelTier function', async () => {
      const mod = await import('@electron/utils/github-copilot-oauth');
      expect(mod).not.toHaveProperty('CopilotModelEntry');
      expect(mod).not.toHaveProperty('classifyModelTier');
    });
  });

  describe('model discovery', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('COPILOT_FALLBACK_MODELS is a flat string array', () => {
      expect(Array.isArray(COPILOT_FALLBACK_MODELS)).toBe(true);
      expect(COPILOT_FALLBACK_MODELS.length).toBeGreaterThan(0);
      for (const model of COPILOT_FALLBACK_MODELS) {
        expect(typeof model).toBe('string');
      }
    });

    it('returns plain string model IDs from the Copilot API on success', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-4o' },
          { id: 'claude-sonnet-4' },
          { id: 'gemini-2.0-flash' },
        ],
      };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockModels,
      } as Response);

      const models = await fetchCopilotModels('fake-token');
      expect(models).toEqual(['gpt-4o', 'claude-sonnet-4', 'gemini-2.0-flash']);
      for (const m of models) {
        expect(typeof m).toBe('string');
      }
    });

    it('returns fallback string[] when the API returns an error', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response);

      const models = await fetchCopilotModels('fake-token');
      expect(models).toEqual(COPILOT_FALLBACK_MODELS);
      for (const m of models) {
        expect(typeof m).toBe('string');
      }
    });

    it('returns fallback string[] when the API returns empty data', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      const models = await fetchCopilotModels('fake-token');
      expect(models).toEqual(COPILOT_FALLBACK_MODELS);
    });

    it('returns fallback string[] when fetch throws an error', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('Network error'));

      const models = await fetchCopilotModels('fake-token');
      expect(models).toEqual(COPILOT_FALLBACK_MODELS);
    });

    it('does not attach tier or classification properties to returned models', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-4o' },
          { id: 'some-new-model' },
        ],
      };

      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockModels,
      } as Response);

      const models = await fetchCopilotModels('fake-token');
      expect(models).toEqual(['gpt-4o', 'some-new-model']);
    });
  });
});
