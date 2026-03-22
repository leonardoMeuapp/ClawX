# Style Guide

Code conventions and patterns for the ClawX codebase.

<!-- SpecDriven:managed:start -->

## Language & Tooling

- **TypeScript** (strict mode) everywhere — both Electron Main and React Renderer.
- **ESLint** for linting: `pnpm run lint` (auto-fixes).
- **No Prettier** configured — ESLint handles formatting rules.
- Target: ES2022.

## Naming Conventions

### Files & Directories

| Type | Convention | Example |
|------|-----------|---------|
| React component | PascalCase | `MainLayout.tsx`, `Chat.tsx` |
| Store | kebab-case or camelCase | `settings.ts`, `gateway.ts` |
| Utility / lib | kebab-case | `api-client.ts`, `host-api.ts` |
| Test file | `<module>.test.ts(x)` | `stores.test.ts`, `chat-input.test.tsx` |
| Type definition | kebab-case | `agent.ts`, `channel.ts` |
| Electron route | kebab-case | `agents.ts`, `providers.ts` |

### TypeScript Identifiers

| Type | Convention | Example |
|------|-----------|---------|
| Interface / Type | PascalCase | `GatewayStatus`, `ProviderConfig` |
| Zustand store hook | `use<Domain>Store` | `useSettingsStore`, `useGatewayStore` |
| Route handler | `handle<Domain>Routes` | `handleAgentRoutes`, `handleProviderRoutes` |
| Constant (module-level) | UPPER_SNAKE_CASE | `HOST_API_PORT`, `UNIFIED_CHANNELS` |
| Function / variable | camelCase | `parseJsonBody`, `sendJson` |
| React component | PascalCase | `ErrorBoundary`, `MainLayout` |
| Enum-like type | PascalCase union | `type Theme = 'light' \| 'dark' \| 'system'` |

### Unused Variables

Prefix unused parameters and variables with `_`:

```typescript
// ✓ Correct
function handler(_event: Event, data: Data) { ... }
const [_first, second] = tuple;

// ✗ Incorrect — triggers lint error
function handler(event: Event, data: Data) { ... }
```

This is enforced by the ESLint rule `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: '^_'`.

## Path Aliases

```typescript
// Renderer code
import { invokeIpc } from '@/lib/api-client';         // @/ → src/
import { useSettingsStore } from '@/stores/settings';

// Main or shared code
import { logger } from '@electron/utils/logger';       // @electron/ → electron/
```

Aliases are defined in `tsconfig.json` and mirrored in `vite.config.ts`.

## React Patterns

### Component Structure

```tsx
// 1. Imports
import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings';

// 2. Types (colocated or from types/)
interface Props {
  title: string;
  onAction: () => void;
}

// 3. Component
export function MyComponent({ title, onAction }: Props) {
  // hooks first
  const theme = useSettingsStore((state) => state.theme);
  const [value, setValue] = useState('');

  // effects
  useEffect(() => { /* ... */ }, []);

  // handlers
  const handleClick = () => { onAction(); };

  // render
  return <div onClick={handleClick}>{title}</div>;
}
```

### State Management (Zustand)

- One store per domain: `settings`, `gateway`, `chat`, `agents`, `channels`, etc.
- Use the `persist` middleware only when state must survive app restart.
- Select individual fields to minimize re-renders:

```typescript
// ✓ Select specific state
const theme = useSettingsStore((state) => state.theme);

// ✗ Avoid subscribing to entire store
const store = useSettingsStore();
```

### Styling

- **Tailwind CSS** with class-based dark mode (`darkMode: ['class']`).
- **shadcn/ui** component pattern: CSS variables (HSL) for theming via `--primary`, `--background`, `--foreground`, etc.
- Use `cn()` (from `clsx` + `tailwind-merge`) for conditional class composition.
- `tailwindcss-animate` plugin for animation utilities.

## Electron / IPC Patterns

### Renderer → Main Communication

**Always** use the unified API client — never call IPC or local HTTP directly from components:

```typescript
// ✓ Correct
import { invokeIpc } from '@/lib/api-client';
const result = await invokeIpc('provider:list');

// ✓ Correct — host-api wrapper
import { hostApiFetch } from '@/lib/host-api';
const data = await hostApiFetch<AgentList>('/agents');

// ✗ Forbidden — ESLint will block these
window.electron.ipcRenderer.invoke('provider:list');
fetch('http://127.0.0.1:18789/agents');
```

This is enforced by custom ESLint `no-restricted-syntax` rules in [eslint.config.mjs](eslint.config.mjs).

### Host API Routes (Main Process)

Route handlers follow a chain-of-responsibility pattern:

```typescript
export async function handleDomainRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  context: RouteContext,
): Promise<boolean> {
  // return true if handled, false to pass to next handler
}
```

### Transport Policy

Transport selection is owned by the Main process — the Renderer must not implement protocol switching logic. The fixed fallback order is:

1. **WebSocket** (primary for gateway:rpc)
2. **HTTP** (via host-api proxy)
3. **IPC** (guaranteed fallback)

## TypeScript Strictness

The project uses strict TypeScript:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

Prefer `@typescript-eslint/no-explicit-any` as a warning — use `any` sparingly and prefer `unknown` or proper types.

## Comments

Add code comments only when they are highly necessary to explain non-obvious intent, workarounds, or critical constraints. Avoid redundant or obvious comments.

For related conventions on testing, see [TESTING.md](TESTING.md). For architecture decisions, see [ARCHITECTURE.md](ARCHITECTURE.md).

<!-- SpecDriven:managed:end -->
