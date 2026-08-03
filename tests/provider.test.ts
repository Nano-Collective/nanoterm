import test from "ava";
import { getProviderModel } from "../src/provider.js";
import type { NanotermConfig } from "../src/config.js";

test("provider correctly initializes ollama local provider without API key", (t) => {
	const mockConfig: NanotermConfig = {
		provider: "Ollama",
		model: "llama3",
		providers: [
			{
				name: "Ollama",
				baseUrl: "http://localhost:11434/v1",
				apiKey: "", // Deliberately blank for local
				models: ["llama3"],
				sdkProvider: "ollama",
			},
		],
	};

	const modelInstance = getProviderModel(mockConfig, "llama3");

	t.truthy(modelInstance);
	t.is(modelInstance.modelId, "llama3");
	t.is(modelInstance.provider, "ollama.chat");
});

test("provider correctly initializes generic local openai-compatible provider with dummy key", (t) => {
	const mockConfig: NanotermConfig = {
		provider: "LM Studio",
		model: "local-model",
		providers: [
			{
				name: "LM Studio",
				baseUrl: "http://localhost:1234/v1",
				apiKey: "", // Deliberately blank for local
				models: ["local-model"],
				sdkProvider: "openai-compatible",
			},
		],
	};

	const modelInstance = getProviderModel(mockConfig, "local-model");

	t.truthy(modelInstance);
	t.is(modelInstance.modelId, "local-model");
	// The Vercel AI SDK stores the provider string on the object depending on the implementation
	t.truthy(modelInstance.provider.includes("LM Studio"));
});
