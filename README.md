# nanoterm

Built by the [Nano Collective](https://nanocollective.org) — a community collective building AI tooling not for profit, but for the community.

`nanoterm` is an ultra-lightweight, high-performance AI terminal companion that translates natural language requests into bash commands securely and instantly.

![Build Status](https://github.com/Nano-Collective/nanoterm/raw/main/badges/build.svg)
![Coverage](https://github.com/Nano-Collective/nanoterm/raw/main/badges/coverage.svg)
![Stars](https://github.com/Nano-Collective/nanoterm/raw/main/badges/stars.svg)
![Repo Size](https://github.com/Nano-Collective/nanoterm/raw/main/badges/repo-size.svg)
![Forks](https://github.com/Nano-Collective/nanoterm/raw/main/badges/forks.svg)

It allows you to bypass writing complex regex, `find`, `awk`, or `sed` commands by simply asking your terminal what you want it to do in plain English. `nanoterm` connects directly to your chosen provider (OpenAI, Anthropic, Google, Atlas Cloud) via the Vercel AI SDK.

## What it is / What it is not

`nanoterm` is a highly secure, privacy-first command generator designed for developers who value safety and speed.

**What it does:**
- Automatically scrubs sensitive data (emails, IPs, phone numbers) before sending your prompt to a cloud LLM, ensuring your privacy.
- Commands matching common destructive patterns are clearly flagged and require explicit confirmation.
- Interactively prompts you for approval before executing any command on your machine.
- Shares configuration seamlessly with the Nanocoder ecosystem.

**What it does not do:**
- It does not blindly execute commands without your explicit consent.
- It is not an autonomous agent; it only acts when invoked and waits for approval.
- It does not track you, send telemetry data, or require an account.

> [!IMPORTANT]
> Always review the generated bash command carefully before pressing `y` (Yes) to execute. You always have the option to press `edit` to safely modify it before it runs!

### Security model

- Commands that do not need shell features are executed directly, without a shell. Pipelines, redirects, expansions, and shell built-ins still require the configured shell.
- Commands are evaluated for safety: **Destructive** commands (e.g. `rm -rf`) require typing the full word `yes`. **Cautionary** commands (e.g. dynamically built commands like `$(...)`) trigger a warning but only require a simple `y`. This is an additional review boundary, not a sandbox.
- Cloud prompts are scrubbed before transmission. Scrubbing is skipped only for explicitly known local providers or URLs whose parsed hostname is a loopback address.
- Recent command output is bounded, expires after ten minutes, and is sent to the model as untrusted user-context data rather than as a system instruction.
- Provider credentials and their configuration directory are restricted to the current user on platforms that support POSIX permissions.

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

When prompted to execute, you have several options:
- Press `y` to execute the command.
- Press `Enter` (or `N`) to safely **abort** (this is the default).
- Type `edit` to manually modify the command before it runs.
- Type `?` to get a concise explanation of what the command does before you decide.

### Session Chaining

`nanoterm` automatically feeds the output (`stdout`/`stderr`) of your last executed command into the AI's context for your next request. This allows for seamless session-chaining!

For example:
1. `nanoterm run the tests`
2. `nanoterm fix the failing test in the output` (The AI already knows what failed!)

You can even omit the quotes entirely! `nanoterm list all open ports` works seamlessly out of the box.

> [!WARNING]
> Unquoted requests are subject to shell expansion before `nanoterm` sees them. For example, `nanoterm find all *.png files` will expand `*.png` in your shell if matches exist. If your request includes glob patterns, variables, or shell metacharacters, it is safer to wrap your request in quotes.

## Community

- **Discord:** [Join the Nano Collective Discord](https://discord.gg/ktPDV6rekE)
- **Contributing:** Read our [Contributing Guide](CONTRIBUTING.md) to get started.
- **Issues:** Check the [GitHub Issues](https://github.com/Nano-Collective/nanoterm/issues) for planned work or to report bugs.
