import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/host-api', () => ({
  hostApiFetch: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/i18n', () => ({
  default: {
    changeLanguage: vi.fn(),
  },
}));

describe('settings store has no telemetryEnabled field', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('does not include telemetryEnabled in state shape', async () => {
    const { useSettingsStore } = await import('@/stores/settings');
    const state = useSettingsStore.getState();
    expect('telemetryEnabled' in state).toBe(false);
  });

  it('does not include setTelemetryEnabled action', async () => {
    const { useSettingsStore } = await import('@/stores/settings');
    const state = useSettingsStore.getState();
    expect('setTelemetryEnabled' in state).toBe(false);
  });
});

const deleteMock = vi.fn();
const getMock = vi.fn();

vi.mock('@electron/utils/store', () => ({
  getSetting: getMock,
  setSetting: vi.fn(),
  getAllSettings: vi.fn().mockResolvedValue({}),
  deleteLegacySetting: async (key: string) => {
    deleteMock(key);
  },
}));

describe('persisted telemetry artifacts cleaned on upgrade', () => {
  it('deleteLegacySetting removes legacy keys', async () => {
    const { deleteLegacySetting } = await import('@electron/utils/store');
    const legacyKeys = ['telemetryEnabled', 'machineId', 'hasReportedInstall'];

    for (const key of legacyKeys) {
      await deleteLegacySetting(key);
    }

    expect(deleteMock).toHaveBeenCalledWith('telemetryEnabled');
    expect(deleteMock).toHaveBeenCalledWith('machineId');
    expect(deleteMock).toHaveBeenCalledWith('hasReportedInstall');
  });

  it('AppSettings interface does not include legacy telemetry fields', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const storeSource = fs.readFileSync(
      path.resolve(__dirname, '../../electron/utils/store.ts'),
      'utf-8',
    );
    expect(storeSource).not.toMatch(/telemetryEnabled/);
    expect(storeSource).not.toMatch(/hasReportedInstall/);
    // machineId should not be a field in AppSettings
    expect(storeSource).not.toMatch(/machineId\s*:/);
  });
});
