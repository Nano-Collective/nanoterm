# Nanoterm

**Nanoterm** is an ultra-lightweight, local-first AI terminal companion built by the [Nano Collective](https://github.com/Nano-Collective). 

Unlike full AI agents that scan your workspace and build complex plans, Nanoterm is designed for speed and single-shot execution. It takes your natural language request, generates a shell command, and executes it directly in your native shell—only after your explicit approval.

## Features

- **Blazing Fast:** Sub-second startup time. No indexing, no background daemons, no scanning.
- **Privacy First:** Out-of-the-box integration with `@nanocollective/prompt-scrub`. If you use a cloud provider, all PII, secrets, and local paths are scrubbed from your context before leaving your machine. If you use Ollama, data never leaves.
- **Ephemeral Sessions:** Nanoterm remembers the stdout/stderr of your last command using temporary PID-scoped session caches. You can naturally chain follow-up commands (e.g. `nanoterm "find empty dirs"` → `nanoterm "delete them"`).
- **Safety First:** Built-in heuristic engine aggressively flags destructive commands (`rm -rf`, recursive `chmod`, disk formatting) and enforces explicit, typed `yes` confirmations.

## Installation

```bash
pnpm install -g @nanocollective/nanoterm
# or
npm install -g @nanocollective/nanoterm
```

## Configuration

Nanoterm shares the exact same configuration format as Nanocoder. It looks for `agents.config.json` in your current directory, `~/.config/nanoterm/`, or `~/.config/nanocoder/`.

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "apiKeys": {
    "openai": "sk-...",
    "anthropic": "sk-ant-...",
    "google": "AIza..."
  },
  "ollama": {
    "baseUrl": "http://127.0.0.1:11434/api"
  }
}
```

## Usage

```bash
nanoterm "find all large png files"
# Proposed command:
# > find . -type f -name "*.png" -size +10M
# Execute? [y/N/edit/?]: 
```

- `y`: Execute the command instantly.
- `N`: Abort.
- `edit`: Open the command for manual editing before running.
- `?`: Ask the AI to explain what the command will do.

## Community

Built by the Nano Collective — a community building AI tooling not for profit, but for the community.
- **Discord:** Join the Nano Collective Discord
- **Contributing:** Read our `CONTRIBUTING.md` to get started.
- **Issues:** Check GitHub Issues for planned work or to report bugs.
