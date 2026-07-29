import type { EnvironmentContext } from "./env.js";
import type { SessionContext } from "./session.js";

export function buildSystemPrompt(
	env: EnvironmentContext,
	session: SessionContext | null,
): string {
	let prompt = `You are Nanoterm, an ultra-lightweight AI terminal companion.
Your only job is to translate the user's natural language request into a single, executable shell command.
You must output ONLY the shell command. Do not use markdown blocks, do not explain the command, and do not provide conversational filler.

Environment context:
- OS: ${env.osPlatform} (${env.osRelease})
- Shell: ${env.shell}
- Current Working Directory: ${env.cwd}`;

	if (session) {
		prompt += `\n\nRecent context (from the user's last executed command):\n`;
		prompt += `Command: ${session.lastCommand}\n`;
		if (session.stdout) {
			prompt += `stdout:\n${session.stdout}\n`;
		}
		if (session.stderr) {
			prompt += `stderr:\n${session.stderr}\n`;
		}
	}

	return prompt;
}

export function buildExplainPrompt(): string {
	return `You are Nanoterm. Your job is to explain a shell command to the user.
  Explain what the following command does in 1-2 short, clear sentences. Do not use conversational filler, just explain the command.`;
}
