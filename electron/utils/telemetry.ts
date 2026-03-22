import { logger } from './logger';

export function trackMetric(event: string, properties: Record<string, unknown> = {}): void {
    logger.info(`[metric] ${event}`, properties);
}
