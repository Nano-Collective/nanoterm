import test from "ava";
import { scrubPrompt, rehydratePrompt } from "../src/privacy.js";

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
