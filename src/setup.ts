import fs from "node:fs";
import path from "node:path";
import { select, input, password } from "@inquirer/prompts";
import { generateText } from "ai";
import { getProviderModel } from "./provider.js";
import {
	type NanotermConfig,
	type ProviderConfig,
	getPlatformConfigDir,
	writeConfigFile,
} from "./config.js";

interface ProviderOption {
	id: string;
	name: string;
	defaultBaseUrl: string;
	models: string[];
	sdkProvider: string;
	isLocal?: boolean;
}

const LOCAL_PROVIDERS: ProviderOption[] = [
	{
		id: "ollama",
		name: "Ollama",
		defaultBaseUrl: "http://localhost:11434/v1",
		models: ["llama4", "qwen3", "phi4", "Custom..."],
		sdkProvider: "openai-compatible",
		isLocal: true,
	},
	{
		id: "llama-cpp",
		name: "llama.cpp server",
		defaultBaseUrl: "http://localhost:8080/v1",
		models: ["Custom..."],
		sdkProvider: "openai-compatible",
		isLocal: true,
	},
	{
		id: "lmstudio",
		name: "LM Studio",
		defaultBaseUrl: "http://localhost:1234/v1",
		models: ["Custom..."],
		sdkProvider: "openai-compatible",
		isLocal: true,
	},
	{
		id: "mlx-server",
		name: "MLX Server",
		defaultBaseUrl: "http://localhost:8080/v1",
		models: ["Custom..."],
		sdkProvider: "openai-compatible",
		isLocal: true,
	},
];

const CLOUD_PROVIDERS: ProviderOption[] = [
	{
		id: "openai",
		name: "OpenAI",
		defaultBaseUrl: "https://api.openai.com/v1",
		models: [
			"gpt-5.6-sol",
			"gpt-5.6-terra",
			"gpt-5.6-luna",
			"o1-preview",
			"Custom...",
		],
		sdkProvider: "openai",
	},
	{
		id: "anthropic",
		name: "Anthropic Claude",
		defaultBaseUrl: "https://api.anthropic.com/v1",
		models: [
			"claude-opus-5",
			"claude-sonnet-5",
			"claude-fable-5",
			"claude-haiku-4-5",
			"Custom...",
		],
		sdkProvider: "anthropic",
	},
	{
		id: "google",
		name: "Google Gemini",
		defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
		models: [
			"gemini-3.6-flash",
			"gemini-3.5-pro",
			"gemini-3.5-flash-lite",
			"Custom...",
		],
		sdkProvider: "google",
	},
	{
		id: "atlas-cloud",
		name: "Atlas Cloud",
		defaultBaseUrl: "https://api.atlascloud.ai/v1",
		models: [
			"google/gemini-3.6-flash",
			"openai/gpt-5.6-terra",
			"anthropic/claude-sonnet-5",
			"Custom...",
		],
		sdkProvider: "openai-compatible",
	},
	{
		id: "openrouter",
		name: "OpenRouter",
		defaultBaseUrl: "https://openrouter.ai/api/v1",
		models: [
			"anthropic/claude-3.5-sonnet",
			"google/gemini-pro-1.5",
			"meta-llama/llama-3-70b-instruct",
			"Custom...",
		],
		sdkProvider: "openai-compatible",
	},
	{
		id: "requesty",
		name: "Requesty",
		defaultBaseUrl: "https://router.requesty.ai/v1",
		models: ["anthropic/claude-3-5-sonnet-20240620", "Custom..."],
		sdkProvider: "openai-compatible",
	},
	{
		id: "mistral",
		name: "Mistral AI",
		defaultBaseUrl: "https://api.mistral.ai/v1",
		models: [
			"mistral-large-latest",
			"mistral-small-latest",
			"codestral-latest",
			"Custom...",
		],
		sdkProvider: "mistral",
	},
	{
		id: "cohere",
		name: "Cohere",
		defaultBaseUrl: "https://api.cohere.ai/v1",
		models: ["command-r-plus", "command-r", "Custom..."],
		sdkProvider: "cohere",
	},
	{
		id: "zai",
		name: "Z.ai",
		defaultBaseUrl: "https://api.z.ai/v1",
		models: ["claude-3-5-sonnet", "gpt-4o", "Custom..."],
		sdkProvider: "openai-compatible",
	},
	{
		id: "zai-coding",
		name: "Z.ai Coding Subscription",
		defaultBaseUrl: "https://api.z.ai/v1",
		models: ["claude-3-5-sonnet", "gpt-4o", "Custom..."],
		sdkProvider: "openai-compatible",
	},
	{
		id: "github-models",
		name: "GitHub Models",
		defaultBaseUrl: "https://models.inference.ai.azure.com",
		models: ["gpt-4o", "Custom..."],
		sdkProvider: "openai-compatible",
	},
	{
		id: "chatgpt-codex",
		name: "ChatGPT / Codex",
		defaultBaseUrl: "https://api.openai.com/v1",
		models: ["gpt-4o", "gpt-4-turbo", "Custom..."],
		sdkProvider: "openai",
	},
	{
		id: "github-copilot",
		name: "GitHub Copilot",
		defaultBaseUrl: "https://api.githubcopilot.com",
		models: ["gpt-4o", "Custom..."],
		sdkProvider: "openai-compatible",
	},
	{
		id: "kimi-code",
		name: "Kimi Code",
		defaultBaseUrl: "https://api.moonshot.cn/v1",
		models: ["moonshot-v1-8k", "moonshot-v1-32k", "Custom..."],
		sdkProvider: "openai-compatible",
	},
	{
		id: "minimax",
		name: "MiniMax Coding Plan",
		defaultBaseUrl: "https://api.minimax.chat/v1",
		models: ["abab6.5s-chat", "Custom..."],
		sdkProvider: "openai-compatible",
	},
	{
		id: "poe",
		name: "Poe",
		defaultBaseUrl: "https://api.poe.com/bot",
		models: ["Claude-3.5-Sonnet", "GPT-4o", "Custom..."],
		sdkProvider: "openai-compatible",
	},
	{
		id: "custom",
		name: "Custom (OpenAI Compatible)",
		defaultBaseUrl: "",
		models: ["Custom..."],
		sdkProvider: "openai-compatible",
	},
];

