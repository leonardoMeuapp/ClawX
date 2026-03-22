import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Settings page does not render telemetry toggle', () => {
  const settingsSource = fs.readFileSync(
    path.resolve(__dirname, '../../src/pages/Settings/index.tsx'),
    'utf-8',
  );

  it('does not contain "Anonymous Usage Data" text', () => {
    expect(settingsSource).not.toContain('Anonymous Usage Data');
  });

  it('does not reference telemetryEnabled setting', () => {
    expect(settingsSource).not.toMatch(/\btelemetryEnabled\b/);
  });

  it('does not reference setTelemetryEnabled action', () => {
    expect(settingsSource).not.toMatch(/\bsetTelemetryEnabled\b/);
  });

  it('preserves the Telemetry Viewer for local diagnostics', () => {
    expect(settingsSource).toContain('TelemetryViewer');
  });
});
