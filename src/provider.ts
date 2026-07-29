import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider";

// biome-ignore lint/suspicious/noExplicitAny: Vercel AI SDK version mismatch requires any
export function getProviderModel(providerName: string, modelName: string): any {
	switch (providerName.toLowerCase()) {
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
		case "ollama": {
			const ollama = createOllama();
			return ollama(modelName);
		}
		default: {
			const defaultProvider = createOpenAI();
			return defaultProvider(modelName);
		}
	}
}
