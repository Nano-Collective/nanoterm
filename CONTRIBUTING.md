# Contributing to Nanoterm

First off, thank you for considering contributing to Nanoterm! We are a community collective building AI tooling for developers, and every PR helps.

## Development Setup

We use `pnpm` as our package manager and `biome` for all linting and formatting. 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Nano-Collective/nanoterm.git
   cd nanoterm
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Build the CLI:**
   ```bash
   pnpm run build
   ```
   You can also link it globally for local testing using `npm link` or `pnpm link --global`.

## Formatting and Linting

Before opening a pull request, ensure your code passes all formatting and linting rules:

- **Format your code:** `pnpm run format`
- **Lint your code:** `pnpm run test:lint` (use `pnpm run test:lint:fix` to automatically fix issues)
- **Check for unused dependencies:** `pnpm run test:knip`

## Running Tests

We use [Ava](https://github.com/avajs/ava) for our unit tests. 

- **Run all tests:** `pnpm run test:ava`
- **Check test coverage:** `pnpm run test:coverage`

### The CI Check

To verify that your PR will pass our GitHub Actions CI pipeline, run the comprehensive check script:

```bash
pnpm run check
```
This runs the formatter, type-checker, linter, test runner, and knip in sequence.

## Code Architecture

- `src/cli.ts`: Entrypoint and commander arguments.
- `src/prompt.ts`: Constructs the system and user prompts.
- `src/generate.ts`: Invokes the Vercel AI SDK to get a command from the LLM.
- `src/safety.ts`: Heuristic engine for detecting destructive commands.
- `src/session.ts`: PID-scoped caching logic for ephemeral terminal sessions.
- `src/privacy.ts`: Integration with `@nanocollective/prompt-scrub`.

## Pull Request Process

1. Fork the repo and create your branch from `main`.
2. Add unit tests for any new logic in the `tests/` directory.
3. Ensure `pnpm run check` passes completely.
4. Open a Pull Request with a clear description of the problem and your solution.
