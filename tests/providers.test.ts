import test from "ava";
import { getProviderModel } from "../src/provider.js";
import type { NanotermConfig } from "../src/config.js";

test.serial(
	"provider › anthropic SDK is selected for matching custom config",
	async (t) => {
		const config: NanotermConfig = {
			provider: "Anthropic Claude",
			model: "claude-3-5-sonnet",
			providers: [
				{
					name: "Anthropic Claude",
					baseUrl: "https://api.anthropic.com/v1",
					apiKey: "test-key",
					sdkProvider: "anthropic",
				},
			],
		};
		const model = await getProviderModel(config, "claude-3-5-sonnet");
		t.is(model.modelId, "claude-3-5-sonnet");
	},
);

test.serial(
	"provider › google SDK is selected for matching custom config",
	async (t) => {
		const config: NanotermConfig = {
			provider: "Google Gemini",
			model: "gemini-1.5-pro",
			providers: [
				{
					name: "Google Gemini",
					baseUrl: "https://generativelanguage.googleapis.com/v1beta",
					apiKey: "test-key",
					sdkProvider: "google",
				},
			],
		};
		const model = await getProviderModel(config, "gemini-1.5-pro");
		t.is(model.modelId, "gemini-1.5-pro");
	},
);

test.serial(
	"provider › openai SDK is selected for matching custom config",
	async (t) => {
		const config: NanotermConfig = {
			provider: "OpenAI",
			model: "gpt-4o",
			providers: [
				{
					name: "OpenAI",
					baseUrl: "https://api.openai.com/v1",
					apiKey: "test-key",
					sdkProvider: "openai",
				},
			],
		};
		const model = await getProviderModel(config, "gpt-4o");
		t.is(model.modelId, "gpt-4o");
	},
);

test.serial(
	"provider › mistral SDK is selected for matching custom config",
	async (t) => {
		const config: NanotermConfig = {
			provider: "Mistral AI",
			model: "mistral-large-latest",
			providers: [
				{
					name: "Mistral AI",
					baseUrl: "https://api.mistral.ai/v1",
					apiKey: "test-key",
					sdkProvider: "mistral",
				},
			],
		};
		const model = await getProviderModel(config, "mistral-large-latest");
		t.is(model.modelId, "mistral-large-latest");
	},
);

test.serial(
	"provider › cohere SDK is selected for matching custom config",
	async (t) => {
		const config: NanotermConfig = {
			provider: "Cohere",
			model: "command-r-plus",
			providers: [
				{
					name: "Cohere",
					baseUrl: "https://api.cohere.ai/v1",
					apiKey: "test-key",
					sdkProvider: "cohere",
				},
			],
		};
		const model = await getProviderModel(config, "command-r-plus");
		t.is(model.modelId, "command-r-plus");
	},
);

test.serial(
	"provider › custom config defaults to openai-compatible SDK",
	async (t) => {
		const config: NanotermConfig = {
			provider: "My Local LLM",
			model: "local-model",
			providers: [
				{
					name: "My Local LLM",
					baseUrl: "http://localhost:1234/v1",
					apiKey: "",
					sdkProvider: "openai-compatible",
				},
			],
		};
		const model = await getProviderModel(config, "local-model");
		t.is(model.modelId, "local-model");
	},
);

test.serial(
	"provider › unknown sdkProvider falls back to openai-compatible",
	async (t) => {
		const config: NanotermConfig = {
			provider: "Custom Provider",
			model: "custom-model",
			providers: [
				{
					name: "Custom Provider",
					baseUrl: "http://localhost:9999/v1",
					apiKey: "test",
					sdkProvider: "unknown-sdk-type",
				},
			],
		};
		const model = await getProviderModel(config, "custom-model");
		t.is(model.modelId, "custom-model");
	},
);

test.serial(
	"provider › missing sdkProvider defaults to openai-compatible",
	async (t) => {
		const config: NanotermConfig = {
			provider: "Custom No Sdk",
			model: "model",
			providers: [
				{
					name: "Custom No Sdk",
					baseUrl: "http://localhost:9999/v1",
					apiKey: "test",
				},
			],
		};
		const model = await getProviderModel(config, "model");
		t.is(model.modelId, "model");
	},
);

test.serial(
	"provider › fallback uses openai for matching provider name without custom config",
	async (t) => {
		const config: NanotermConfig = {
			provider: "openai",
			model: "gpt-4o",
			providers: [],
		};
		const model = await getProviderModel(config, "gpt-4o");
		t.is(model.modelId, "gpt-4o");
	},
);

test.serial(
	"provider › fallback uses anthropic for matching provider name without custom config",
	async (t) => {
		const config: NanotermConfig = {
			provider: "anthropic",
			model: "claude-3-5-sonnet",
			providers: [],
		};
		const model = await getProviderModel(config, "claude-3-5-sonnet");
		t.is(model.modelId, "claude-3-5-sonnet");
	},
);

test.serial(
	"provider › fallback uses google for matching provider name without custom config",
	async (t) => {
		const config: NanotermConfig = {
			provider: "google",
			model: "gemini-1.5-pro",
			providers: [],
		};
		const model = await getProviderModel(config, "gemini-1.5-pro");
		t.is(model.modelId, "gemini-1.5-pro");
	},
);

test.serial(
	"provider › fallback uses mistral for matching provider name without custom config",
	async (t) => {
		const config: NanotermConfig = {
			provider: "mistral",
			model: "mistral-large",
			providers: [],
		};
		const model = await getProviderModel(config, "mistral-large");
		t.is(model.modelId, "mistral-large");
	},
);

test.serial(
	"provider › fallback uses cohere for matching provider name without custom config",
	async (t) => {
		const config: NanotermConfig = {
			provider: "cohere",
			model: "command-r-plus",
			providers: [],
		};
		const model = await getProviderModel(config, "command-r-plus");
		t.is(model.modelId, "command-r-plus");
	},
);

test.serial(
	"provider › fallback uses ollama local provider with dummy key",
	async (t) => {
		const config: NanotermConfig = {
			provider: "ollama",
			model: "llama3",
			providers: [],
		};
		const model = await getProviderModel(config, "llama3");
		t.is(model.modelId, "llama3");
	},
);

test.serial(
	"provider › fallback uses openai for unrecognized provider names",
	async (t) => {
		const config: NanotermConfig = {
			provider: "totally-unknown-provider",
			model: "test-model",
			providers: [],
		};
		const model = await getProviderModel(config, "test-model");
		t.is(model.modelId, "test-model");
	},
);
