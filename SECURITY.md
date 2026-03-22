# Security Policy

<!-- SpecDriven:managed:start -->

## Security Practices

### Credential Storage

- **API keys and OAuth tokens** are stored in the OS keychain via `electron-store` + native secure storage.
- Secrets are never exposed to the Renderer process in raw form.
- The `SecretStore` abstraction ([electron/services/secrets/secret-store.ts](electron/services/secrets/secret-store.ts)) supports three secret types: `api_key`, `oauth`, and `local`.

### Process Isolation

- The Renderer process communicates with Main exclusively through a whitelisted IPC bridge (`contextBridge`).
- Only channels explicitly listed in [electron/preload/index.ts](electron/preload/index.ts) are accessible.
- ESLint custom rules enforce that Renderer code cannot call `window.electron.ipcRenderer.invoke(...)` directly or access `127.0.0.1` endpoints.

### Network Security

- All local HTTP traffic (Host API, Gateway) is proxied through the Main process — the Renderer never makes direct network calls to local services.
- The Host API server binds to `127.0.0.1` only (not `0.0.0.0`), preventing external network access.
- Proxy settings are configured via the UI and applied through Electron's session networking.

### Content Security

- `contextIsolation` is enabled — preload scripts run in a separate V8 context from the Renderer page.
- External URLs are opened via `shell.openExternal`, not inside the Electron window.
- `nodeIntegration` is disabled in the Renderer.

### Build & Distribution

- macOS builds use hardened runtime with entitlements and notarization.
- Windows NSIS installer includes per-user and per-machine install options.
- Auto-update serves from Alibaba Cloud OSS (primary) with GitHub Releases as fallback.
- `asar` packaging is enabled with native `.node` modules unpacked.

### Dependency Policy

- Only built dependencies explicitly listed in `pnpm.onlyBuiltDependencies` are allowed to run install scripts.
- `npmRebuild: false` in electron-builder — native modules belong to OpenClaw's separate bundle, not the Electron rebuild step.

<!-- SpecDriven:managed:end -->

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in ClawX, please report it responsibly:

1. **Do not** open a public issue.
2. Email [public@valuecell.ai](mailto:public@valuecell.ai) with details of the vulnerability.
3. Include steps to reproduce and potential impact.
4. You can expect an initial response within 72 hours.
5. We will coordinate disclosure timing with you after a fix is available.

For general bugs (non-security), use [GitHub Issues](https://github.com/ValueCell-ai/ClawX/issues).
