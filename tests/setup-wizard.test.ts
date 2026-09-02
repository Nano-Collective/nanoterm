import test from "ava";
import { register } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

register("./inquirer-loader.mjs", import.meta.url);

declare global {
	// eslint-disable-next-line no-var
	var __INQUIRER_STUB_ANSWERS__: Record<string, unknown>;
}

function resetStubs() {
	globalThis.__INQUIRER_STUB_ANSWERS__ = {};
}

function setupTmpDir() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-wizard-"));
	const originalCwd = process.cwd();
	const originalHome = process.env.HOME;
	process.env.HOME = dir;
	process.chdir(dir);
	return {
		dir,
		cleanup: () => {
			process.chdir(originalCwd);
			if (originalHome === undefined) {
				delete process.env.HOME;
			} else {
				process.env.HOME = originalHome;
			}
			fs.rmSync(dir, { recursive: true, force: true });
		},
	};
}

function configPathUnderHome(home: string): string {
	return path.join(home, ".config", "nanoterm", "agents.config.json");
}

async function runWizard(answers: Record<string, unknown>): Promise<void> {
	resetStubs();
	globalThis.__INQUIRER_STUB_ANSWERS__ = answers;
	// The wizard may call process.exit(0) when cancelled at the root;
	// temporarily make it a no-op so AVA doesn't fail the test file.
	const originalExit = process.exit;
	process.exit = (() => {}) as never;
	try {
		const { runConfigWizard } = await import("../src/setup.js");
		await runConfigWizard();
	} finally {
		process.exit = originalExit;
	}
}

test.serial(
	"runConfigWizard › cancels at the root with ExitPromptError",
	async (t) => {
		const { cleanup } = setupTmpDir();
		const originalExit = process.exit;
		const exits: number[] = [];
		process.exit = ((code?: number) => {
			exits.push(code ?? 0);
		}) as never;
		try {
			// First prompt should throw ExitPromptError
			resetStubs();
			globalThis.__INQUIRER_STUB_ANSWERS__ = {
				__throw_exit_on__: "select:Select provider type:",
			};
			const { runConfigWizard } = await import("../src/setup.js");
			await runConfigWizard();
			t.deepEqual(exits, [0]);
		} finally {
			process.exit = originalExit;
			cleanup();
		}
	},
);

test.serial(
	"runConfigWizard › '__back' at the first screen exits cleanly",
	async (t) => {
		const { cleanup } = setupTmpDir();
		try {
			await runWizard({
				"select:Select provider type:": "__back",
			});
			t.pass("wizard completed");
		} finally {
			cleanup();
		}
	},
);

test.serial(
	"runConfigWizard › first-run local Ollama setup writes a config file",
	async (t) => {
		const { dir, cleanup } = setupTmpDir();
		try {
			await runWizard({
				"select:Select provider type:": "local",
				"select:Select a provider to configure:": "ollama",
				"input:Enter Base URL (default: http://localhost:11434/v1): ":
					"http://localhost:11434/v1",
				"select:Select a model:": "llama4",
			});

			const configPath = configPathUnderHome(dir);
			t.true(fs.existsSync(configPath), `expected config at ${configPath}`);
			const written = JSON.parse(fs.readFileSync(configPath, "utf-8"));
			t.is(written.provider, "Ollama");
			t.is(written.model, "llama4");
			t.is(written.providers.length, 1);
			t.is(written.providers[0].sdkProvider, "openai-compatible");
			// File should be 0600
			const stats = fs.statSync(configPath);
			t.is(stats.mode & 0o777, 0o600);
		} finally {
			cleanup();
		}
	},
);

void 0;

test.serial(
	"runConfigWizard › 'Set Active Provider' reuses existing provider entries",
	async (t) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-wz-existing-"));
		const configDir = path.join(dir, "config");
		fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
		fs.writeFileSync(
			path.join(configDir, "agents.config.json"),
			JSON.stringify({
				provider: "Ollama",
				model: "llama4",
				providers: [
					{
						name: "Ollama",
						baseUrl: "http://localhost:11434/v1",
						models: ["llama4", "qwen3"],
						sdkProvider: "openai-compatible",
					},
				],
			}),
		);
		// The wizard writes to ~/.config/nanoterm; pre-create the file there
		// so the wizard can find it (and not error on write).
		const homeConfigDir = path.join(dir, ".config", "nanoterm");
		fs.mkdirSync(homeConfigDir, { recursive: true, mode: 0o700 });
		const homeConfigPath = path.join(homeConfigDir, "agents.config.json");
		fs.writeFileSync(
			homeConfigPath,
			fs.readFileSync(path.join(configDir, "agents.config.json"), "utf-8"),
		);
		const originalCwd = process.cwd();
		const originalDir = process.env.NANOCODER_CONFIG_DIR;
		const originalHome = process.env.HOME;
		process.env.NANOCODER_CONFIG_DIR = configDir;
		process.env.HOME = dir;
		process.chdir(dir);

		try {
			await runWizard({
				"select:What would you like to do?": "active",
				"select:Select active provider:": "Ollama",
				"select:Select default model:": "qwen3",
			});

			// The wizard writes to ~/.config/nanoterm/agents.config.json
			// (which equals configPathUnderHome(dir) because HOME=dir).
			const written = JSON.parse(
				fs.readFileSync(configPathUnderHome(dir), "utf-8"),
			);
			t.is(written.provider, "Ollama");
			t.is(written.model, "qwen3");
		} finally {
			if (originalDir === undefined) {
				delete process.env.NANOCODER_CONFIG_DIR;
			} else {
				process.env.NANOCODER_CONFIG_DIR = originalDir;
			}
			if (originalHome === undefined) {
				delete process.env.HOME;
			} else {
				process.env.HOME = originalHome;
			}
			process.chdir(originalCwd);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	},
);

