import fs from 'fs';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

const loggerInfoMock = vi.fn();

vi.mock('@electron/utils/logger', () => ({
  logger: {
    info: loggerInfoMock,
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('main telemetry module', () => {
  it('exports trackMetric and logs locally', async () => {
    const mod = await import('@electron/utils/telemetry');
    expect(typeof mod.trackMetric).toBe('function');

    mod.trackMetric('test.event', { key: 'value' });
    expect(loggerInfoMock).toHaveBeenCalledWith('[metric] test.event', { key: 'value' });
  });

  it('does not export remote telemetry functions', async () => {
    const mod = await import('@electron/utils/telemetry');
    expect('initTelemetry' in mod).toBe(false);
    expect('captureTelemetryEvent' in mod).toBe(false);
    expect('shutdownTelemetry' in mod).toBe(false);
  });
});

describe('analytics dependencies removed from package.json', () => {
  const pkgPath = path.resolve(__dirname, '../../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  it('does not include posthog-node', () => {
    expect(pkg.dependencies?.['posthog-node']).toBeUndefined();
    expect(pkg.devDependencies?.['posthog-node']).toBeUndefined();
  });

  it('does not include node-machine-id', () => {
    expect(pkg.dependencies?.['node-machine-id']).toBeUndefined();
    expect(pkg.devDependencies?.['node-machine-id']).toBeUndefined();
  });
});

describe('no device fingerprinting in telemetry module', () => {
  it('telemetry source does not reference machineId or node-machine-id', () => {
    const telemetrySource = fs.readFileSync(
      path.resolve(__dirname, '../../electron/utils/telemetry.ts'),
      'utf-8',
    );
    expect(telemetrySource).not.toContain('machineId');
    expect(telemetrySource).not.toContain('node-machine-id');
    expect(telemetrySource).not.toContain('machineIdSync');
  });
});
