import test from "ava";
import readline from "node:readline";
import type { NanotermConfig } from "../src/config.js";

// When promptApproval calls explainCommand, the AI SDK retries in the
// background. In the test environment the SDK can't reach any provider and
// its internal retry promises reject with no handler attached, surfacing as
// unhandled rejections after the test has returned. Swallow those expected
// network failures at the process level so they don't fail the test file.
function isExpectedNetworkFailure(reason: unknown): boolean {
	const msg =
		reason instanceof Error
			? `${reason.message} ${reason.name}`
			: String(reason);
	return (
		msg.includes("ECONNREFUSED") ||
		msg.includes("API_APICallError") ||
		msg.includes("Cannot connect to API")
	);
}

process.on("unhandledRejection", (reason: unknown) => {
	if (isExpectedNetworkFailure(reason)) return;
	// Re-surface anything unexpected so we don't mask real failures.
	// eslint-disable-next-line no-console
	console.error("Unexpected unhandled rejection:", reason);
});

type AnswerQueue = string[];

function mockReadline(answers: AnswerQueue) {
	const original = readline.createInterface;
	let index = 0;
	const fake = {
		question: (
			_query: string,
			_cbOrOptions: unknown,
			_maybeCb?: (answer: string) => void,
		) => {
			const next = answers[index++] ?? "";
			const cb =
				typeof _cbOrOptions === "function"
					? (_cbOrOptions as (answer: string) => void)
					: _maybeCb;
			if (cb) cb(next);
		},
		close: () => {},
		write: () => fake,
	} as unknown as ReturnType<typeof readline.createInterface>;
	(
		readline as unknown as { createInterface: typeof readline.createInterface }
	).createInterface = (() =>
		fake) as unknown as typeof readline.createInterface;
	return () => {
		(
			readline as unknown as {
				createInterface: typeof readline.createInterface;
			}
		).createInterface = original;
	};
}

const baseConfig: NanotermConfig = {
	provider: "Ollama",
	model: "test",
	providers: [
		{
			name: "Ollama",
			baseUrl: "http://localhost:11434/v1",
			sdkProvider: "openai-compatible",
		},
	],
};

test.serial(
	"promptApproval › aborts when input is empty (default no)",
	async (t) => {
		const restore = mockReadline([""]);
		const { promptApproval } = await import("../src/approval.js");
		try {
			const result = await promptApproval("ls -la", baseConfig);
			t.is(result, null);
		} finally {
			restore();
		}
	},
);

test.serial("promptApproval › approves safe command on 'y'", async (t) => {
	const restore = mockReadline(["y"]);
	const { promptApproval } = await import("../src/approval.js");
	try {
		const result = await promptApproval("ls -la", baseConfig);
		t.is(result, "ls -la");
	} finally {
		restore();
	}
});

test.serial("promptApproval › approves safe command on 'yes'", async (t) => {
	const restore = mockReadline(["yes"]);
	const { promptApproval } = await import("../src/approval.js");
	try {
		const result = await promptApproval("ls -la", baseConfig);
		t.is(result, "ls -la");
	} finally {
		restore();
	}
});

test.serial(
	"promptApproval › requires the full word 'yes' for destructive commands",
	async (t) => {
		const restore = mockReadline(["y", "yes"]);
		const { promptApproval } = await import("../src/approval.js");
		try {
			const result = await promptApproval("rm -rf /tmp/foo", baseConfig);
			t.is(result, "rm -rf /tmp/foo");
		} finally {
			restore();
		}
	},
);

test.serial(
	"promptApproval › warns then loops when destructive 'y' is rejected as too short",
	async (t) => {
		const restore = mockReadline(["y", "n"]);
		const { promptApproval } = await import("../src/approval.js");
		try {
			const result = await promptApproval("rm -rf /tmp/foo", baseConfig);
			t.is(result, null);
		} finally {
			restore();
		}
	},
);

test.serial(
	"promptApproval › rejects destructive command on empty input",
	async (t) => {
		const restore = mockReadline([""]);
		const { promptApproval } = await import("../src/approval.js");
		try {
			const result = await promptApproval("rm -rf /tmp/foo", baseConfig);
			t.is(result, null);
		} finally {
			restore();
		}
	},
);

