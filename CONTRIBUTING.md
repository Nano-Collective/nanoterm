# Contributing to nanoterm

Welcome! We are glad you're here. `nanoterm` is an open-source project by the Nano Collective. We welcome contributors of all skill levels. Whether you are fixing a bug, adding a new AI provider, or improving documentation, your help is appreciated.

## Code of Conduct

All contributors and participants are expected to adhere to the [Nano Collective Code of Conduct](https://nanocollective.org/collective/organisation/community). Please review it before participating.

We also operate under the [Nano Collective Economics Charter](https://nanocollective.org/collective/organisation/economics-charter).

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Nano-Collective/nanoterm.git
   cd nanoterm
   ```

2. **Install dependencies:**
   We use pnpm for development. If you don't have it, you can bootstrap it via Corepack:
   ```bash
   corepack enable && corepack prepare pnpm@9 --activate
   pnpm install
   ```

3. **Build the project:**
   ```bash
   pnpm run build
   ```

4. **Link the CLI locally:**
   ```bash
   npm link
   ```
   Now you can use the `nanoterm` command directly in your terminal to test your changes.

## Testing and Linting

We maintain a high bar for quality and test coverage. Before submitting a PR, ensure your changes pass the full test and linting gate.

You can run the entire check in one command:
```bash
pnpm run check
```

This single command runs through the following gates:
- **Format checking** with Biome
- **Type checking** with tsc
- **Lint checking** with Biome
- **Test suite execution** with AVA
- **Dead code analysis** with Knip

You can also run any of these individual scripts (e.g. `pnpm run format` to auto-fix styling).

### Coding Standards

- **Strictness:** We use strict TypeScript. Avoid `any` where possible.
- **Safety:** Because this is a CLI executing shell commands, strictly enforce safety boundaries (e.g. recursive removals, raw device formatting).
- **Formatting:** Handled automatically by Biome. Do not disable lint rules without a comment explaining why.

## Release Process

**Note for contributors:** Please do not bump the version number in `package.json` in your pull requests. Version bumping and releases are handled exclusively by the project maintainers using automated workflows when merging to `main`.

Thank you for contributing!
