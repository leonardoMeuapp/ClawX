import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  trackUiEvent,
  getUiTelemetrySnapshot,
  clearUiTelemetry,
  getUiCounter,
  subscribeUiTelemetry,
} from '@/lib/telemetry';

describe('local UI diagnostics remain functional', () => {
  beforeEach(() => {
    clearUiTelemetry();
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('trackUiEvent records events in memory', () => {
    trackUiEvent('test.click', { button: 'ok' });
    const snapshot = getUiTelemetrySnapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0].event).toBe('test.click');
    expect(snapshot[0].payload).toEqual({ button: 'ok' });
  });

  it('getUiCounter tracks event counts', () => {
    trackUiEvent('counter.event');
    trackUiEvent('counter.event');
    expect(getUiCounter('counter.event')).toBe(2);
  });

  it('clearUiTelemetry resets all state', () => {
    trackUiEvent('to.clear');
    clearUiTelemetry();
    expect(getUiTelemetrySnapshot()).toHaveLength(0);
    expect(getUiCounter('to.clear')).toBe(0);
  });

  it('subscribeUiTelemetry notifies listeners', () => {
    const listener = vi.fn();
    const unsub = subscribeUiTelemetry(listener);
    trackUiEvent('sub.event');
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ event: 'sub.event' }));
    unsub();
    trackUiEvent('after.unsub');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not make network calls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    trackUiEvent('no.network');
    getUiTelemetrySnapshot();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
