# desktop/

Electron shell that ships the dashboard as a native macOS `.app`. See [`../DESKTOP.md`](../DESKTOP.md) for the full user-facing docs.

## Contributor cheat sheet

```bash
# From the repo root:
npm run setup
npm run build            # builds client/dist (the SPA the Electron window loads)
npm run desktop:install  # installs Electron, electron-builder, types
npm run desktop:dev      # build tsc → launch electron pointing at out/main.js
npm run desktop:test     # smoke test (spawn + probe /api/health)
npm run desktop:dmg      # produces release/ClaudeCodeMonitor-*.dmg
```

## Where to start reading

- [`src/main.ts`](src/main.ts) — main process entry; lifecycle, dialogs, app menu wiring.
- [`src/server-host.ts`](src/server-host.ts) — the only file that imports `server/index.js`. Port discovery, healthy-server adoption, in-process boot.
- [`src/window.ts`](src/window.ts) — `BrowserWindow` creation + persisted geometry.
- [`src/tray.ts`](src/tray.ts) — menu-bar icon and its context menu.
- [`electron-builder.yml`](electron-builder.yml) — DMG config. Notarization hooks are env-var driven; no edits needed to flip them on.

## When you change something here

- Run `npm run desktop:test` locally before opening a PR — CI runs the same on `macos-latest`.
- The smoke test does not need a display. It exits cleanly so CI doesn't need xvfb.
- If you touch icons, run `npm run build:icons` to regenerate `assets/icon.icns` and the tray PNGs from the SVG sources.

## What this code does *not* touch

By design, the desktop workspace makes zero changes to `server/`, `client/`, `scripts/`, `mcp/`, or `vscode-extension/`. If you find yourself wanting to edit those, that's a separate PR.
