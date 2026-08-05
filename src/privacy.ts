import { scrub, rehydrate } from "@nanocollective/prompt-scrub";
import type { NanotermConfig } from "./config.js";

const LOCAL_PROVIDER_NAMES = new Set([
	"ollama",
	"lm studio",
	"llama.cpp server",
	"mlx server",
]);

function isLocalHostname(hostname: string): boolean {
	const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
	if (
		normalized === "localhost" ||
		normalized === "::1" ||
		normalized === "0.0.0.0"
	) {
		return true;
	}

	const octets = normalized.split(".").map(Number);
	return (
		octets.length === 4 &&
		octets.every(
			(octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255,
		) &&
		octets[0] === 127
	);
}

export function isLocalProvider(config: NanotermConfig | string): boolean {
	if (typeof config === "string") {
		return LOCAL_PROVIDER_NAMES.has(config.toLowerCase());
	}

	const providerName = config.provider.toLowerCase();
	const customConfig = config.providers?.find(
		(p) => p.name.toLowerCase() === providerName,
	);

	if (customConfig?.baseUrl) {
		try {
			return isLocalHostname(new URL(customConfig.baseUrl).hostname);
		} catch {
			return false;
		}
	}

	return LOCAL_PROVIDER_NAMES.has(providerName);
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
