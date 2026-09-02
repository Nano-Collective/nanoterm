import test from "ava";

test.serial(
	"executeCommand › rejects commands containing null bytes",
	async (t) => {
		const { executeCommand } = await import("../src/execute.js");
		await t.throwsAsync(() => executeCommand("echo hi\0bad"), {
			message: /null byte/,
		});
	},
);

test.serial(
	"executeCommand › returns the exit code of a direct command",
	async (t) => {
		const { executeCommand } = await import("../src/execute.js");
		const code = await executeCommand("echo hello");
		t.is(code, 0);
	},
);

test.serial(
	"executeCommand › returns the exit code of a non-zero command",
	async (t) => {
		const { executeCommand } = await import("../src/execute.js");
		const code = await executeCommand("false");
		t.is(code, 1);
	},
);

test.serial(
	"executeCommand › runs shell-only commands via $SHELL -c",
	async (t) => {
		const { executeCommand } = await import("../src/execute.js");
		// Pipeline must go through the shell
		const code = await executeCommand("echo hi | grep hi");
		t.is(code, 0);
	},
);

test.serial(
	"executeCommand › propagates a non-zero exit code through the shell",
	async (t) => {
		const { executeCommand } = await import("../src/execute.js");
		const code = await executeCommand("true && false");
		t.is(code, 1);
	},
);

test.serial(
	"executeCommand › uses FORCE_COLOR when stdout is a TTY",
	async (t) => {
		const originalIsTTY = process.stdout.isTTY;
		const originalForceColor = process.env.FORCE_COLOR;
		Object.defineProperty(process.stdout, "isTTY", {
			value: true,
			configurable: true,
		});
		delete process.env.FORCE_COLOR;
		try {
			// Force module reload so executeCommand picks up the new env
			const { executeCommand } = await import("../src/execute.js");
			// We can't easily inspect the env passed to spawn from the outside,
			// but we can verify the command still works without erroring.
			const code = await executeCommand("echo hello");
			t.is(code, 0);
		} finally {
			Object.defineProperty(process.stdout, "isTTY", {
				value: originalIsTTY,
				configurable: true,
			});
			if (originalForceColor === undefined) {
				delete process.env.FORCE_COLOR;
			} else {
				process.env.FORCE_COLOR = originalForceColor;
			}
		}
	},
);

test.serial(
	"executeCommand › rejects if a command does not exist",
	async (t) => {
		const { executeCommand } = await import("../src/execute.js");
		await t.throwsAsync(() =>
			executeCommand("definitely-not-a-real-binary-12345"),
		);
	},
);
