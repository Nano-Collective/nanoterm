import test from "ava";
import { scrubPrompt } from "../src/privacy.js";

test("scrubPrompt scrubs emails for cloud providers", (t) => {
	const text = "Contact alice@example.com for info.";
	const scrubbed = scrubPrompt(text, "openai");
	t.true(scrubbed.includes("Email_1"));
	t.false(scrubbed.includes("alice@example.com"));
});

test("scrubPrompt bypasses scrubbing for local providers", (t) => {
	const text = "Contact alice@example.com for info.";
	const scrubbed = scrubPrompt(text, "ollama");
	t.true(scrubbed.includes("alice@example.com"));
	t.false(scrubbed.includes("Email_1"));
});
