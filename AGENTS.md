# AGENTS.md

## Cloud-specific instructions

### Overview

Excalidraw is a Yarn workspaces monorepo (Yarn Classic 1.22.22, Node >= 18). The main dev surface is a single Vite dev server for the `excalidraw-app` web application. See `CLAUDE.md` for project structure and development commands.

### Running the app

- `yarn start` — starts the Vite dev server on **port 3001** (includes in-process ESLint and TypeScript checking via `vite-plugin-checker`).
- External services (Firebase, WebSocket collab server, AI backend) use hosted dev instances or are optional; the app runs standalone without them.

### Testing and linting

Standard commands from root `package.json`:

| Task | Command |
| --- | --- |
| Lint (ESLint) | `yarn test:code` |
| Format check (Prettier) | `yarn test:other` |
| TypeScript typecheck | `yarn test:typecheck` |
| Unit/integration tests | `yarn test:update` (updates snapshots) or `yarn test:app --watch=false` |
| Auto-fix lint + format | `yarn fix` |
| Full CI suite | `yarn test:all` |

### Caveats

- The `vite-plugin-checker` in the dev server prints `ERROR` banners for ESLint and TypeScript even when 0 issues are found — this is normal, not an actual failure.
- The Firebase config warning (`Error JSON parsing firebase config`) in test output is expected in local/CI environments without Firebase credentials.
- The pre-commit hook in `.husky/pre-commit` is commented out (`# yarn lint-staged`), so no hooks run automatically.
