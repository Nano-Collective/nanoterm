import { scrub, rehydrate } from "@nanocollective/prompt-scrub";

export function scrubPrompt(
	prompt: string,
	provider: string,
	sessionMap: Record<string, string> = {},
): string {
	if (provider.toLowerCase() === "ollama") {
		// Local providers do not need scrubbing because data never leaves the machine.
		return prompt;
	}

	// Use Nano Collective's prompt-scrub to replace sensitive data with placeholders
	const result = scrub({ content: prompt, sessionMap });
	return result.scrubbedContent as string;
}

export function rehydratePrompt(
	prompt: string,
	provider: string,
	sessionMap: Record<string, string>,
): string {
	if (provider.toLowerCase() === "ollama") {
		return prompt;
	}

	const result = rehydrate({ content: prompt, sessionMap });
	return result.content as string;
}
