import { generateText } from "ai";
import { getEnvironmentContext } from "./env.js";
import { loadSessionContext } from "./session.js";
import type { NanotermConfig } from "./config.js";
import { getProviderModel } from "./provider.js";
import { buildSystemPrompt, buildExplainPrompt } from "./prompt.js";
import { scrubPrompt, rehydratePrompt } from "./privacy.js";

export async function generateCommand(
	request: string,
	config: NanotermConfig,
): Promise<string> {
	const env = getEnvironmentContext();
	const session = loadSessionContext();
	const model = getProviderModel(config, config.model);
	const rawSystemPrompt = buildSystemPrompt(env, session);

	const sessionMap: Record<string, string> = {};

	// Scrub the prompts before sending to cloud providers
	const systemPrompt = scrubPrompt(rawSystemPrompt, config, sessionMap);
	const safeRequest = scrubPrompt(request, config, sessionMap);

	const { text } = await generateText({
		model,
		system: systemPrompt,
		prompt: safeRequest,
		temperature: 0,
	});

	let rawCommand = rehydratePrompt(text.trim(), config, sessionMap);
	return sanitizeCommand(rawCommand);
}

export function sanitizeCommand(command: string): string {
	let finalCommand = command.trim();

	// Strip fenced code blocks if the model wrapped the response
	const codeBlockMatch = finalCommand.match(/```[a-zA-Z]*\n([\s\S]*?)\n```/);
	if (codeBlockMatch) {
		finalCommand = codeBlockMatch[1].trim();
	} else {
		finalCommand = finalCommand.replace(/^```[a-zA-Z]*\n?/i, "").replace(/\n?```$/i, "").trim();
	}

	// Strip leading shell prompts
	finalCommand = finalCommand.replace(/^\$\s+/, "").trim();

	return finalCommand;
}

export async function explainCommand(
	command: string,
	config: NanotermConfig,
): Promise<string> {
	const model = getProviderModel(config, config.model);
	const rawSystemPrompt = buildExplainPrompt();

	const sessionMap: Record<string, string> = {};

	const systemPrompt = scrubPrompt(rawSystemPrompt, config, sessionMap);
	const safeCommand = scrubPrompt(command, config, sessionMap);

	const { text } = await generateText({
		model,
		system: systemPrompt,
		prompt: `Explain this shell command concisely:\n\n${safeCommand}`,
		temperature: 0.2,
	});

	return rehydratePrompt(text.trim(), config, sessionMap);
}
