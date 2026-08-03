import { scrub, rehydrate } from "@nanocollective/prompt-scrub";
import type { NanotermConfig } from "./config.js";

function isLocalProvider(config: NanotermConfig | string): boolean {
	if (typeof config === "string") {
		const name = config.toLowerCase();
		return name === "ollama" || name === "lm studio" || name.includes("local");
	}

	const providerName = config.provider.toLowerCase();
	const customConfig = config.providers?.find(
		(p) => p.name.toLowerCase() === providerName,
	);

	if (customConfig?.baseUrl) {
		const url = customConfig.baseUrl.toLowerCase();
		return (
			url.includes("localhost") ||
			url.includes("127.0.0.1") ||
			url.includes("0.0.0.0")
		);
	}

	return (
		providerName === "ollama" ||
		providerName === "lm studio" ||
		providerName.includes("local")
	);
}

export function scrubPrompt(
	prompt: string,
	config: NanotermConfig | string,
	sessionMap: Record<string, string> = {},
): string {
	if (isLocalProvider(config)) {
		// Local providers do not need scrubbing because data never leaves the machine.
		return prompt;
	}

	// Use Nano Collective's prompt-scrub to replace sensitive data with placeholders
	const result = scrub({ content: prompt, sessionMap });
	return result.scrubbedContent as string;
}

export function rehydratePrompt(
	prompt: string,
	config: NanotermConfig | string,
	sessionMap: Record<string, string>,
): string {
	if (isLocalProvider(config)) {
		return prompt;
	}

	const result = rehydrate({ content: prompt, sessionMap });
	return result.content as string;
}