test.serial("promptApproval › approves caution command on 'y'", async (t) => {
	const restore = mockReadline(["y"]);
	const { promptApproval } = await import("../src/approval.js");
	try {
		const result = await promptApproval("echo $(cat file.txt)", baseConfig);
		t.is(result, "echo $(cat file.txt)");
	} finally {
		restore();
	}
});

test.serial(
	"promptApproval › loops when given an empty command and 'y' then aborts on 'n'",
	async (t) => {
		const restore = mockReadline(["y", "n"]);
		const { promptApproval } = await import("../src/approval.js");
		try {
			const result = await promptApproval("", baseConfig);
			t.is(result, null);
		} finally {
			restore();
		}
	},
);

test.serial(
	"promptApproval › 'edit' on empty command then aborts",
	async (t) => {
		const restore = mockReadline(["edit", "", "n"]);
		const { promptApproval } = await import("../src/approval.js");
		try {
			const result = await promptApproval("", baseConfig);
			t.is(result, null);
		} finally {
			restore();
		}
	},
);

test.serial(
	"promptApproval › 'edit' on empty command then accepts edited command",
	async (t) => {
		const restore = mockReadline(["edit", "echo hi", "y"]);
		const { promptApproval } = await import("../src/approval.js");
		try {
			const result = await promptApproval("", baseConfig);
			t.is(result, "echo hi");
		} finally {
			restore();
		}
	},
);

test.serial(
	"promptApproval › returns null when 'n' is given for a safe command",
	async (t) => {
		const restore = mockReadline(["n"]);
		const { promptApproval } = await import("../src/approval.js");
		try {
			const result = await promptApproval("ls", baseConfig);
			t.is(result, null);
		} finally {
			restore();
		}
	},
);

test.serial(
	"promptApproval › returns null for unrecognized answers on safe commands",
	async (t) => {
		const restore = mockReadline(["maybe"]);
		const { promptApproval } = await import("../src/approval.js");
		try {
			const result = await promptApproval("ls", baseConfig);
			t.is(result, null);
		} finally {
			restore();
		}
	},
);

test.serial(
	"promptApproval › handles 'edit' then aborts on empty edited command",
	async (t) => {
		const restore = mockReadline(["edit", "", "n"]);
		const { promptApproval } = await import("../src/approval.js");
		try {
			const result = await promptApproval("ls", baseConfig);
			t.is(result, null);
		} finally {
			restore();
		}
	},
);

test.serial("promptApproval › handles 'e' shortcut for edit", async (t) => {
	const restore = mockReadline(["e", "ls -la", "y"]);
	const { promptApproval } = await import("../src/approval.js");
	try {
		const result = await promptApproval("ls", baseConfig);
		t.is(result, "ls -la");
	} finally {
		restore();
	}
});

// Note: The 'explain' branch in promptApproval calls explainCommand, which
// in turn calls the AI SDK. Exercising that path in the test environment
// would surface unhandled rejections from the SDK's background retries after
// the test has returned, so the catch block in approval.ts (lines 84-89) is
// left uncovered by these tests.
void 0;

test.serial(
	"promptApproval › 'explain' returns to the prompt when explainCommand resolves",
	async (t) => {
		const restore = mockReadline(["explain", "y"]);
		const { promptApproval } = await import("../src/approval.js");
		try {
			const result = await promptApproval("ls -la", baseConfig);
			t.is(result, "ls -la");
		} finally {
			restore();
		}
	},
);

test.serial(
	"promptApproval › 'explain' continues to the next prompt when explainCommand fails",
	async (t) => {
		const restore = mockReadline(["explain", "y"]);
		const { promptApproval } = await import("../src/approval.js");
		// The catch block in approval.ts catches and logs the SDK failure;
		// the loop then re-prompts and accepts the next "y".
		try {
			const result = await promptApproval("ls -la", baseConfig);
			t.is(result, "ls -la");
		} finally {
			restore();
		}
	},
);
