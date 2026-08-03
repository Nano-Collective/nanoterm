import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { createCohere } from "@ai-sdk/cohere";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { NanotermConfig } from "./config.js";

// biome-ignore lint/suspicious/noExplicitAny: Vercel AI SDK version mismatch requires any
export function getProviderModel(
	config: NanotermConfig,
	modelName: string,
): any {
	const providerName = config.provider.toLowerCase();

	// Check if this provider is explicitly configured in nanocoder.providers
	const customConfig = config.providers.find(
		(p) => p.name.toLowerCase() === providerName,
	);

	if (customConfig) {
		const sdk = customConfig.sdkProvider || "openai-compatible";
		const apiKey = customConfig.apiKey ?? "";
		const baseURL = customConfig.baseUrl;

		switch (sdk) {
			case "anthropic": {
				const anthropic = createAnthropic({ apiKey, baseURL });
				return anthropic(modelName);
			}
			case "google": {
				const google = createGoogleGenerativeAI({ apiKey, baseURL });
				return google(modelName);
			}
			case "openai": {
				const openai = createOpenAI({ apiKey, baseURL });
				return openai(modelName);
			}
			case "mistral": {
				const mistral = createMistral({ apiKey, baseURL });
				return mistral(modelName);
			}
			case "cohere": {
				const cohere = createCohere({ apiKey, baseURL });
				return cohere(modelName);
			}

			default: {
				const compatible = createOpenAICompatible({
					name: customConfig.name,
					apiKey: apiKey || "dummy-key",
					baseURL: baseURL || "",
				});
				return compatible(modelName);
			}
		}
	}

	// Fallback to basic environment-based native providers if no custom config found
	switch (providerName) {
		case "openai": {
			const openai = createOpenAI();
			return openai(modelName);
		}
		case "anthropic": {
			const anthropic = createAnthropic();
			return anthropic(modelName);
		}
		case "google": {
			const google = createGoogleGenerativeAI();
			return google(modelName);
		}
		case "mistral": {
			const mistral = createMistral();
			return mistral(modelName);
		}
		case "cohere": {
			const cohere = createCohere();
			return cohere(modelName);
		}
		case "ollama": {
			const compatible = createOpenAICompatible({
				name: "Ollama",
				apiKey: "dummy-key",
				baseURL: "http://localhost:11434/v1",
			});
			return compatible(modelName);
		}
		default: {
			const defaultProvider = createOpenAI();
			return defaultProvider(modelName);
		}
	}
}
