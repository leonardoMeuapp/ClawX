# Testing Guide

Testing strategy, frameworks, and conventions for ClawX.

<!-- SpecDriven:managed:start -->

## Testing Strategy: Testing Trophy

ClawX follows the **Testing Trophy** model, prioritizing confidence-per-effort:

```
        ╱ E2E ╲              Few — critical user journeys only
       ╱────────╲
      ╱Integration╲          Main confidence layer
     ╱──────────────╲
    ╱   Unit Tests    ╲      Selective — isolated, high-risk logic
   ╱────────────────────╲
  ╱     Static Analysis   ╲  TypeScript strict + ESLint
 ╱──────────────────────────╲
```

| Layer | Purpose | Volume |
|-------|---------|--------|
| **Static analysis** | Catch type errors and style issues at compile time | Always-on (`pnpm typecheck`, `pnpm lint`) |
| **Unit tests** | Verify isolated, high-risk logic (parsers, policies, state transitions) | Selective — ~60 test files currently |
| **Integration tests** | Validate module interactions (IPC flows, store↔API, route handlers) | Main layer — highest confidence per effort |
| **E2E tests** | Confirm critical user journeys end-to-end | Few — Playwright (see scripts) |

### What to Test and Where

- **Unit**: Pure functions, state reducers, policy logic (e.g., `gateway-process-policy`, `error-model`, `provider-validation`)
- **Integration**: Store actions that invoke IPC, route handler chains, transport fallback behavior, host-api proxy flows
- **E2E**: Setup wizard completion, chat send/receive, provider configuration flow
- **Static**: TypeScript strict mode + ESLint custom rules (IPC boundary enforcement)

## Frameworks & Tools

| Tool | Purpose |
|------|---------|
| **Vitest 4** | Test runner and assertion library |
| **jsdom** | Browser environment simulation |
| **@testing-library/react** | React component testing utilities |
| **@testing-library/jest-dom** | Extended DOM assertions |
| **Playwright** | E2E browser automation (`pnpm run test:e2e`) |

## Running Tests

```bash
# Unit and integration tests
pnpm test

# Type checking (static analysis)
pnpm run typecheck

# Linting (static analysis)
pnpm run lint

# Communication regression tests
pnpm run comms:replay
pnpm run comms:compare

# E2E tests
pnpm run test:e2e
```

## Test Organization

```
tests/
├── setup.ts                 # Global test setup (mocks, cleanup)
└── unit/                    # All unit and integration-like tests
    ├── stores.test.ts       # Zustand store behavior
    ├── api-client.test.ts   # Transport, fallback, error mapping
    ├── host-api.test.ts     # Host API proxy layer
    ├── gateway-*.test.ts    # Gateway lifecycle and policies
    ├── provider-*.test.ts   # Provider config and validation
    ├── *-routes.test.ts     # Main-process route handlers
    ├── *-page.test.tsx      # Page component rendering
    └── ...
```

Test files live in `tests/unit/` and follow the naming pattern `<module>.test.ts(x)`.

## Test Setup

The global setup ([tests/setup.ts](tests/setup.ts)) provides:

- **`window.electron` mock**: IPC invoke/on/once/off stubs via `vi.fn()`
- **`window.matchMedia` mock**: for theme/media query tests
- **`afterEach`**: automatic `vi.clearAllMocks()` to prevent leak between tests

## Conventions & Patterns

### Mocking IPC

```typescript
// Mock a specific IPC response
vi.mocked(window.electron.ipcRenderer.invoke).mockResolvedValueOnce({
  ok: true,
  data: { status: 200, ok: true, json: { success: true } },
});
```

### Mocking Modules

```typescript
vi.mock('@/lib/host-api', () => ({
  hostApiFetch: vi.fn(),
}));
```

### Resetting Store State

```typescript
beforeEach(() => {
  useSettingsStore.setState({
    theme: 'system',
    language: 'en',
    // ... reset to defaults
  });
});
```

### Dynamic Import for Side-Effect Modules

When a module registers listeners on import, use `vi.resetModules()` + dynamic `import()`:

```typescript
beforeEach(() => {
  vi.resetModules();
});

it('subscribes to gateway events on import', async () => {
  await import('@/stores/gateway');
  expect(subscribeHostEvent).toHaveBeenCalledWith('gateway:status', expect.any(Function));
});
```

### Unified API Response Format

Tests should match the actual IPC response shape:

```typescript
{
  ok: true,
  data: {
    status: 200,
    ok: true,
    json: { /* domain payload */ },
  },
}
```

## Communication Regression Tests

The `comms:*` scripts provide deterministic replay-based testing for communication paths:

```bash
pnpm run comms:replay     # Replay recorded scenarios and compute metrics
pnpm run comms:baseline   # Refresh the baseline snapshot
pnpm run comms:compare    # Compare current replay against baseline thresholds
```

**When to run**: any change touching gateway events, runtime send/receive, channel delivery, or transport fallback.

## Project-Specific Notes

- **No real API keys** needed for testing — the `window.electron` mock handles all IPC.
- **jsdom environment**: DOM APIs are available but limited (no real layout, no real navigation).
- **Coverage**: reporters configured for `text`, `json`, and `html` output. Coverage excludes `node_modules/` and `tests/`.
- **CI enforcement**: `comms-regression` CI job enforces scenario coverage and threshold checks.

For code style conventions, see [STYLEGUIDE.md](STYLEGUIDE.md). For architecture context, see [ARCHITECTURE.md](ARCHITECTURE.md).

<!-- SpecDriven:managed:end -->
