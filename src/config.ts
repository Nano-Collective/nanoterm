import fs from "node:fs";
import path from "node:path";
import os from "node:os";

interface ProviderConfig {
	name: string;
	baseUrl?: string;
	apiKey?: string;
	models?: string[];
	sdkProvider?: string;
}

export interface NanotermConfig {
	provider: string;
	model: string;
	providers: ProviderConfig[];
}

export function loadConfig(): NanotermConfig {
	const configPaths = [
		process.env.NANOTERM_CONFIG_PATH,
		path.join(os.homedir(), ".config", "nanocoder", "agents.config.json"),
		path.join(os.homedir(), ".config", "nanoterm", "agents.config.json"),
		path.join(process.cwd(), "agents.config.json"),
	];

	for (const configPath of configPaths) {
		if (configPath && fs.existsSync(configPath)) {
			try {
				const fileContent = fs.readFileSync(configPath, "utf-8");
				const config = JSON.parse(fileContent);

				// Extract providers from the nested nanocoder config, if it exists
				const providers: ProviderConfig[] =
					config.nanocoder?.providers || config.providers || [];

				const provider =
					config.provider ||
					config.nanocoder?.modeProviders?.normal?.provider ||
					"openai";
				const model =
					config.model ||
					config.nanocoder?.modeProviders?.normal?.model ||
					"gpt-4o";

				return {
					provider,
					model,
					providers,
				};
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				console.warn(`Failed to parse config at ${configPath}: ${msg}`);
			}
		}
	}

	// Fallback defaults if no config is found
	return {
		provider: "openai",
		model: "gpt-4o",
		providers: [],
	};
}
