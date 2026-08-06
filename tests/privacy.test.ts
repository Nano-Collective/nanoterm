import test from "ava";
import {
	scrubPrompt,
	rehydratePrompt,
	isLocalProvider,
} from "../src/privacy.js";
import type { NanotermConfig } from "../src/config.js";

test("scrubPrompt scrubs emails for cloud providers", (t) => {
	const text = "Contact alice@example.com for info.";
	const sessionMap = {};
	const scrubbed = scrubPrompt(text, "openai", sessionMap);
	t.true(scrubbed.includes("Email_1"));
	t.false(scrubbed.includes("alice@example.com"));
});

test("scrubPrompt bypasses scrubbing for local providers", (t) => {
	const text = "Contact alice@example.com for info.";
	const scrubbed = scrubPrompt(text, "ollama");
	t.true(scrubbed.includes("alice@example.com"));
	t.false(scrubbed.includes("Email_1"));
});

test("scrubPrompt and rehydratePrompt perform a full round trip", (t) => {
	const originalText = "Delete all files in /var/log/myapp older than 7 days";
	const sessionMap = {};

	const scrubbed = scrubPrompt(originalText, "openai", sessionMap);
	t.true(scrubbed.includes("Path_1"));
	t.false(scrubbed.includes("/var/log/myapp"));

	const rehydrated = rehydratePrompt(scrubbed, "openai", sessionMap);
	t.is(rehydrated, originalText);
});

test("isLocalProvider checks the parsed hostname instead of URL substrings", (t) => {
	const configFor = (baseUrl: string): NanotermConfig => ({
		provider: "Custom",
		model: "test",
		providers: [{ name: "Custom", baseUrl }],
	});

	t.true(isLocalProvider(configFor("http://localhost:8080/v1")));
	t.true(isLocalProvider(configFor("http://127.42.0.1:8080/v1")));
	t.true(isLocalProvider(configFor("http://[::1]:8080/v1")));
	t.false(isLocalProvider(configFor("https://localhost.evil.example/v1")));
	t.false(isLocalProvider(configFor("https://api.example/local/v1")));
	t.false(isLocalProvider("not-local-cloud"));
});

test("lookalike cloud hostnames still receive privacy scrubbing", (t) => {
	const config: NanotermConfig = {
		provider: "Custom",
		model: "test",
		providers: [
			{ name: "Custom", baseUrl: "https://localhost.evil.example/v1" },
		],
	};
	const scrubbed = scrubPrompt("Contact alice@example.com", config);
	t.false(scrubbed.includes("alice@example.com"));
});
