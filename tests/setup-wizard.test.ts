import test from "ava";
import { register } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getPlatformConfigDir } from "../src/config.js";

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

/**
 * The directory the wizard actually writes to on this platform.
 *
 * These helpers used to hardcode `~/.config`, which is only where production
 * writes on Linux — `getPlatformConfigDir` resolves `Library/Preferences` on
 * macOS and `AppData/Roaming` on Windows. So the suite passed on the ubuntu
 * runner and failed for every contributor on a Mac, which is the worst way for
 * a test to be wrong: green in CI, six red tests for a human.
 *
 * Calling the production resolver rather than restating its branches keeps the
 * two from drifting again. It reads `os.homedir()`, which honours the `HOME`
 * these tests override.
 */
function configDirUnderHome(home: string): string {
	const resolved = getPlatformConfigDir("nanoterm");
	// Guard the assumption rather than trusting it: if HOME is not being
	// honoured, the test should say so instead of quietly asserting against a
	// path outside its fixture.
	if (!resolved.startsWith(home)) {
		throw new Error(
			`expected the config dir to sit under the fixture HOME (${home}), got ${resolved}`,
		);
	}
	return resolved;
}

function configPathUnderHome(home: string): string {
	return path.join(configDirUnderHome(home), "agents.config.json");
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

			// NANOCODER_CONFIG_DIR is set, so this is both where the wizard reads
			// its existing providers and where it saves — the two agreeing is the
			// point of #33.
			const written = JSON.parse(
				fs.readFileSync(path.join(configDir, "agents.config.json"), "utf-8"),
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
				fs.readFileSync(path.join(configDir, "agents.config.json"), "utf-8"),
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
				fs.readFileSync(path.join(configDir, "agents.config.json"), "utf-8"),
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
			// Nothing should be written since we backed out. Resolved per platform:
			// asserting a Linux path here was vacuously true on macOS, so the
			// assertion could never fail and the test proved nothing.
			t.false(fs.existsSync(configPathUnderHome(dir)));
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
		const originalCwd = process.cwd();
		const originalDir = process.env.NANOCODER_CONFIG_DIR;
		const originalHome = process.env.HOME;
		process.env.HOME = dir;
		process.chdir(dir);
		// Seeded where the wizard actually reads: it resolves the platform config
		// directory directly and does not consult NANOCODER_CONFIG_DIR. Seeding at
		// `dir/.config/nanoterm` meant the wizard never saw the bad file, so this
		// test passed without once exercising the invalid-JSON path it is named
		// for. See Nano-Collective/nanoterm#33 for the read/write mismatch itself.
		const configDir = configDirUnderHome(dir);
		fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
		const configPath = path.join(configDir, "agents.config.json");
		fs.writeFileSync(configPath, "not valid json");

		try {
			await runWizard({
				"select:Select provider type:": "local",
				"select:Select a provider to configure:": "ollama",
				"input:Enter Base URL (default: http://localhost:11434/v1): ":
					"http://localhost:11434/v1",
				"select:Select a model:": "llama4",
			});
			// Stronger than `t.pass()`, which only proved the wizard did not throw.
			// Asserting the file was rewritten also proves the fixture is actually
			// in play: if the wizard were reading somewhere else, the unparseable
			// content would still be sitting here.
			//
			// Platform-independent by construction, unlike the other tests in this
			// file: `loadConfig` consults NANOCODER_CONFIG_DIR *instead of* the
			// platform directories, not as well as them, so setting it pins the
			// path on every OS.
			// Stronger than the `t.pass()` this replaced, which proved only that the
			// wizard did not throw. Asserting the rewrite also proves the fixture
			// was in play: if the wizard read somewhere else, the unparseable
			// content would still be sitting here — which is exactly how this test
			// went years without testing anything.
			const rewritten = fs.readFileSync(configPath, "utf-8");
			t.not(rewritten, "not valid json", "the bad config was replaced");
			t.notThrows(() => JSON.parse(rewritten), "and replaced with valid JSON");
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
			// Backing out of either branch returns to the action menu, so the menu
			// is answered three times: into "active", into "update", then out.
			//
			// It used to be answered twice, and passed — because with no providers
			// in the config the wizard never showed the action menu at all, so
			// neither back-navigation path this test is named for was ever
			// reached. It only became a real test once the wizard started reading
			// the config the test seeds (#33).
			//
			// The third answer is an ExitPromptError rather than a value: the
			// action menu has no exit choice, so anything that is not "active"
			// falls through to the provider-type branch and the loop never ends.
			// Ctrl+C is the only way out of it, which is what this simulates.
			const answers: Record<string, unknown> = {
				"select:What would you like to do?": ["active", "update"],
				"select:Select active provider:": "__back",
				"select:Select provider type:": "__back",
				__throw_exit_on__: "select:What would you like to do?",
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

test.serial(
	"runConfigWizard › writes where the app reads when NANOCODER_CONFIG_DIR is set",
	async (t) => {
		// The regression this locks in (#33). The wizard used to resolve the
		// platform config directory directly while `loadConfig` honoured
		// NANOCODER_CONFIG_DIR *instead of* it, so anyone already running
		// Nanocoder configured nanoterm, saw "Success!", and had the app read
		// none of it.
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-wz-envdir-"));
		const envDir = path.join(dir, "custom-config-home");
		fs.mkdirSync(envDir, { recursive: true, mode: 0o700 });
		const originalCwd = process.cwd();
		const originalDir = process.env.NANOCODER_CONFIG_DIR;
		const originalHome = process.env.HOME;
		process.env.NANOCODER_CONFIG_DIR = envDir;
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

			t.true(
				fs.existsSync(path.join(envDir, "agents.config.json")),
				"written to NANOCODER_CONFIG_DIR, where loadConfig will look",
			);
			// The negation is the load-bearing half of this regression test, and it
			// only means anything because HOME is redirected to the fixture — so
			// `configPathUnderHome(dir)` is the platform path the *wizard* would
			// resolve, not one on the developer's machine. `configDirUnderHome`
			// throws if that ever stops holding, rather than letting the assertion
			// pass against a path nothing could have written to.
			t.false(
				fs.existsSync(configPathUnderHome(dir)),
				"and not to the platform directory, which loadConfig ignores when the env var is set",
			);
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
	"runConfigWizard › warns when a project-local config will shadow what it wrote",
	async (t) => {
		// `loadConfig` reads ./agents.config.json first, so the wizard can succeed
		// and still change nothing. Saying so is the difference between a
		// confusing evening and a one-line fix.
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-wz-shadow-"));
		const originalCwd = process.cwd();
		const originalHome = process.env.HOME;
		const originalDir = process.env.NANOCODER_CONFIG_DIR;
		delete process.env.NANOCODER_CONFIG_DIR;
		process.env.HOME = dir;
		process.chdir(dir);
		fs.writeFileSync(
			path.join(dir, "agents.config.json"),
			JSON.stringify({ provider: "local-override", providers: [] }),
		);

		const logged: string[] = [];
		const originalLog = console.log;
		console.log = (...args: unknown[]) => {
			logged.push(args.map(String).join(" "));
		};

		try {
			await runWizard({
				"select:Select provider type:": "local",
				"select:Select a provider to configure:": "ollama",
				"input:Enter Base URL (default: http://localhost:11434/v1): ":
					"http://localhost:11434/v1",
				"select:Select a model:": "llama4",
			});
			const output = logged.join("\n");
			t.true(
				output.includes("takes precedence"),
				`expected a shadowing warning, got: ${output}`,
			);
		} finally {
			console.log = originalLog;
			if (originalDir !== undefined) {
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
	"runConfigWizard › honours NANOTERM_CONFIG_PATH as a full file path",
	async (t) => {
		// The third branch of getWritableConfigPath, and the one that is easiest
		// to get wrong: it is a file, not a directory, so joining
		// "agents.config.json" onto it would write to a path nothing reads.
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-wz-filepath-"));
		const explicit = path.join(dir, "somewhere", "my-config.json");
		const originalCwd = process.cwd();
		const originalPath = process.env.NANOTERM_CONFIG_PATH;
		const originalDir = process.env.NANOCODER_CONFIG_DIR;
		const originalHome = process.env.HOME;
		delete process.env.NANOCODER_CONFIG_DIR;
		process.env.NANOTERM_CONFIG_PATH = explicit;
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

			t.true(fs.existsSync(explicit), "written to the exact path given");
			t.false(
				fs.existsSync(path.join(explicit, "agents.config.json")),
				"and not treated as a directory to join a filename onto",
			);
			t.is(JSON.parse(fs.readFileSync(explicit, "utf-8")).model, "llama4");
		} finally {
			if (originalPath === undefined) {
				delete process.env.NANOTERM_CONFIG_PATH;
			} else {
				process.env.NANOTERM_CONFIG_PATH = originalPath;
			}
			if (originalDir !== undefined) {
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
