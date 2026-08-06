import type { NanotermConfig } from "./config.js";
import type { LanguageModel } from "ai";

export type ProviderModel = Exclude<LanguageModel, string>;

export async function getProviderModel(
	config: NanotermConfig,
	modelName: string,
): Promise<ProviderModel> {
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
				const { createAnthropic } = await import("@ai-sdk/anthropic");
				const anthropic = createAnthropic({ apiKey, baseURL });
				return anthropic(modelName);
			}
			case "google": {
				const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
				const google = createGoogleGenerativeAI({ apiKey, baseURL });
				return google(modelName);
			}
			case "openai": {
				const { createOpenAI } = await import("@ai-sdk/openai");
				const openai = createOpenAI({ apiKey, baseURL });
				return openai(modelName);
			}
			case "mistral": {
				const { createMistral } = await import("@ai-sdk/mistral");
				const mistral = createMistral({ apiKey, baseURL });
				return mistral(modelName);
			}
			case "cohere": {
				const { createCohere } = await import("@ai-sdk/cohere");
				const cohere = createCohere({ apiKey, baseURL });
				return cohere(modelName);
			}

			default: {
				const { createOpenAICompatible } = await import(
					"@ai-sdk/openai-compatible"
				);
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
			const { createOpenAI } = await import("@ai-sdk/openai");
			const openai = createOpenAI();
			return openai(modelName);
		}
		case "anthropic": {
			const { createAnthropic } = await import("@ai-sdk/anthropic");
			const anthropic = createAnthropic();
			return anthropic(modelName);
		}
		case "google": {
			const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
			const google = createGoogleGenerativeAI();
			return google(modelName);
		}
		case "mistral": {
			const { createMistral } = await import("@ai-sdk/mistral");
			const mistral = createMistral();
			return mistral(modelName);
		}
		case "cohere": {
			const { createCohere } = await import("@ai-sdk/cohere");
			const cohere = createCohere();
			return cohere(modelName);
		}
		case "ollama": {
			const { createOpenAICompatible } = await import(
				"@ai-sdk/openai-compatible"
			);
			const compatible = createOpenAICompatible({
				name: "Ollama",
				apiKey: "dummy-key",
				baseURL: "http://localhost:11434/v1",
			});
			return compatible(modelName);
		}
		default: {
			const { createOpenAI } = await import("@ai-sdk/openai");
			const defaultProvider = createOpenAI();
			return defaultProvider(modelName);
		}
	}
}
