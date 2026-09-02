import test from "ava";
import { sanitizeCommand } from "../src/generate.js";
import type { NanotermConfig } from "../src/config.js";

function withMockedFetch(
	handler: (url: string, init?: RequestInit) => Promise<Response> | Response,
	callback: () => Promise<void>,
): Promise<void> {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async (
		input: string | URL | Request,
		init?: RequestInit,
	) => {
		const url = typeof input === "string" ? input : input.toString();
		return handler(url, init);
	}) as typeof fetch;
	return Promise.resolve(callback()).finally(() => {
		globalThis.fetch = originalFetch;
	});
}

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function ollamaChatResponse(content: string): unknown {
	return {
		id: "chatcmpl-1",
		object: "chat.completion",
		created: Date.now(),
		model: "llama3",
		choices: [
			{
				index: 0,
				message: { role: "assistant", content },
				finish_reason: "stop",
			},
		],
		usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
	};
}

function ollamaModelsResponse(): unknown {
	return { object: "list", data: [{ id: "llama3", object: "model" }] };
}

const baseConfig: NanotermConfig = {
	provider: "Ollama",
	model: "llama3",
	providers: [
		{
			name: "Ollama",
			baseUrl: "http://localhost:11434/v1",
			apiKey: "",
			sdkProvider: "openai-compatible",
		},
	],
};

test.serial(
	"generateCommand › calls the AI SDK and returns a sanitized command",
	async (t) => {
		await withMockedFetch(
			async (url) => {
				if (url.endsWith("/chat/completions")) {
					return jsonResponse(ollamaChatResponse("ls -la"));
				}
				if (url.endsWith("/models")) {
					return jsonResponse(ollamaModelsResponse());
				}
				return jsonResponse({ error: "not found" }, 404);
			},
			async () => {
				const { generateCommand } = await import("../src/generate.js");
				const result = await generateCommand("list files", baseConfig);
				t.is(result, "ls -la");
			},
		);
	},
);

test.serial(
	"generateCommand › strips markdown fences around the AI response",
	async (t) => {
		await withMockedFetch(
			async (url) => {
				if (url.endsWith("/chat/completions")) {
					return jsonResponse(ollamaChatResponse("```bash\necho hi\n```"));
				}
				return jsonResponse(ollamaModelsResponse());
			},
			async () => {
				const { generateCommand } = await import("../src/generate.js");
				const result = await generateCommand("say hi", baseConfig);
				t.is(result, "echo hi");
			},
		);
	},
);

test.serial(
	"generateCommand › returns an empty string when the model returns nothing",
	async (t) => {
		await withMockedFetch(
			async (url) => {
				if (url.endsWith("/chat/completions")) {
					return jsonResponse(ollamaChatResponse(""));
				}
				return jsonResponse(ollamaModelsResponse());
			},
			async () => {
				const { generateCommand } = await import("../src/generate.js");
				const result = await generateCommand("do something", baseConfig);
				t.is(result, "");
			},
		);
	},
);

test.serial(
	"explainCommand › returns the explanation text from the model",
	async (t) => {
		await withMockedFetch(
			async (url) => {
				if (url.endsWith("/chat/completions")) {
					return jsonResponse(
						ollamaChatResponse("Lists files in the current directory."),
					);
				}
				return jsonResponse(ollamaModelsResponse());
			},
			async () => {
				const { explainCommand } = await import("../src/generate.js");
				const result = await explainCommand("ls", baseConfig);
				t.true(result.includes("Lists files"));
			},
		);
	},
);

test("sanitizeCommand › strips full markdown blocks", (t) => {
	const raw = "```bash\nls -la\n```";
	t.is(sanitizeCommand(raw), "ls -la");
});

test("sanitizeCommand › strips incomplete markdown blocks", (t) => {
	const raw = "```\nls -la\n";
	t.is(sanitizeCommand(raw), "ls -la");
});

test("sanitizeCommand › strips leading prompt characters", (t) => {
	const raw = "$ find . -name '*.png'";
	t.is(sanitizeCommand(raw), "find . -name '*.png'");
});

test("sanitizeCommand › strips markdown blocks containing shell prompts", (t) => {
	const raw = "```bash\n$ npm run test\n```";
	t.is(sanitizeCommand(raw), "npm run test");
});

test("sanitizeCommand › handles text surrounding markdown blocks", (t) => {
	const raw = "Here is your command:\n```bash\ngit status\n```\nEnjoy!";
	t.is(sanitizeCommand(raw), "git status");
});

test("sanitizeCommand › leaves normal commands untouched", (t) => {
	const raw = "docker build -t my-app .";
	t.is(sanitizeCommand(raw), "docker build -t my-app .");
});

test("sanitizeCommand › trims whitespace from normal commands", (t) => {
	const raw = "   \n  echo hello \n  ";
	t.is(sanitizeCommand(raw), "echo hello");
});
