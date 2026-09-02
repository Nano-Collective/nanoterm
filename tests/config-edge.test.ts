import test from "ava";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function setupEmptyDir(): { dir: string; cleanup: () => void } {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-config-test-"));
	const originalCwd = process.cwd();
	const originalEnv = {
		NANOCODER_CONFIG_DIR: process.env.NANOCODER_CONFIG_DIR,
		NANOTERM_CONFIG_PATH: process.env.NANOTERM_CONFIG_PATH,
	};
	process.env.NANOCODER_CONFIG_DIR = dir;
	process.chdir(dir);
	// Point NANOCODER_CONFIG_DIR at an empty, non-existent-looking dir so the
	// user's local nanocoder config isn't picked up by the fallback path.
	process.env.NANOCODER_CONFIG_DIR = dir;
	delete process.env.NANOTERM_CONFIG_PATH;
	return {
		dir,
		cleanup: () => {
			process.chdir(originalCwd);
			if (originalEnv.NANOCODER_CONFIG_DIR === undefined) {
				delete process.env.NANOCODER_CONFIG_DIR;
			} else {
				process.env.NANOCODER_CONFIG_DIR = originalEnv.NANOCODER_CONFIG_DIR;
			}
			if (originalEnv.NANOTERM_CONFIG_PATH === undefined) {
				delete process.env.NANOTERM_CONFIG_PATH;
			} else {
				process.env.NANOTERM_CONFIG_PATH = originalEnv.NANOTERM_CONFIG_PATH;
			}
			fs.rmSync(dir, { recursive: true, force: true });
		},
	};
}

test.serial(
	"loadConfig › reads from NANOTERM_CONFIG_PATH when set",
	async (t) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-config-test-"));
		const configPath = path.join(dir, "custom.json");
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				provider: "CustomFromEnv",
				model: "env-model",
				providers: [
					{
						name: "CustomFromEnv",
						baseUrl: "http://example.com/v1",
						apiKey: "key",
					},
				],
			}),
		);

		const originalCwd = process.cwd();
		const originalPath = process.env.NANOTERM_CONFIG_PATH;
		const originalDir = process.env.NANOCODER_CONFIG_DIR;
		process.chdir(os.tmpdir());
		process.env.NANOTERM_CONFIG_PATH = configPath;
		delete process.env.NANOCODER_CONFIG_DIR;

		const { loadConfig } = await import("../src/config.js");
		try {
			const config = loadConfig();
			t.is(config.provider, "CustomFromEnv");
			t.is(config.model, "env-model");
		} finally {
			process.chdir(originalCwd);
			if (originalPath === undefined) {
				delete process.env.NANOTERM_CONFIG_PATH;
			} else {
				process.env.NANOTERM_CONFIG_PATH = originalPath;
			}
			if (originalDir === undefined) {
				delete process.env.NANOCODER_CONFIG_DIR;
			} else {
				process.env.NANOCODER_CONFIG_DIR = originalDir;
			}
			fs.rmSync(dir, { recursive: true, force: true });
		}
	},
);

test.serial(
	"loadConfig › resolves env vars inside provider baseUrl and apiKey",
	async (t) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-config-env-"));
		process.env.NANOTERM_TEST_BASE_URL = "http://envhost:9999/v1";
		process.env.NANOTERM_TEST_API_KEY = "secret-key";
		const configPath = path.join(dir, "agents.config.json");
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				provider: "EnvHost",
				model: "env-model",
				providers: [
					{
						name: "EnvHost",
						baseUrl: "$NANOTERM_TEST_BASE_URL",
						apiKey: "$NANOTERM_TEST_API_KEY",
					},
				],
			}),
		);

		const originalCwd = process.cwd();
		process.env.NANOCODER_CONFIG_DIR = dir;
		process.chdir(dir);

		const { loadConfig } = await import("../src/config.js");
		try {
			const config = loadConfig();
			t.is(config.providers[0].baseUrl, "http://envhost:9999/v1");
			t.is(config.providers[0].apiKey, "secret-key");
		} finally {
			process.chdir(originalCwd);
			delete process.env.NANOTERM_TEST_BASE_URL;
			delete process.env.NANOTERM_TEST_API_KEY;
			fs.rmSync(dir, { recursive: true, force: true });
		}
	},
);

