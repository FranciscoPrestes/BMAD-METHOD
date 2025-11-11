# Repository Guidelines

## Project Structure & Module Organization

- `src/core/` — CORE agents, tasks, tools, workflows.
- `src/modules/` — Modules: `bmm/`, `bmb/`, `cis/`, `bmgd/`.
- `tools/` — CLI, bundlers, validators, flattener (`tools/cli`, `tools/flattener`, `tools/schema`).
- `test/` — Node-based tests and fixtures.
- `docs/` — Documentation, IDE guides, upgrade notes.

## Build, Test, and Development Commands

- `npm test` — Full quality gate (lint, format check, schema/bundle validation).
- `npm run test:schemas` — Validate agent YAML against schema.
- `npm run test:install` — Installation/compilation smoke tests.
- `npm run validate:bundles` / `npm run validate:schemas` — Targeted validations.
- `npm run test:coverage` — Coverage for schema tests (c8 report).
- `npm run bundle` / `npm run rebundle` — Generate/clean web bundles to `web-bundles/`.
- `npm run install:beat` — Exercise local CLI install.

Requirements: Node.js 22+ (`.nvmrc`). Use `nvm use` before running scripts.

## Coding Style & Naming Conventions

- Formatting: Prettier (2 spaces, width 140, single quotes, semicolons). Run `npm run format:fix`.
- Linting: ESLint with `@eslint/js`, `eslint-plugin-n`, `unicorn`, `yml`. Run `npm run lint`.
- YAML: Use `.yaml` extension and prefer double quotes in YAML (enforced by rules).
- Modules/CLI use Node ESM and CommonJS where practical (CLI/test allow CJS patterns).

## Testing Guidelines

- Location: `test/` (see `test/*.js`, `test/test-cli-integration.sh`).
- Naming: follow existing patterns (`test-*.js`, `*-test*.js`).
- Run fast suites locally: `npm run test:schemas` then `npm test` before pushing.

## Commit & Pull Request Guidelines

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` (≤72 chars subject).
- PRs: one focused change; include what/why/how, linked issue, and test notes. Keep PRs small (≈200–400 LOC). Ensure `npm test` passes and docs updated.
- Pre-commit: Husky runs lint-staged and `npm test`.

## Agent-Specific Notes

- Agent files live under `src/{core,modules/*}/agents/`. Validate with `npm run validate:schemas`.
- After agent/team changes, regenerate bundles: `npm run bundle` (or `rebundle`).

## Security & Configuration

- Do not commit secrets. Use public npm registry (`.npmrc`).
- Keep Node version in sync with `.nvmrc`. Avoid modifying generated bundles in PRs unless necessary.
