import test from "ava";
import {
	saveSessionContext,
	loadSessionContext,
	appendOutputTail,
	MAX_OUTPUT_LENGTH,
} from "../src/session.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("save and load session context successfully", (t) => {
	const command = 'echo "test"';
	const stdout = "test\n";
	const stderr = "";

	saveSessionContext(command, stdout, stderr);

	const loaded = loadSessionContext();
	t.truthy(loaded);
	t.is(loaded?.lastCommand, command);
	t.is(loaded?.stdout, stdout);
	t.is(loaded?.stderr, stderr);

	const sessionFilePath = path.join(
		os.tmpdir(),
		`nanoterm-session-${process.ppid}.json`,
	);

	// Assert permissions are 0600
	const stats = fs.statSync(sessionFilePath);
	const mode = stats.mode & 0o777; // get only permission bits
	t.is(mode, 0o600, "Session file should have 0600 permissions");

	// Cleanup
	if (fs.existsSync(sessionFilePath)) {
		fs.unlinkSync(sessionFilePath);
	}
});

test("loadSessionContext ignores and unlinks stale sessions", (t) => {
	const command = 'echo "stale"';
	const sessionFilePath = path.join(
		os.tmpdir(),
		`nanoterm-session-${process.ppid}.json`,
	);

	// Write a fake stale session (11 minutes old)
	const staleData = {
		lastCommand: command,
		stdout: "stale data",
		stderr: "",
		timestamp: Date.now() - 11 * 60 * 1000,
	};
	fs.writeFileSync(sessionFilePath, JSON.stringify(staleData), {
		encoding: "utf-8",
		mode: 0o600,
	});

	const loaded = loadSessionContext();
	t.is(loaded, null, "Should return null for stale sessions");

	t.false(fs.existsSync(sessionFilePath), "Stale session should be unlinked");
});

test("appendOutputTail bounds captured output while retaining the newest data", (t) => {
	let captured = "";
	for (let index = 0; index < 100; index++) {
		captured = appendOutputTail(captured, `${index}:`.padEnd(100, "x"));
	}

	t.is(captured.length, MAX_OUTPUT_LENGTH);
	t.true(captured.endsWith("99:".padEnd(100, "x")));
	t.false(captured.includes("0:".padEnd(100, "x")));
});

test("saveSessionContext enforces owner-only permissions for existing files", (t) => {
	const sessionFilePath = path.join(
		os.tmpdir(),
		`nanoterm-session-${process.ppid}.json`,
	);

	try {
		// Pre-create the file with permissive modes
		fs.writeFileSync(sessionFilePath, "{}", { mode: 0o644 });

		saveSessionContext('echo "test"', "test\n", "");

		const stats = fs.statSync(sessionFilePath);
		const mode = stats.mode & 0o777; // get only permission bits
		t.is(mode, 0o600, "Session file should have 0600 permissions");
	} finally {
		// Cleanup
		if (fs.existsSync(sessionFilePath)) {
			fs.unlinkSync(sessionFilePath);
		}
	}
});
