import test from "ava";
import { saveSessionContext, loadSessionContext } from "../src/session.js";
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

	// Cleanup
	const sessionFilePath = path.join(
		os.tmpdir(),
		`nanoterm-session-${process.ppid}.json`,
	);
	if (fs.existsSync(sessionFilePath)) {
		fs.unlinkSync(sessionFilePath);
	}
});
