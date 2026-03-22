import type { ModelSummary, ProviderSecret } from '../../shared/providers/types';
import { proxyAwareFetch } from '../../utils/proxy-fetch';
import { logger } from '../../utils/logger';

const CURSOR_MODELS_URL = 'https://api.cursor.com/v0/models';
const CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_MODEL_ID = 'claude-4-sonnet-thinking';

interface CursorModelsCache {
  models: ModelSummary[];
  expiresAt: number;
}

let modelsCache: CursorModelsCache | null = null;

function buildAuthHeader(secret: ProviderSecret): string | null {
  if (secret.type === 'oauth') {
    return `Basic ${Buffer.from(`${secret.accessToken}:`).toString('base64')}`;
  }
  if (secret.type === 'api_key') {
    return `Basic ${Buffer.from(`${secret.apiKey}:`).toString('base64')}`;
  }
  return null;
}

function buildFallbackModels(accountId?: string): ModelSummary[] {
  return [
    {
      id: DEFAULT_MODEL_ID,
      name: DEFAULT_MODEL_ID,
      vendorId: 'cursor',
      accountId,
      source: 'builtin',
    },
  ];
}

export async function fetchCursorModels(
  secret: ProviderSecret,
  accountId?: string,
  options?: { skipCache?: boolean },
): Promise<ModelSummary[]> {
  if (!options?.skipCache && modelsCache && Date.now() < modelsCache.expiresAt) {
    return modelsCache.models;
  }

  const authHeader = buildAuthHeader(secret);
  if (!authHeader) {
    logger.warn('[cursor-models] Unable to build auth header from secret');
    return buildFallbackModels(accountId);
  }

  try {
    const response = await proxyAwareFetch(CURSOR_MODELS_URL, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      logger.warn(`[cursor-models] API returned ${response.status}`);
      return modelsCache?.models ?? buildFallbackModels(accountId);
    }

    const data = (await response.json()) as { models?: string[] };
    const modelIds = Array.isArray(data.models) ? data.models : [];

    if (modelIds.length === 0) {
      logger.warn('[cursor-models] API returned empty model list');
      return buildFallbackModels(accountId);
    }

    const models: ModelSummary[] = modelIds.map((id) => ({
      id,
      name: id,
      vendorId: 'cursor',
      accountId,
      source: 'remote' as const,
    }));

    modelsCache = { models, expiresAt: Date.now() + CACHE_TTL_MS };
    return models;
  } catch (error) {
    logger.warn(
      `[cursor-models] Fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return modelsCache?.models ?? buildFallbackModels(accountId);
  }
}

export function invalidateCursorModelsCache(): void {
  modelsCache = null;
}

export function getCursorModelIds(models: ModelSummary[]): string[] {
  return models.map((m) => m.id);
}
