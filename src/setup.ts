import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { select, input, password } from "@inquirer/prompts";
import { generateText } from "ai";
import { getProviderModel } from "./provider.js";
import type { NanotermConfig } from "./config.js";

const PROVIDERS = [
	{
		id: "1",
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
		id: "2",
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
		id: "3",
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
		id: "4",
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
		id: "5",
		name: "Custom (OpenAI Compatible)",
		defaultBaseUrl: "",
		models: ["Custom..."],
		sdkProvider: "openai-compatible",
	},
];

export async function runConfigWizard() {
	console.log("\n\x1b[36;1m--- Nanoterm Advanced Setup Wizard ---\x1b[0m\n");

	try {
		const configDir = path.join(os.homedir(), ".config", "nanoterm");
		if (!fs.existsSync(configDir)) {
			fs.mkdirSync(configDir, { recursive: true });
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

		const existingProviders = existingConfig.providers || [];

		if (existingProviders.length > 0) {
			const action = await select({
				message: "What would you like to do?",
				choices: [
					{ name: "Set Active Provider", value: "active" },
					{ name: "Add / Update Provider Credentials", value: "update" },
				],
			});

			if (action === "active") {
				const chosenName = await select({
					message: "Select active provider:",
					choices: existingProviders.map((p) => ({
						name: p.name,
						value: p.name,
					})),
				});

				const chosenProvider = existingProviders.find(
					(p) => p.name === chosenName,
				)!;

				let models = chosenProvider.models || [];
				if (models.length === 0) {
					// Fallback to defaults if they somehow have no models saved
					const defaultP = PROVIDERS.find((p) => p.name === chosenName);
					if (defaultP) models = defaultP.models;
				}

				let chosenModel = "";
				if (models.length > 0) {
					chosenModel = await select({
						message: "Select default model:",
						choices: models.map((m) => ({ name: m, value: m })),
					});

					if (chosenModel === "Custom...") {
						chosenModel = await input({ message: "Enter custom model ID:" });
					}
				} else {
					chosenModel = await input({ message: "Enter default model ID:" });
				}

				existingConfig.provider = chosenName;
				existingConfig.model = chosenModel;

				fs.writeFileSync(
					configPath,
					JSON.stringify(existingConfig, null, 2),
					"utf-8",
				);
				console.log(
					`\n\x1b[32mSuccess! Active provider set to ${chosenName} (${chosenModel})\x1b[0m\n`,
				);
				return;
			}
		}

		const providerId = await select({
			message: "Select a provider to configure:",
			choices: PROVIDERS.map((p) => ({
				name: p.name,
				value: p.id,
			})),
		});

		const selectedProvider = PROVIDERS.find((p) => p.id === providerId)!;

		let baseUrl = selectedProvider.defaultBaseUrl;
		if (selectedProvider.id === "5") {
			baseUrl = await input({
				message: "Enter Base URL (e.g. https://api.together.ai/v1): ",
			});
		}

		const modelChoice = await select({
			message: "Select a model:",
			choices: selectedProvider.models.map((m) => ({
				name: m,
				value: m,
			})),
		});

		let model = modelChoice;
		if (modelChoice === "Custom...") {
			model = await input({
				message: "Enter custom model ID:",
			});
		}

		let apiKey = "";
		let isValid = false;

		while (!isValid) {
			apiKey = await password({
				message: "Enter API Key:",
				mask: "*",
			});

			console.log("\x1b[36mValidating API Key...\x1b[0m");

			try {
				// Mock config for validation
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

				const modelInstance = getProviderModel(mockConfig, model);

				await generateText({
					model: modelInstance,
					prompt: "Respond with the word OK",
				});

				isValid = true;
				console.log("\x1b[32mValidation successful!\x1b[0m");
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);

				const isWarningOnly =
					msg.includes("400") ||
					msg.includes("404") ||
					msg.toLowerCase().includes("bad request") ||
					msg.toLowerCase().includes("not found");

				if (!isWarningOnly) {
					console.log(`\n\x1b[31mValidation failed: ${msg}\x1b[0m`);
					console.log(
						"\x1b[33mPlease check your API key and try again.\x1b[0m\n",
					);
				} else {
					console.log(`\n\x1b[33mValidation warning: ${msg}\x1b[0m`);
					console.log(
						"\x1b[32mAPI key was accepted (authentication succeeded). Proceeding...\x1b[0m\n",
					);
					isValid = true;
				}
			}
		}

		const providerName = selectedProvider.name;

		// Remove existing provider if updating
		const filteredProviders = existingProviders.filter(
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

		fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf-8");

		console.log(
			`\n\x1b[32mSuccess! Configuration saved to ${configPath}\x1b[0m\n`,
		);
	} catch (error: any) {
		if (error.name === "ExitPromptError") {
			console.log("\n\x1b[33mSetup cancelled.\x1b[0m\n");
			process.exit(0);
		} else {
			throw error;
		}
	}
}
