# nanoterm

Built by the [Nano Collective](https://nanocollective.org) — a community collective building AI tooling not for profit, but for the community.

`nanoterm` is an ultra-lightweight, high-performance AI terminal companion that translates natural language requests into bash commands securely and instantly.

![Build Status](https://github.com/Nano-Collective/nanoterm/raw/main/badges/build.svg)
![Coverage](https://github.com/Nano-Collective/nanoterm/raw/main/badges/coverage.svg)
![Version](https://github.com/Nano-Collective/nanoterm/raw/main/badges/npm-version.svg)
![Downloads](https://github.com/Nano-Collective/nanoterm/raw/main/badges/npm-downloads-monthly.svg)
![License](https://github.com/Nano-Collective/nanoterm/raw/main/badges/npm-license.svg)

It allows you to bypass writing complex regex, `find`, `awk`, or `sed` commands by simply asking your terminal what you want it to do in plain English. `nanoterm` connects directly to your chosen provider (OpenAI, Anthropic, Google, Atlas Cloud) via the Vercel AI SDK.

## What it is / What it is not

`nanoterm` is a highly secure, privacy-first command generator designed for developers who value safety and speed.

**What it does:**
- Automatically scrubs sensitive data (emails, IPs, phone numbers) before sending your prompt to a cloud LLM, ensuring your privacy.
- Uses strict safety guardrails to proactively block destructive commands (like `rm -rf /` or recursive `chmod`).
- Interactively prompts you for approval before executing any command on your machine.
- Seamlessly integrates with the Nanocoder and Repokit ecosystem for unified API configuration.

**What it does not do:**
- It does not blindly execute commands without your explicit consent.
- It is not an autonomous agent; it only acts when invoked and waits for approval.
- It does not track you, send telemetry data, or require an account.

> [!IMPORTANT]
> Always review the generated bash command carefully before pressing `y` (Yes) to execute. You always have the option to press `edit` to safely modify it before it runs!

## Quick Start

Install globally to use the CLI:

```bash
npm install -g @nanocollective/nanoterm
```

### Configuration Wizard

Before generating commands, set up your API keys and default models:

```bash
nanoterm config
```

This will launch a beautiful interactive setup wizard. You can choose from OpenAI, Anthropic, Google Gemini, Atlas Cloud, or any Custom OpenAI-compatible provider.

## Usage Examples

**CLI: Generate and execute a command**
```bash
nanoterm find all png files in the current directory
```

```text
Proposed command:
> find . -type f -name "*.png"

Execute? [y/N/edit/?]: y
```

You can even omit the quotes entirely! `nanoterm list all open ports` works seamlessly out of the box.

## Community

- **Discord:** [Join the Nano Collective Discord](https://discord.gg/ktPDV6rekE)
- **Contributing:** Read our [Contributing Guide](CONTRIBUTING.md) to get started.
- **Issues:** Check the [GitHub Issues](https://github.com/Nano-Collective/nanoterm/issues) for planned work or to report bugs.
