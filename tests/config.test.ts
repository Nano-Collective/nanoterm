import test from "ava";
import { resolveEnvVars, getPlatformConfigDir } from "../src/config.js";
import os from "node:os";
import path from "node:path";

test("resolveEnvVars › resolves existing env vars with $VAR syntax", (t) => {
	process.env.TEST_VAR_1 = "test_value_1";
	t.is(resolveEnvVars("$TEST_VAR_1"), "test_value_1");
	t.is(
		resolveEnvVars("Prefix $TEST_VAR_1 Suffix"),
		"Prefix test_value_1 Suffix",
	);
});

test("resolveEnvVars › resolves existing env vars with ${VAR} syntax", (t) => {
	process.env.TEST_VAR_2 = "test_value_2";
	t.is(resolveEnvVars("${TEST_VAR_2}"), "test_value_2");
	t.is(
		resolveEnvVars("Prefix ${TEST_VAR_2} Suffix"),
		"Prefix test_value_2 Suffix",
	);
});

test("resolveEnvVars › resolves env vars with default fallback ${VAR:-default}", (t) => {
	delete process.env.TEST_VAR_MISSING;
	t.is(resolveEnvVars("${TEST_VAR_MISSING:-default_value}"), "default_value");
});

test("resolveEnvVars › resolves missing env vars to empty string if no default", (t) => {
	delete process.env.TEST_VAR_MISSING;
	t.is(resolveEnvVars("$TEST_VAR_MISSING"), "");
	t.is(resolveEnvVars("${TEST_VAR_MISSING}"), "");
});

test("resolveEnvVars › returns undefined when input is undefined", (t) => {
	t.is(resolveEnvVars(undefined), undefined);
});

test("resolveEnvVars › handles multiple vars in same string", (t) => {
	process.env.VAR_A = "A";
	process.env.VAR_B = "B";
	t.is(resolveEnvVars("Values: $VAR_A and ${VAR_B}"), "Values: A and B");
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
