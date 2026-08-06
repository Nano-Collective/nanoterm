import test from "ava";
import type { generateText } from "ai";
import { validateProviderCredentials } from "../src/setup.js";
import type { NanotermConfig } from "../src/config.js";

const config: NanotermConfig = {
	provider: "Ollama",
	model: "test-model",
	providers: [
		{
			name: "Ollama",
			baseUrl: "http://localhost:11434/v1",
			sdkProvider: "openai-compatible",
		},
	],
};

test("provider validation rejects HTTP 400 and 404 probe failures", async (t) => {
	for (const status of [400, 404]) {
		const probe = (() =>
			Promise.reject(
				new Error(`${status} request failed`),
			)) as typeof generateText;
		await t.throwsAsync(validateProviderCredentials(config, probe), {
			message: `${status} request failed`,
		});
	}
});
