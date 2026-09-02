import test from "ava";
import {
	resolveEnvVars,
	getPlatformConfigDir,
	writeConfigFile,
	loadConfig,
} from "../src/config.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DOLLAR = "$";

test("resolveEnvVars › resolves existing env vars with $VAR syntax", (t) => {
	process.env.TEST_VAR_1 = "test_value_1";
	t.is(resolveEnvVars(`${DOLLAR}TEST_VAR_1`), "test_value_1");
	t.is(
		resolveEnvVars(`Prefix ${DOLLAR}TEST_VAR_1 Suffix`),
		"Prefix test_value_1 Suffix",
	);
});

test("resolveEnvVars › resolves existing env vars with dollar-brace syntax", (t) => {
	process.env.TEST_VAR_2 = "test_value_2";
	t.is(resolveEnvVars(`${DOLLAR}{TEST_VAR_2}`), "test_value_2");
	t.is(
		resolveEnvVars(`Prefix ${DOLLAR}{TEST_VAR_2} Suffix`),
		"Prefix test_value_2 Suffix",
	);
});

test("resolveEnvVars › resolves env vars with default fallback syntax", (t) => {
	delete process.env.TEST_VAR_MISSING;
	t.is(
		resolveEnvVars(`${DOLLAR}{TEST_VAR_MISSING:-default_value}`),
		"default_value",
	);
});

test("resolveEnvVars › resolves missing env vars to empty string if no default", (t) => {
	delete process.env.TEST_VAR_MISSING;
	t.is(resolveEnvVars(`${DOLLAR}TEST_VAR_MISSING`), "");
	t.is(resolveEnvVars(`${DOLLAR}{TEST_VAR_MISSING}`), "");
});

test("resolveEnvVars › returns undefined when input is undefined", (t) => {
	t.is(resolveEnvVars(undefined), undefined);
});

test("resolveEnvVars › handles multiple vars in same string", (t) => {
	process.env.VAR_A = "A";
	process.env.VAR_B = "B";
	t.is(
		resolveEnvVars(`Values: ${DOLLAR}VAR_A and ${DOLLAR}{VAR_B}`),
		"Values: A and B",
	);
});

test.serial(
	"getPlatformConfigDir › generates correct paths based on platform",
	(t) => {
		const originalPlatform = process.platform;

		Object.defineProperty(process, "platform", { value: "darwin" });
		t.is(
			getPlatformConfigDir("testapp"),
			path.join(os.homedir(), "Library", "Preferences", "testapp"),
		);

		Object.defineProperty(process, "platform", { value: "linux" });
		t.is(
			getPlatformConfigDir("testapp"),
			path.join(os.homedir(), ".config", "testapp"),
		);

		Object.defineProperty(process, "platform", { value: "win32" });
		const appData =
			process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
		t.is(getPlatformConfigDir("testapp"), path.join(appData, "testapp"));

		// Restore original platform
		Object.defineProperty(process, "platform", { value: originalPlatform });
	},
);

test("writeConfigFile enforces owner-only permissions for new and existing files", (t) => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), "nanoterm-config-test-"),
	);
	const configPath = path.join(directory, "agents.config.json");
	fs.writeFileSync(configPath, "{}", { mode: 0o644 });

	writeConfigFile(configPath, { provider: "openai", model: "gpt-test" });

	t.is(fs.statSync(directory).mode & 0o777, 0o700);
	t.is(fs.statSync(configPath).mode & 0o777, 0o600);
	t.deepEqual(JSON.parse(fs.readFileSync(configPath, "utf-8")), {
		provider: "openai",
		model: "gpt-test",
	});
	fs.rmSync(directory, { recursive: true });
});

test.serial(
	"loadConfig › project-level agents.config.json takes precedence over platform config",
	(t) => {
		const projectDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "nanoterm-project-"),
		);
		const platformDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "nanoterm-platform-"),
		);

		const projectConfig = {
			provider: "ProjectProvider",
			model: "project-model-1",
			providers: [
				{
					name: "ProjectProvider",
					baseUrl: "http://localhost:9999/v1",
					models: ["project-model-1"],
				},
			],
		};

		const platformConfig = {
			provider: "PlatformProvider",
			model: "platform-model-1",
			providers: [
				{
					name: "PlatformProvider",
					baseUrl: "http://localhost:8888/v1",
					models: ["platform-model-1"],
				},
			],
		};

		fs.writeFileSync(
			path.join(projectDir, "agents.config.json"),
			JSON.stringify(projectConfig),
		);
		fs.writeFileSync(
			path.join(platformDir, "agents.config.json"),
			JSON.stringify(platformConfig),
		);

		// Save originals
		const originalCwd = process.cwd();
		const originalEnv = { ...process.env };

		// Point cwd to project dir, NANOCODER_CONFIG_DIR to platform dir
		process.chdir(projectDir);
		process.env.NANOCODER_CONFIG_DIR = platformDir;
		delete process.env.NANOTERM_CONFIG_PATH;

		try {
			const config = loadConfig();
			t.is(config.provider, "ProjectProvider");
			t.is(config.model, "project-model-1");
		} finally {
			process.chdir(originalCwd);
			process.env.NANOCODER_CONFIG_DIR = originalEnv.NANOCODER_CONFIG_DIR;
			process.env.NANOTERM_CONFIG_PATH = originalEnv.NANOTERM_CONFIG_PATH;
			fs.rmSync(projectDir, { recursive: true });
			fs.rmSync(platformDir, { recursive: true });
		}
	},
);
