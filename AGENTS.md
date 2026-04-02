# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Excalidraw is a React-based monorepo for an open-source virtual whiteboard with hand-drawn aesthetics. The only service required for development is the **Vite dev server** (port 3001). All backend services (collaboration, Firebase, AI) are optional — the editor works fully client-side.

### Key commands

All commands are defined in the root `package.json`. Reference `CLAUDE.md` for the primary development workflow. Quick reference:

| Task | Command |
|------|---------|
| Dev server | `yarn start` (port 3001) |
| Lint | `yarn test:code` |
| Type check | `yarn test:typecheck` |
| Tests | `yarn test:update` |
| Auto-fix lint/format | `yarn fix` |

### Non-obvious caveats

- The `yarn start` script internally runs `yarn && vite` inside `excalidraw-app/`, so it automatically ensures dependencies are up to date before starting Vite.
- The dev server uses Vite with the `vite-plugin-checker` plugin, which runs ESLint in-process. TypeScript warnings about unsupported TS versions from `@typescript-eslint` can be safely ignored — linting still works correctly.
- The `caniuse-lite` outdated browser data warning is cosmetic and does not affect functionality.
- Tests use `vitest` with `jsdom` environment and `vitest-canvas-mock`. All 95 test files (1200+ tests) run in ~90 seconds.
- The pre-commit hook in `.husky/pre-commit` is commented out (`# yarn lint-staged`), so no pre-commit checks run automatically.
- Node.js >= 18 is required. Yarn Classic 1.22.22 is the pinned package manager.