const PROVIDERS = [...LOCAL_PROVIDERS, ...CLOUD_PROVIDERS];

type WizardState =
	| "start"
	| "action_select"
	| "set_active_provider"
	| "select_provider_type"
	| "select_provider"
	| "configure_provider"
	| "exit";

export async function runConfigWizard() {
	console.log("\n\x1b[36;1m--- Nanoterm Advanced Setup Wizard ---\x1b[0m\n");

	const configDir = getPlatformConfigDir("nanoterm");
	if (!fs.existsSync(configDir)) {
		fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
	}

	const configPath = path.join(configDir, "agents.config.json");

	let existingConfig: Partial<NanotermConfig> = {};
	if (fs.existsSync(configPath)) {
		try {
			existingConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
		} catch (_e) {
			// Ignore read error
		}
	}

	let state: WizardState = "start";

	// Track some shared state during the wizard
	let providerType: "local" | "cloud" = "cloud";
	let selectedProviderId = "";

	const CANCEL = Symbol("CANCEL");

	// Wrapper to handle cancel
	async function promptWithCancel<T>(
		promptFn: () => Promise<T>,
		cancelState: WizardState,
		isRoot = false,
	): Promise<T | typeof CANCEL> {
		try {
			const res = await promptFn();
			if (res === "__back") {
				state = cancelState;
				return CANCEL;
			}
			return res;
		} catch (error: unknown) {
			if (error instanceof Error && error.name === "ExitPromptError") {
				if (isRoot) {
					console.log("\n\x1b[33mSetup cancelled.\x1b[0m\n");
					process.exit(0);
				}
				state = cancelState;
				return CANCEL;
			}
			throw error;
		}
	}

	while (state !== "exit") {
		const existingProviders: ProviderConfig[] = existingConfig.providers || [];

		if (state === "start") {
			if (existingProviders.length > 0) {
				state = "action_select";
			} else {
				state = "select_provider_type";
			}
		}

		if (state === "action_select") {
			const action = await promptWithCancel(
				() =>
					select({
						message: "What would you like to do?",
						choices: [
							{ name: "Set Active Provider", value: "active" },
							{ name: "Add / Update Provider Credentials", value: "update" },
						],
					}),
				"exit", // Using Ctrl+C at the root exits
				true,
			);

			if (action === CANCEL) continue;

			if (action === "active") {
				state = "set_active_provider";
			} else {
				state = "select_provider_type";
			}
		}

		if (state === "set_active_provider") {
			const chosenName = await promptWithCancel(
				() =>
					select({
						message: "Select active provider:",
						choices: [
							{ name: "← Back", value: "__back" },
							...existingProviders.map((p) => ({
								name: p.name,
								value: p.name,
							})),
						],
					}),
				"action_select",
			);

			if (chosenName === CANCEL) continue;

			const chosenProvider = existingProviders.find(
				(p) => p.name === chosenName,
			);
			if (!chosenProvider) throw new Error("Provider not found");

			let models = chosenProvider.models || [];
			if (models.length === 0) {
				const defaultP = PROVIDERS.find((p) => p.name === chosenName);
				if (defaultP) models = defaultP.models;
			}

			let chosenModel = "";
			if (models.length > 0) {
				const modelChoice = await promptWithCancel(
					() =>
						select({
							message: "Select default model:",
							choices: [
								{ name: "← Back", value: "__back" },
								...models.map((m) => ({ name: m, value: m })),
							],
						}),
					"set_active_provider",
				);

				if (modelChoice === CANCEL) continue;
				chosenModel = modelChoice as string;

				if (chosenModel === "Custom...") {
					const customModel = await promptWithCancel(
						() => input({ message: "Enter custom model ID:" }),
						"set_active_provider",
					);
					if (customModel === CANCEL) continue;
					chosenModel = customModel as string;
				}
			} else {
				const inputModel = await promptWithCancel(
					() => input({ message: "Enter default model ID:" }),
					"set_active_provider",
				);
				if (inputModel === CANCEL) continue;
				chosenModel = inputModel as string;
			}

			existingConfig.provider = chosenName as string;
			existingConfig.model = chosenModel;

			writeConfigFile(configPath, existingConfig);
			console.log(
				`\n\x1b[32mSuccess! Active provider set to ${chosenName} (${chosenModel})\x1b[0m\n`,
			);
			state = "exit";
		}

		if (state === "select_provider_type") {
			const type = await promptWithCancel(
				() =>
					select({
						message: "Select provider type:",
						choices: [
							{ name: "← Back", value: "__back" },
							{
								name: "Local Provider (Ollama, LM Studio, etc.)",
								value: "local",
							},
							{
								name: "Cloud Provider (OpenAI, Anthropic, etc.)",
								value: "cloud",
							},
						],
					}),
				existingProviders.length > 0 ? "action_select" : "exit",
				existingProviders.length === 0, // Can exit if it's the first screen
			);

			if (type === CANCEL) continue;

			providerType = type as "local" | "cloud";
			state = "select_provider";
		}

		if (state === "select_provider") {
			const providerList =
				providerType === "local" ? LOCAL_PROVIDERS : CLOUD_PROVIDERS;

			const providerId = await promptWithCancel(
				() =>
					select({
						message: "Select a provider to configure:",
						choices: [
							{ name: "← Back", value: "__back" },
							...providerList.map((p) => ({
								name: p.name,
								value: p.id,
							})),
						],
					}),
				"select_provider_type",
			);

			if (providerId === CANCEL) continue;
			selectedProviderId = providerId as string;
			state = "configure_provider";
		}

		if (state === "configure_provider") {
			const selectedProvider = PROVIDERS.find(
				(p) => p.id === selectedProviderId,
			);
			if (!selectedProvider) throw new Error("Provider not found");

			let baseUrl = selectedProvider.defaultBaseUrl;

			if (selectedProvider.id === "custom") {
				const customBaseUrl = await promptWithCancel(
					() =>
						input({
							message: "Enter Base URL (e.g. https://api.together.ai/v1): ",
						}),
					"select_provider",
				);
				if (customBaseUrl === CANCEL) continue;
				baseUrl = customBaseUrl as string;
			} else if (selectedProvider.isLocal) {
				const customBaseUrl = await promptWithCancel(
					() =>
						input({
							message: `Enter Base URL (default: ${baseUrl}): `,
							default: baseUrl,
						}),
					"select_provider",
				);
				if (customBaseUrl === CANCEL) continue;
				if ((customBaseUrl as string).trim())
					baseUrl = (customBaseUrl as string).trim();
			}

			const modelChoice = await promptWithCancel(
				() =>
					select({
						message: "Select a model:",
						choices: [
							{ name: "← Back", value: "__back" },
							...selectedProvider.models.map((m) => ({
								name: m,
								value: m,
							})),
						],
					}),
				"select_provider",
			);
			if (modelChoice === CANCEL) continue;

			let model = modelChoice as string;
			if (model === "Custom...") {
				const customModel = await promptWithCancel(
					() =>
						input({
							message: "Enter custom model ID:",
						}),
					"select_provider",
				);
				if (customModel === CANCEL) continue;
				model = customModel as string;
			}

			let apiKey = "";
			let isValid = false;

			if (selectedProvider.isLocal) {
				console.log(
					"\x1b[36m\nLocal provider selected. Skipping API key validation...\x1b[0m",
				);
				isValid = true;
			}

			let shouldGoBack = false;

			while (!isValid) {
				const keyInput = await promptWithCancel(
					() =>
						password({
							message: "Enter API Key:",
							mask: "*",
						}),
					"select_provider",
				);

				if (keyInput === CANCEL) {
					shouldGoBack = true;
					break;
				}
				apiKey = keyInput as string;

				console.log("\x1b[36mValidating API Key...\x1b[0m");

				try {
					const mockConfig: NanotermConfig = {
						provider: selectedProvider.name,
						model: model,
						providers: [
							{
								name: selectedProvider.name,
								baseUrl: baseUrl,
								apiKey: apiKey,
								sdkProvider: selectedProvider.sdkProvider,
							},
						],
					};

					await validateProviderCredentials(mockConfig);

					isValid = true;
					console.log("\x1b[32mValidation successful!\x1b[0m");
				} catch (error: unknown) {
					const msg = error instanceof Error ? error.message : String(error);

					console.log(`\n\x1b[31mValidation failed: ${msg}\x1b[0m`);

					const action = await promptWithCancel(
						() =>
							select({
								message: "What would you like to do?",
								choices: [
									{ name: "Retry entering API Key", value: "retry" },
									{ name: "Cancel and go back", value: "__back" },
								],
							}),
						"select_provider",
					);

					if (action === CANCEL || action === "__back") {
						shouldGoBack = true;
						break;
					}
				}
			}

			if (shouldGoBack) {
				state = "select_provider";
				continue;
			}

			const providerName = selectedProvider.name;

			const filteredProviders: ProviderConfig[] = existingProviders.filter(
				(p) => p.name !== providerName,
			);
			filteredProviders.push({
				name: providerName,
				baseUrl: baseUrl,
				apiKey: apiKey,
				models: [model],
				sdkProvider: selectedProvider.sdkProvider,
			});

			const newConfig = {
				...existingConfig,
				provider: providerName,
				model: model,
				providers: filteredProviders,
			};

			writeConfigFile(configPath, newConfig);

			console.log(
				`\n\x1b[32mSuccess! Configuration saved to ${configPath}\x1b[0m\n`,
			);
			state = "exit";
		}
	}
}

type GenerateProbe = typeof generateText;

export async function validateProviderCredentials(
	config: NanotermConfig,
	probe: GenerateProbe = generateText,
): Promise<void> {
	const model = await getProviderModel(config, config.model);
	await probe({
		model,
		prompt: "Respond with the word OK",
	});
}
