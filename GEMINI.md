# Gemini Project Analysis: BEAT-METHOD

## Project Overview

This project, **BEAT-METHOD**, is a universal human-AI collaboration platform and command-line tool. Its core purpose is to provide a framework for using specialized AI agents and guided, reflective workflows to amplify human potential. The primary application is an AI-driven agile development methodology for software and game development.

The project is built with **Node.js** and features a clean, modular architecture. A central `core` engine orchestrates agents and workflows, which are organized into domain-specific modules:

- **BMM (BEAT Method):** The main module for AI-driven agile development, featuring 12 specialized agents and over 30 workflows covering analysis, planning, solutioning, and implementation.
- **BMB (BEAT Builder):** A tool for creating custom agents, workflows, and modules.
- **CIS (Creative Intelligence Suite):** A set of agents and workflows for creative tasks like brainstorming, design thinking, and storytelling.

The system is designed to be highly customizable, allowing users to modify agent personalities and configurations in an update-safe way.

## Building and Running

The project is managed with `npm`. Key commands are defined in `package.json`.

### Prerequisites

- Node.js (v20.0.0 or higher)

### Installation

The tool is intended to be used via `npx` for installation into a target project directory.

```bash
# Install the latest alpha version
npx beat-method@alpha install

# Install the stable v4 version
npx beat-method install
```

### Running the Tool

Once installed in a project, the `beat-method` command becomes available. The core logic is initiated from `tools/cli/beat-cli.js`.

```bash
# Check the status of the installation
beat-method status
```

### Testing

The project has a comprehensive suite of quality checks that can be run with a single command.

```bash
# Run all tests, validation, linting, and format checks
npm test

# Run individual test suites
npm run test:schemas     # Agent schema validation
npm run test:install     # Installation component tests
npm run validate:bundles # Web bundle integrity
npm run validate:schemas # YAML schema validation

# Run linters and formatters
npm run lint
npm run format:check
```

## Development Conventions

The codebase follows a clear and modern JavaScript standard.

- **Code Style:** Code quality is enforced by **ESLint** and **Prettier**. Configuration can be found in `eslint.config.mjs` and `prettier.config.mjs`.
- **Pre-commit Hooks:** **Husky** and **lint-staged** are used to automatically run linting and formatting checks on staged files before every commit, ensuring consistency.
- **CLI Architecture:** The command-line interface is built using the `commander` library. The main entry point is `tools/cli/beat-cli.js`, which dynamically loads individual command modules from the `tools/cli/commands/` directory. This keeps the command logic well-organized and easy to extend.
- **Modularity:** The project is highly modular. Core logic is separated from domain-specific modules (`bmm`, `bmb`, `cis`), which reside in the `src/modules` directory. This separation makes the system extensible.