test.serial(
	"runConfigWizard › 'Set Active Provider' falls back to manual model entry for unknown providers",
	async (t) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-wz-empty-"));
		const configDir = path.join(dir, "config");
		fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
		fs.writeFileSync(
			path.join(configDir, "agents.config.json"),
			JSON.stringify({
				provider: "CustomProvider",
				model: "old-model",
				providers: [
					{
						name: "CustomProvider",
						baseUrl: "http://example.com/v1",
						sdkProvider: "openai-compatible",
					},
				],
			}),
		);
		const homeConfigDir = path.join(dir, ".config", "nanoterm");
		fs.mkdirSync(homeConfigDir, { recursive: true, mode: 0o700 });
		const homeConfigPath = path.join(homeConfigDir, "agents.config.json");
		fs.writeFileSync(
			homeConfigPath,
			fs.readFileSync(path.join(configDir, "agents.config.json"), "utf-8"),
		);
		const originalCwd = process.cwd();
		const originalDir = process.env.NANOCODER_CONFIG_DIR;
		const originalHome = process.env.HOME;
		process.env.NANOCODER_CONFIG_DIR = configDir;
		process.env.HOME = dir;
		process.chdir(dir);

		try {
			await runWizard({
				"select:What would you like to do?": "active",
				"select:Select active provider:": "CustomProvider",
				"input:Enter default model ID:": "manual-model",
			});

			const written = JSON.parse(
				fs.readFileSync(configPathUnderHome(dir), "utf-8"),
			);
			t.is(written.model, "manual-model");
		} finally {
			if (originalDir === undefined) {
				delete process.env.NANOCODER_CONFIG_DIR;
			} else {
				process.env.NANOCODER_CONFIG_DIR = originalDir;
			}
			if (originalHome === undefined) {
				delete process.env.HOME;
			} else {
				process.env.HOME = originalHome;
			}
			process.chdir(originalCwd);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	},
);

test.serial(
	"runConfigWizard › 'Set Active Provider' allows a custom model ID",
	async (t) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-wz-custom-"));
		const configDir = path.join(dir, "config");
		fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
		fs.writeFileSync(
			path.join(configDir, "agents.config.json"),
			JSON.stringify({
				provider: "Ollama",
				model: "llama4",
				providers: [
					{
						name: "Ollama",
						baseUrl: "http://localhost:11434/v1",
						models: ["llama4"],
						sdkProvider: "openai-compatible",
					},
				],
			}),
		);
		const homeConfigDir = path.join(dir, ".config", "nanoterm");
		fs.mkdirSync(homeConfigDir, { recursive: true, mode: 0o700 });
		const homeConfigPath = path.join(homeConfigDir, "agents.config.json");
		fs.writeFileSync(
			homeConfigPath,
			fs.readFileSync(path.join(configDir, "agents.config.json"), "utf-8"),
		);
		const originalCwd = process.cwd();
		const originalDir = process.env.NANOCODER_CONFIG_DIR;
		const originalHome = process.env.HOME;
		process.env.NANOCODER_CONFIG_DIR = configDir;
		process.env.HOME = dir;
		process.chdir(dir);

		try {
			await runWizard({
				"select:What would you like to do?": "active",
				"select:Select active provider:": "Ollama",
				"select:Select default model:": "Custom...",
				"input:Enter custom model ID:": "my-custom-model",
			});

			const written = JSON.parse(
				fs.readFileSync(configPathUnderHome(dir), "utf-8"),
			);
			t.is(written.model, "my-custom-model");
		} finally {
			if (originalDir === undefined) {
				delete process.env.NANOCODER_CONFIG_DIR;
			} else {
				process.env.NANOCODER_CONFIG_DIR = originalDir;
			}
			if (originalHome === undefined) {
				delete process.env.HOME;
			} else {
				process.env.HOME = originalHome;
			}
			process.chdir(originalCwd);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	},
);

