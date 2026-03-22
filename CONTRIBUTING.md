# Contributing to ClawX

Thank you for your interest in contributing to ClawX! This guide covers the workflow, conventions, and expectations for all contributors.

<!-- SpecDriven:managed:start -->

## Prerequisites

- **Node.js** 22+ (LTS recommended)
- **pnpm** — exact version pinned in `package.json` (`packageManager` field). Activate via:
  ```bash
  corepack enable && corepack prepare
  ```
- **Git** — any recent version

## Getting Started

```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-fork>/ClawX.git
cd ClawX

# 2. Initialize (install deps + download bundled uv)
pnpm run init

# 3. Start development
pnpm dev
```

> **Tip:** `pnpm run init` is equivalent to running `pnpm install && pnpm run uv:download` separately.

## Git Workflow

1. **Fork** the repository on GitHub.
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/short-description
   ```
3. **Make your changes** — keep commits atomic and descriptive.
4. **Verify** before pushing:
   ```bash
   pnpm run lint && pnpm run typecheck && pnpm test
   ```
5. **Push** to your fork and **open a Pull Request** against `main`.

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<slug>` | `feature/add-voice-input` |
| Bug fix | `fix/<slug>` | `fix/gateway-reconnect-loop` |
| Docs | `docs/<slug>` | `docs/update-architecture` |
| Chore / refactor | `chore/<slug>` | `chore/upgrade-electron` |

### Commit Messages

Use clear, imperative-mood summaries:

```
feat: add multi-account support for Telegram channel
fix: prevent gateway restart loop on Windows
docs: update proxy configuration section in README
```

Keep the subject line under 72 characters. Add a body for non-trivial changes explaining _why_, not just _what_.

## Pull Request Process

1. **Title**: use the same `type: description` format as commits.
2. **Description**: explain the motivation and link related issues.
3. **Checklist** (before requesting review):
   - [ ] `pnpm run lint` passes
   - [ ] `pnpm run typecheck` passes
   - [ ] `pnpm test` passes
   - [ ] If touching communication paths: `pnpm run comms:replay && pnpm run comms:compare` pass
   - [ ] Documentation updated if behavior or interfaces changed (see Doc Sync below)
4. **Review**: at least one maintainer approval is required.
5. **Merge**: squash-merge is preferred for feature branches.

## Repository Structure

```
ClawX/
├── electron/             # Electron Main Process
│   ├── api/              # Host API server and route handlers
│   │   └── routes/       # Domain-specific HTTP route modules
│   ├── gateway/          # OpenClaw Gateway process manager
│   ├── main/             # App entry, windows, IPC, tray, updater
│   ├── preload/          # Secure IPC bridge (contextBridge)
│   ├── services/         # Provider, secrets, and runtime services
│   ├── shared/           # Shared provider schemas/constants
│   └── utils/            # Utilities (storage, auth, paths, CLI)
├── src/                  # React Renderer Process
│   ├── components/       # Reusable UI components (ui/, layout/, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── i18n/             # Localization resources
│   ├── lib/              # API client, host-api, error model, utils
│   ├── pages/            # Page-level components
│   ├── stores/           # Zustand state stores
│   ├── styles/           # Global CSS / Tailwind entry
│   └── types/            # TypeScript type definitions
├── shared/               # Code shared between Main and Renderer
├── tests/                # Test suites
│   └── unit/             # Vitest unit tests
├── resources/            # Static assets (icons, CLI scripts, skills)
├── scripts/              # Build, bundling, and utility scripts
└── specs/                # Spec-Driven planning artifacts
```

For detailed architectural guidance, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Documentation Workflow

### Doc Sync Rule

After any functional or architecture change, review these files for required updates **in the same PR/commit**:

- `README.md`
- `README.zh-CN.md`
- `README.ja-JP.md`

If behavior, flows, or interfaces changed — the docs must be updated together with the code.

### Guideline Documents

| Document | Scope |
|----------|-------|
| [AGENTS.md](AGENTS.md) | AI agent persona, commands, caveats |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Workflow, PR process, repo structure |
| [STYLEGUIDE.md](STYLEGUIDE.md) | Naming conventions, code style |
| [TESTING.md](TESTING.md) | Testing strategy and patterns |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, diagrams, decisions |
| [SECURITY.md](SECURITY.md) | Security policy and practices |

## Communication-Change Checklist

If your change touches any communication path (gateway events, runtime send/receive, delivery, or fallback), you **must** run:

```bash
pnpm run comms:replay
pnpm run comms:compare
```

CI enforces required scenarios and threshold checks via `comms-regression`.

## Reporting Issues

- Use [GitHub Issues](https://github.com/ValueCell-ai/ClawX/issues) for bugs and feature requests.
- Include reproduction steps, OS/platform, and ClawX version.
- For security vulnerabilities, see [SECURITY.md](SECURITY.md).

## Code of Conduct

All contributors are expected to follow the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

<!-- SpecDriven:managed:end -->
