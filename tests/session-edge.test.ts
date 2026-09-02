import test from "ava";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	saveSessionContext,
	loadSessionContext,
	appendOutputTail,
	MAX_OUTPUT_LENGTH,
} from "../src/session.js";

test.serial(
	"loadSessionContext › returns null and unlinks the file when JSON parsing fails",
	async (t) => {
		const sessionFilePath = path.join(
			os.homedir(),
			".nanoterm",
			"sessions",
			`nanoterm-session-${process.ppid}.json`,
		);
		fs.writeFileSync(sessionFilePath, "not valid json", { encoding: "utf-8" });

		try {
			const loaded = loadSessionContext();
			t.is(loaded, null, "expected null for malformed session");
		} finally {
			if (fs.existsSync(sessionFilePath)) {
				fs.unlinkSync(sessionFilePath);
			}
		}
	},
);

test.serial(
	"loadSessionContext › returns the parsed session when within the freshness window",
	async (t) => {
		const sessionFilePath = path.join(
			os.homedir(),
			".nanoterm",
			"sessions",
			`nanoterm-session-${process.ppid}.json`,
		);
		const fresh = {
			lastCommand: "ls",
			stdout: "out",
			stderr: "",
			timestamp: Date.now(),
		};
		fs.writeFileSync(sessionFilePath, JSON.stringify(fresh), {
			encoding: "utf-8",
		});

		try {
			const loaded = loadSessionContext();
			t.truthy(loaded);
			t.is(loaded?.lastCommand, "ls");
		} finally {
			if (fs.existsSync(sessionFilePath)) {
				fs.unlinkSync(sessionFilePath);
			}
		}
	},
);

test.serial(
	"loadSessionContext › returns null when session has no timestamp (legacy)",
	async (t) => {
		const sessionFilePath = path.join(
			os.homedir(),
			".nanoterm",
			"sessions",
			`nanoterm-session-${process.ppid}.json`,
		);
		const legacy = { lastCommand: "ls", stdout: "out", stderr: "" };
		fs.writeFileSync(sessionFilePath, JSON.stringify(legacy), {
			encoding: "utf-8",
		});

		try {
			const loaded = loadSessionContext();
			t.is(loaded, null, "expected null for session without timestamp");
			t.false(fs.existsSync(sessionFilePath), "expected file to be unlinked");
		} finally {
			if (fs.existsSync(sessionFilePath)) {
				fs.unlinkSync(sessionFilePath);
			}
		}
	},
);

test.serial(
	"saveSessionContext › warns rather than throws when the home directory is unwritable",
	(t) => {
		const sessionFilePath = path.join(
			os.homedir(),
			".nanoterm",
			"sessions",
			`nanoterm-session-${process.ppid}.json`,
		);
		const warnings: string[] = [];
		const originalConsoleWarn = console.warn;
		console.warn = (...args: unknown[]) => {
			warnings.push(args.join(" "));
		};

		// Force an unwritable scenario by making the existing session a
		// directory — fs.writeFileSync will then fail with EISDIR.
		try {
			if (fs.existsSync(sessionFilePath)) fs.unlinkSync(sessionFilePath);
			fs.mkdirSync(sessionFilePath, { recursive: true });
			saveSessionContext("ls", "out", "");
			t.true(warnings.length > 0, "expected console.warn to be called");
		} finally {
			console.warn = originalConsoleWarn;
			if (
				fs.existsSync(sessionFilePath) &&
				fs.statSync(sessionFilePath).isDirectory()
			) {
				fs.rmdirSync(sessionFilePath);
			}
		}
	},
);

test.serial(
	"loadSessionContext › fires the cleanup routine on each call (fire-and-forget)",
	async (t) => {
		// Pre-create a session dir with a stale session file (old mtime)
		// to exercise the cleanup pass.
		const sessionDir = path.join(os.homedir(), ".nanoterm", "sessions");
		fs.mkdirSync(sessionDir, { recursive: true, mode: 0o700 });
		const stalePath = path.join(sessionDir, "nanoterm-session-stale-test.json");
		fs.writeFileSync(
			stalePath,
			JSON.stringify({
				lastCommand: "stale",
				stdout: "",
				stderr: "",
				timestamp: Date.now() - 11 * 60 * 1000,
			}),
		);
		// Backdate the file's mtime so the cleanup routine considers it stale.
		const staleTime = new Date(Date.now() - 11 * 60 * 1000);
		fs.utimesSync(stalePath, staleTime, staleTime);

		try {
			t.notThrows(() => loadSessionContext());
			// Give the async cleanup time to run.
			await new Promise((resolve) => setTimeout(resolve, 500));
			t.false(
				fs.existsSync(stalePath),
				"expected stale session to be removed by cleanup",
			);
		} finally {
			if (fs.existsSync(stalePath)) fs.unlinkSync(stalePath);
		}
	},
);

test("appendOutputTail › returns the combined string when under the limit", (t) => {
	t.is(appendOutputTail("hello", " world"), "hello world");
	t.is(appendOutputTail("", "x"), "x");
});

test("appendOutputTail › exactly at the limit returns the combined string", (t) => {
	const chunk = "x".repeat(MAX_OUTPUT_LENGTH);
	t.is(appendOutputTail("", chunk), chunk);
});