test.serial(
	"loadConfig › falls back to default provider/model when no config file found",
	async (t) => {
		const { cleanup } = setupEmptyDir();
		const { loadConfig } = await import("../src/config.js");
		try {
			const config = loadConfig();
			t.is(config.provider, "openai");
			t.is(config.model, "gpt-4o");
			t.deepEqual(config.providers, []);
		} finally {
			cleanup();
		}
	},
);

test.serial(
	"loadConfig › falls back to gpt-4o when providers exist without models",
	async (t) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-config-fb-"));
		const configPath = path.join(dir, "agents.config.json");
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				providers: [
					{
						name: "NoModelsProvider",
						baseUrl: "http://example.com/v1",
					},
				],
			}),
		);
		const originalCwd = process.cwd();
		process.env.NANOCODER_CONFIG_DIR = dir;
		process.chdir(dir);

		const { loadConfig } = await import("../src/config.js");
		try {
			const config = loadConfig();
			t.is(config.provider, "NoModelsProvider");
			t.is(config.model, "gpt-4o");
		} finally {
			process.chdir(originalCwd);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	},
);

test.serial(
	"loadConfig › falls back to nanocoder nested modeProviders when no top-level provider",
	async (t) => {
		const dir = fs.mkdtempSync(
			path.join(os.tmpdir(), "nanoterm-config-nested-"),
		);
		const configPath = path.join(dir, "agents.config.json");
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				nanocoder: {
					modeProviders: {
						normal: {
							provider: "NestedProvider",
							model: "nested-model",
						},
					},
				},
				providers: [],
			}),
		);
		const originalCwd = process.cwd();
		const originalDir = process.env.NANOCODER_CONFIG_DIR;
		process.env.NANOCODER_CONFIG_DIR = dir;
		process.chdir(dir);

		const { loadConfig } = await import("../src/config.js");
		try {
			const config = loadConfig();
			t.is(config.provider, "NestedProvider");
			t.is(config.model, "nested-model");
		} finally {
			process.chdir(originalCwd);
			if (originalDir === undefined) {
				delete process.env.NANOCODER_CONFIG_DIR;
			} else {
				process.env.NANOCODER_CONFIG_DIR = originalDir;
			}
			fs.rmSync(dir, { recursive: true, force: true });
		}
	},
);

test.serial(
	"loadConfig › warns and skips invalid JSON in a config file",
	async (t) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-config-bad-"));
		const configPath = path.join(dir, "agents.config.json");
		fs.writeFileSync(configPath, "this is not json");
		const originalCwd = process.cwd();
		process.env.NANOCODER_CONFIG_DIR = dir;
		process.chdir(dir);

		const warnings: string[] = [];
		const originalWarn = console.warn;
		console.warn = (...args: unknown[]) => {
			warnings.push(args.join(" "));
		};

		const { loadConfig } = await import("../src/config.js");
		try {
			const config = loadConfig();
			t.is(config.provider, "openai");
			t.true(warnings.length > 0, "expected a warning to be logged");
			t.true(
				warnings.some((w) => w.includes("Failed to parse config")),
				"expected the warning to mention 'Failed to parse config'",
			);
		} finally {
			console.warn = originalWarn;
			process.chdir(originalCwd);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	},
);

test.serial(
	"loadConfig › resolves env vars in provider and model fields",
	async (t) => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nanoterm-config-pm-"));
		process.env.NANOTERM_TEST_PROVIDER = "EnvProviderName";
		process.env.NANOTERM_TEST_MODEL = "env-model-id";
		const configPath = path.join(dir, "agents.config.json");
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				provider: "$NANOTERM_TEST_PROVIDER",
				model: "$NANOTERM_TEST_MODEL",
				providers: [],
			}),
		);
		const originalCwd = process.cwd();
		process.env.NANOCODER_CONFIG_DIR = dir;
		process.chdir(dir);

		const { loadConfig } = await import("../src/config.js");
		try {
			const config = loadConfig();
			t.is(config.provider, "EnvProviderName");
			t.is(config.model, "env-model-id");
		} finally {
			process.chdir(originalCwd);
			delete process.env.NANOTERM_TEST_PROVIDER;
			delete process.env.NANOTERM_TEST_MODEL;
			fs.rmSync(dir, { recursive: true, force: true });
		}
	},
);
