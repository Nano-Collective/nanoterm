import { generateText } from "ai";
import { getEnvironmentContext } from "./env.js";
import { loadSessionContext } from "./session.js";
import type { NanotermConfig } from "./config.js";
import { getProviderModel } from "./provider.js";
import { buildSystemPrompt, buildExplainPrompt } from "./prompt.js";
import { scrubPrompt } from "./privacy.js";

export async function generateCommand(
	request: string,
	config: NanotermConfig,
): Promise<string> {
	const env = getEnvironmentContext();
	const session = loadSessionContext();
	const model = getProviderModel(config, config.model);
	const rawSystemPrompt = buildSystemPrompt(env, session);

	// Scrub the prompts before sending to cloud providers
	const systemPrompt = scrubPrompt(rawSystemPrompt, config.provider);
	const safeRequest = scrubPrompt(request, config.provider);

	const { text } = await generateText({
		model,
		system: systemPrompt,
		prompt: safeRequest,
		temperature: 0,
	});

	return text.trim();
}

export async function explainCommand(
	command: string,
	config: NanotermConfig,
): Promise<string> {
	const model = getProviderModel(config, config.model);
	const rawSystemPrompt = buildExplainPrompt();

	const systemPrompt = scrubPrompt(rawSystemPrompt, config.provider);
	const safeCommand = scrubPrompt(command, config.provider);

	const { text } = await generateText({
		model,
		system: systemPrompt,
		prompt: `Explain this shell command concisely:\n\n${safeCommand}`,
		temperature: 0.2,
	});

	return text.trim();
}