test.serial(
	"runConfigWizard › '__back' at select_provider returns to the type selector",
	async (t) => {
		const { dir, cleanup } = setupTmpDir();
		try {
			// Array values are consumed FIFO across repeated calls: first pass
			// selects "cloud" then backs at the provider picker; second pass
			// backs at the type selector to exit.
			const answers: Record<string, unknown> = {
				"select:Select provider type:": ["cloud", "__back"],
				"select:Select a provider to configure:": "__back",
			};
			await runWizard(answers);
			// Nothing should be written since we backed out.
			const configPath = path.join(
				dir,
				".config",
				"nanoterm",
				"agents.config.json",
			);
			t.false(fs.existsSync(configPath));
		} finally {
			cleanup();
		}
	},
);

test.serial(
	"runConfigWizard › '__back' at select_provider during add-update returns to provider type",
	async (t) => {
		const { cleanup } = setupTmpDir();
		try {
			// First pass: local then back at provider; second pass: back at
			// the type selector (which exits the wizard).
			const answers: Record<string, unknown> = {
				"select:Select provider type:": ["local", "__back"],
				"select:Select a provider to configure:": "__back",
			};
			await runWizard(answers);
			t.pass("wizard handled __back chain");
		} finally {
			cleanup();
		}
	},
);

test.serial(
	"runConfigWizard › 'Custom...' model selection prompts for a custom model ID",
	async (t) => {
		const { dir, cleanup } = setupTmpDir();
		try {
			await runWizard({
				"select:Select provider type:": "local",
				"select:Select a provider to configure:": "ollama",
				"input:Enter Base URL (default: http://localhost:11434/v1): ":
					"http://localhost:11434/v1",
				"select:Select a model:": "Custom...",
				"input:Enter custom model ID:": "my-llama",
			});
			const written = JSON.parse(
				fs.readFileSync(configPathUnderHome(dir), "utf-8"),
			);
			t.is(written.model, "my-llama");
		} finally {
			cleanup();
		}
	},
);

test.serial(
	"runConfigWizard › local provider skips API key validation and writes an empty key",
	async (t) => {
		const { dir, cleanup } = setupTmpDir();
		try {
			await runWizard({
				"select:Select provider type:": "local",
				"select:Select a provider to configure:": "ollama",
				"input:Enter Base URL (default: http://localhost:11434/v1): ":
					"http://localhost:11434/v1",
				"select:Select a model:": "llama4",
			});
			const written = JSON.parse(
				fs.readFileSync(configPathUnderHome(dir), "utf-8"),
			);
			t.is(written.providers[0].apiKey, "");
		} finally {
			cleanup();
		}
	},
);

test.serial(
	"runConfigWizard › invalid JSON in existing config is ignored gracefully",
	async (t) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-wz-bad-"));
		const configDir = path.join(dir, ".config", "nanoterm");
		fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
		const configPath = path.join(configDir, "agents.config.json");
		fs.writeFileSync(configPath, "not valid json");
		const originalCwd = process.cwd();
		const originalDir = process.env.NANOCODER_CONFIG_DIR;
		const originalHome = process.env.HOME;
		process.env.NANOCODER_CONFIG_DIR = configDir;
		process.env.HOME = dir;
		process.chdir(dir);

		try {
			await runWizard({
				"select:Select provider type:": "local",
				"select:Select a provider to configure:": "ollama",
				"input:Enter Base URL (default: http://localhost:11434/v1): ":
					"http://localhost:11434/v1",
				"select:Select a model:": "llama4",
			});
			t.pass("wizard handled invalid JSON config");
		} finally {
			if (originalDir === undefined) {
				delete process.env.NANOCODER_CONFIG_DIR;
			} else {
				process.env.NANOCODER_CONFIG_DIR = originalDir;
			}
			if (originalHome === undefined) {
				delete process.env.HOME;
			} else {
				process.env.HOME = originalHome;
			}
			process.chdir(originalCwd);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	},
);

void 0;

test.serial(
	"runConfigWizard › '__back' from set_active_provider returns to action_select",
	async (t) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-wz-back-"));
		const configDir = path.join(dir, "config");
		fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
		fs.writeFileSync(
			path.join(configDir, "agents.config.json"),
			JSON.stringify({
				provider: "Ollama",
				model: "llama4",
				providers: [
					{
						name: "Ollama",
						baseUrl: "http://localhost:11434/v1",
						sdkProvider: "openai-compatible",
					},
				],
			}),
		);
		const originalCwd = process.cwd();
		const originalDir = process.env.NANOCODER_CONFIG_DIR;
		process.env.NANOCODER_CONFIG_DIR = configDir;
		process.chdir(dir);

		try {
			// First pass: Set Active Provider, then back at the provider
			// picker to return to action_select. Second pass: Update / Add
			// provider, then back through the type selector to exit.
			const answers: Record<string, unknown> = {
				"select:What would you like to do?": ["active", "update"],
				"select:Select active provider:": "__back",
				"select:Select provider type:": "__back",
			};
			await runWizard(answers);
			t.pass("wizard handled back navigation");
		} finally {
			if (originalDir === undefined) {
				delete process.env.NANOCODER_CONFIG_DIR;
			} else {
				process.env.NANOCODER_CONFIG_DIR = originalDir;
			}
			process.chdir(originalCwd);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	},
);

void 0;
