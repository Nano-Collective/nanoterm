import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface ProviderConfig {
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

export function writeConfigFile(
	configPath: string,
	config: Partial<NanotermConfig>,
): void {
	const configDir = path.dirname(configPath);
	fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
	fs.chmodSync(configDir, 0o700);
	if (fs.existsSync(configPath)) fs.chmodSync(configPath, 0o600);
	fs.writeFileSync(configPath, JSON.stringify(config, null, 2), {
		encoding: "utf-8",
		mode: 0o600,
	});
	// writeFileSync's mode is ignored for an existing file, so enforce it explicitly.
	fs.chmodSync(configPath, 0o600);
}

export function getPlatformConfigDir(appName: string): string {
	if (process.platform === "darwin") {
		return path.join(os.homedir(), "Library", "Preferences", appName);
	}
	if (process.platform === "win32") {
		return path.join(
			process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
			appName,
		);
	}
	return path.join(os.homedir(), ".config", appName);
}

export function resolveEnvVars(value: string | undefined): string | undefined {
	if (!value) return value;
	return value.replace(
		/\$(?:([A-Za-z0-9_]+)|\{([A-Za-z0-9_]+)(?::-([^}]*))?\})/g,
		(_match, p1, p2, p3) => {
			const varName = p1 || p2;
			const envVal = process.env[varName];
			if (envVal) return envVal;
			if (p3 !== undefined) return p3;
			return "";
		},
	);
}

/**
 * Every place a configuration may live, in the order they win.
 *
 * The single source of truth for config location. It exists because there used
 * to be two: `loadConfig` resolved one way and the setup wizard another, so a
 * user with `NANOCODER_CONFIG_DIR` set had the wizard write somewhere the app
 * never read — and was told "Success!" for it.
 */
function configSearchPaths(): string[] {
	const configPaths: string[] = [
		path.join(process.cwd(), "agents.config.json"),
	];

	if (process.env.NANOTERM_CONFIG_PATH) {
		configPaths.push(process.env.NANOTERM_CONFIG_PATH);
	}

	if (process.env.NANOCODER_CONFIG_DIR) {
		configPaths.push(
			path.join(process.env.NANOCODER_CONFIG_DIR, "agents.config.json"),
		);
	} else {
		configPaths.push(
			path.join(getPlatformConfigDir("nanoterm"), "agents.config.json"),
			path.join(getPlatformConfigDir("nanocoder"), "agents.config.json"),
			path.join(os.homedir(), ".agents.config.json"),
		);
	}

	return configPaths;
}

/**
 * The file the setup wizard writes to.
 *
 * Follows the same precedence as {@link configSearchPaths} so that what the
 * wizard saves is what the app loads — with one deliberate exception: the
 * current working directory is never written to. `loadConfig` reads it first as
 * a project-local override, but a wizard that dropped an API key into whatever
 * directory you happened to be standing in would be a good way to commit one.
 */
export function getWritableConfigPath(): string {
	if (process.env.NANOTERM_CONFIG_PATH) {
		return process.env.NANOTERM_CONFIG_PATH;
	}
	if (process.env.NANOCODER_CONFIG_DIR) {
		return path.join(process.env.NANOCODER_CONFIG_DIR, "agents.config.json");
	}
	return path.join(getPlatformConfigDir("nanoterm"), "agents.config.json");
}

/**
 * The configuration the app will actually load, or null if there is none.
 *
 * Used by the wizard to tell whether something higher in the search order will
 * shadow what it is about to write — a project-local `agents.config.json` in
 * the working directory still wins, and silently overriding a fresh setup is
 * the failure this whole module is arranged to prevent.
 */
export function findActiveConfigPath(): string | null {
	return configSearchPaths().find((p) => fs.existsSync(p)) ?? null;
}

export function loadConfig(): NanotermConfig {
	const configPaths = configSearchPaths();

	for (const configPath of configPaths) {
		if (fs.existsSync(configPath)) {
			try {
				const fileContent = fs.readFileSync(configPath, "utf-8");
				const config = JSON.parse(fileContent);

				// Extract providers from the nested nanocoder config, if it exists
				let providers: ProviderConfig[] =
					config.nanocoder?.providers || config.providers || [];

				providers = providers.map((p) => ({
					...p,
					baseUrl: resolveEnvVars(p.baseUrl),
					apiKey: resolveEnvVars(p.apiKey),
				}));

				const fallbackProvider =
					providers.length > 0 ? providers[0].name : "openai";
				const fallbackModel =
					providers.length > 0 &&
					providers[0].models &&
					providers[0].models.length > 0
						? providers[0].models[0]
						: "gpt-4o";

				const provider =
					resolveEnvVars(
						config.provider ||
							config.nanocoder?.modeProviders?.normal?.provider,
					) || fallbackProvider;
				const model =
					resolveEnvVars(
						config.model || config.nanocoder?.modeProviders?.normal?.model,
					) || fallbackModel;

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
