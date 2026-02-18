# AGENTS.md

## Cloud-specific instructions

### Overview

Excalidraw is a Yarn monorepo (Yarn 1.22.22). The only required service for development is the Vite dev server. See `CLAUDE.md` for project structure and key commands.

### Running the app

- `yarn start` launches the Vite dev server on **port 3001** (configured in `.env.development`).
- The welcome overlay appears on first load; click anywhere on the canvas to dismiss it and start drawing.

### Lint / Test / Typecheck

All commands are defined in the root `package.json`:

| Task | Command |
|------|---------|
| ESLint | `yarn test:code` |
| Prettier | `yarn test:other` |
| TypeScript | `yarn test:typecheck` |
| Vitest (all) | `yarn test:update` (includes snapshot updates) |
| Auto-fix | `yarn fix` |

### Gotchas

- `yarn test:app` runs Vitest in watch mode by default; use `yarn test:update` (adds `--update --watch=false`) for CI-style one-shot runs.
- The ESLint in-browser checker (`vite-plugin-checker`) emits warnings about unsupported TypeScript versions; these are benign and do not affect linting results.
- Some app-level tests log `Error JSON parsing firebase config` to stderr — this is expected in the dev/test environment and does not cause test failures.
- The pre-commit hook in `.husky/pre-commit` is commented out (`# yarn lint-staged`), so no git hook runs automatically.
